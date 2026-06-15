import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createConcept, deleteConcept, renameConcept, updateConcept } from './write.js'
import { conceptGraph, conceptsByTag, searchConcepts } from './search.js'
import { ingestSource, lintBundle } from './operations.js'
import { parseFrontmatter } from '../lib/frontmatter.js'
import type { FileEntry, VaultProvider } from '../providers/types.js'

class MemoryProvider implements VaultProvider {
  readonly type = 'local' as const
  readonly writesAreCommits = false
  files = new Map<string, string>()

  async readFile(path: string): Promise<string> {
    const value = this.files.get(path)
    if (value === undefined) throw new Error(`ENOENT: ${path}`)
    return value
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content)
  }

  async listFiles(dir = ''): Promise<FileEntry[]> {
    const out: FileEntry[] = []
    const seenDirs = new Set<string>()
    for (const path of this.files.keys()) {
      if (dir && !path.startsWith(`${dir}/`)) continue
      const rest = dir ? path.slice(dir.length + 1) : path
      const slash = rest.indexOf('/')
      if (slash === -1) {
        out.push({ path, name: path.split('/').pop()!, type: 'file' })
      } else {
        const name = rest.slice(0, slash)
        const directoryPath = dir ? `${dir}/${name}` : name
        if (!seenDirs.has(directoryPath)) {
          seenDirs.add(directoryPath)
          out.push({ path: directoryPath, name, type: 'dir' })
        }
      }
    }
    return out
  }

  async renamePath(from: string, to: string): Promise<void> {
    const content = this.files.get(from)
    if (content === undefined) throw new Error(`ENOENT: ${from}`)
    this.files.delete(from)
    this.files.set(to, content)
  }

  async deletePath(path: string): Promise<void> {
    this.files.delete(path)
    for (const key of [...this.files.keys()]) {
      if (key.startsWith(`${path}/`)) this.files.delete(key)
    }
  }

  async commit(): Promise<string> {
    return 'memory'
  }
}

describe('OKF concept writes', () => {
  it('creates a conformant concept and hierarchical index', async () => {
    const provider = new MemoryProvider()
    await createConcept(provider, {
      path: 'tables/orders.md',
      type: 'BigQuery Table',
      title: 'Orders',
      description: 'One row per order.',
      resource: 'https://example.com/orders',
      tags: ['Sales', 'Revenue'],
      body: '# Schema\n\n| Column | Type |\n| --- | --- |\n',
    })

    const parsed = parseFrontmatter(provider.files.get('tables/orders.md')!)
    assert.equal(parsed.frontmatter.type, 'BigQuery Table')
    assert.equal(parsed.frontmatter.title, 'Orders')
    assert.deepEqual(parsed.frontmatter.tags, ['sales', 'revenue'])
    assert.match(provider.files.get('tables/index.md')!, /\[Orders\]\(orders\.md\)/)
    assert.match(provider.files.get('index.md')!, /okf_version: "0\.1"/)
    assert.match(provider.files.get('log.md')!, /\*\*Creation\*\*/)
  })

  it('rejects empty concept types before writing', async () => {
    const provider = new MemoryProvider()
    await assert.rejects(
      () =>
        createConcept(provider, {
          path: 'invalid.md',
          type: '   ',
          body: 'Body.',
        }),
      /Concept type cannot be empty/
    )
    assert.equal(provider.files.has('invalid.md'), false)
  })

  it('preserves nested producer-defined YAML on update', async () => {
    const provider = new MemoryProvider()
    provider.files.set(
      'metric.md',
      '---\ntype: Metric\ntitle: Revenue\nowner:\n  team: finance\n---\n\n# Definition\n\nOld.'
    )
    await updateConcept(provider, {
      path: 'metric.md',
      metadata: { description: 'Recognized revenue.' },
      body: '# Definition\n\nNew.',
    })
    const parsed = parseFrontmatter(provider.files.get('metric.md')!)
    assert.deepEqual(parsed.frontmatter.extra.owner, { team: 'finance' })
    assert.equal(parsed.frontmatter.description, 'Recognized revenue.')
    assert.match(parsed.body, /New\./)
  })

  it('moves and deletes concepts while protecting reserved files', async () => {
    const provider = new MemoryProvider()
    await createConcept(provider, {
      path: 'old.md',
      type: 'Reference',
      title: 'Old',
      body: 'Body.',
    })
    await renameConcept(provider, { from: 'old.md', to: 'archive/new.md' })
    assert.equal(provider.files.has('old.md'), false)
    assert.equal(provider.files.has('archive/new.md'), true)
    await deleteConcept(provider, { path: 'archive/new.md' })
    assert.equal(provider.files.has('archive/new.md'), false)
    await assert.rejects(() => deleteConcept(provider, { path: 'index.md' }))
  })
})

describe('OKF search and graph', () => {
  async function seed() {
    const provider = new MemoryProvider()
    await createConcept(provider, {
      path: 'tables/customers.md',
      type: 'Table',
      title: 'Customers',
      description: 'Customer master records.',
      tags: ['sales'],
      body: '# Schema\n\nCustomer identifiers.',
    })
    await createConcept(provider, {
      path: 'tables/orders.md',
      type: 'Table',
      title: 'Orders',
      description: 'Completed orders.',
      tags: ['sales', 'revenue'],
      body: 'Joined to [customers](/tables/customers.md).',
    })
    return provider
  }

  it('searches structured metadata and filters by type and tag', async () => {
    const provider = await seed()
    const hits = await searchConcepts(provider, {
      query: 'completed',
      type: 'Table',
      tag: 'Revenue',
    })
    assert.equal(hits.length, 1)
    assert.equal(hits[0].path, 'tables/orders.md')
    const tagged = await conceptsByTag(provider, { tag: 'sales' })
    assert.equal(tagged.length, 2)
  })

  it('returns outgoing links and backlinks', async () => {
    const provider = await seed()
    const graph = await conceptGraph(provider, { path: 'tables/customers.md' })
    assert.equal(graph[0].backlinks[0].path, 'tables/orders.md')
  })

  it('reports conformance and tolerated broken links', async () => {
    const provider = await seed()
    provider.files.set(
      'broken.md',
      '---\ntype: Reference\ntitle: Broken\n---\n\nSee [future](/future.md).'
    )
    const report = await lintBundle(provider, { recordLint: false })
    assert.equal(report.conformant, true)
    assert.equal(report.brokenLinks, 1)
  })

  it('does not mutate the bundle during a default lint pass', async () => {
    const provider = await seed()
    const before = provider.files.get('log.md')
    await lintBundle(provider, {})
    assert.equal(provider.files.get('log.md'), before)
  })
})

describe('source ingestion', () => {
  it('creates a provenance-bearing source concept and logs ingestion', async () => {
    const provider = new MemoryProvider()
    await ingestSource(provider, {
      path: 'sources/okf.md',
      title: 'OKF specification',
      description: 'The Open Knowledge Format v0.1 specification.',
      resource: 'https://example.com/okf',
      body: '# Claims\n\nOKF uses Markdown and YAML.',
    })
    const parsed = parseFrontmatter(provider.files.get('sources/okf.md')!)
    assert.equal(parsed.frontmatter.type, 'Source')
    assert.equal(parsed.frontmatter.resource, 'https://example.com/okf')
    assert.match(provider.files.get('log.md')!, /\*\*Ingest\*\*/)
  })
})
