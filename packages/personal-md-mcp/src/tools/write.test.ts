import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createNote, updateNote, renameNote, deleteNote } from './write.js'
import { searchNotes, notesByTag } from './search.js'
import type { FileEntry, VaultProvider } from '../providers/types.js'

class MemoryProvider implements VaultProvider {
  readonly type = 'local' as const
  readonly writesAreCommits = false
  files = new Map<string, string>()

  async readFile(p: string): Promise<string> {
    const v = this.files.get(p)
    if (v === undefined) throw new Error(`ENOENT: ${p}`)
    return v
  }
  async writeFile(p: string, c: string): Promise<void> {
    this.files.set(p, c)
  }
  async listFiles(dir = ''): Promise<FileEntry[]> {
    const out: FileEntry[] = []
    const seenDirs = new Set<string>()
    for (const path of this.files.keys()) {
      if (dir && !path.startsWith(`${dir}/`)) continue
      const rest = dir ? path.slice(dir.length + 1) : path
      const slash = rest.indexOf('/')
      if (slash === -1) {
        out.push({
          path,
          name: path.split('/').pop()!,
          type: 'file',
        })
      } else {
        const dirName = rest.slice(0, slash)
        const dirPath = dir ? `${dir}/${dirName}` : dirName
        if (!seenDirs.has(dirPath)) {
          seenDirs.add(dirPath)
          out.push({ path: dirPath, name: dirName, type: 'dir' })
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
  async deletePath(p: string): Promise<void> {
    this.files.delete(p)
    for (const key of [...this.files.keys()]) {
      if (key.startsWith(`${p}/`)) this.files.delete(key)
    }
  }
  async commit(): Promise<string> {
    return 'mem'
  }
}

describe('create_note', () => {
  it('prepends an H1 when the body lacks one', async () => {
    const p = new MemoryProvider()
    await createNote(p, { path: 'Untitled.md', body: 'some body text' })
    const content = p.files.get('Untitled.md')!
    assert.match(content, /^# Untitled\n\nsome body text/)
  })

  it('leaves an existing H1 untouched', async () => {
    const p = new MemoryProvider()
    await createNote(p, { path: 'Notes.md', body: '# My H1\n\nbody' })
    assert.equal(p.files.get('Notes.md'), '# My H1\n\nbody')
  })

  it('writes normalised tags to frontmatter', async () => {
    const p = new MemoryProvider()
    await createNote(p, {
      path: 'Tagged.md',
      body: '# Tagged',
      tags: ['#Project', 'Active Q2', 'project'],
    })
    const content = p.files.get('Tagged.md')!
    assert.match(content, /tags: \[project, active-q2\]/)
  })

  it('fails if the path already exists', async () => {
    const p = new MemoryProvider()
    p.files.set('Exists.md', 'old')
    await assert.rejects(() => createNote(p, { path: 'Exists.md', body: 'new' }))
  })
})

describe('update_note', () => {
  it('preserves unknown frontmatter keys', async () => {
    const p = new MemoryProvider()
    p.files.set(
      'Note.md',
      '---\ntags: [foo]\ncssclass: callout\naliases: [Old Name]\n---\n# T\n\nbody'
    )
    await updateNote(p, { path: 'Note.md', body: '# T\n\nnew body' })
    const content = p.files.get('Note.md')!
    assert.match(content, /cssclass: callout/)
    assert.match(content, /aliases: \[Old Name\]/)
    assert.match(content, /new body/)
  })

  it('replaces tags by default', async () => {
    const p = new MemoryProvider()
    p.files.set('N.md', '---\ntags: [a, b]\n---\n# N\n\n')
    await updateNote(p, { path: 'N.md', tags: ['c'] })
    assert.match(p.files.get('N.md')!, /tags: \[c\]/)
  })

  it('merges tags when mergeTags=true', async () => {
    const p = new MemoryProvider()
    p.files.set('N.md', '---\ntags: [a, b]\n---\n# N\n\n')
    await updateNote(p, { path: 'N.md', tags: ['c'], mergeTags: true })
    assert.match(p.files.get('N.md')!, /tags: \[a, b, c\]/)
  })
})

describe('rename_note', () => {
  it('moves the file', async () => {
    const p = new MemoryProvider()
    p.files.set('old.md', '# old\n\nbody')
    await renameNote(p, { from: 'old.md', to: 'new.md' })
    assert.equal(p.files.has('old.md'), false)
    assert.equal(p.files.has('new.md'), true)
  })

  it('syncs H1 when asked', async () => {
    const p = new MemoryProvider()
    p.files.set('old.md', '# Old title\n\nbody')
    await renameNote(p, { from: 'old.md', to: 'Brand New.md', syncH1: true })
    assert.match(p.files.get('Brand New.md')!, /^# Brand New/)
  })

  it('rejects non-md destinations', async () => {
    const p = new MemoryProvider()
    p.files.set('a.md', '# a')
    await assert.rejects(() => renameNote(p, { from: 'a.md', to: 'a.txt' }))
  })
})

describe('delete_note', () => {
  it('removes the file', async () => {
    const p = new MemoryProvider()
    p.files.set('a.md', '# a')
    await deleteNote(p, { path: 'a.md' })
    assert.equal(p.files.size, 0)
  })
})

describe('search + notes_by_tag', () => {
  async function seed() {
    const p = new MemoryProvider()
    p.files.set('Projects/Atlas.md', '---\ntags: [project, active]\n---\n# Atlas\n\nAtlas is about payments migration.')
    p.files.set('Daily/2026-04-18.md', '---\ntags: [daily]\n---\n# 2026-04-18\n\nWorked on atlas today.')
    p.files.set('Ideas.md', '# Ideas\n\nRandom thoughts about payments.')
    return p
  }

  it('ranks title matches above body matches', async () => {
    const p = await seed()
    const hits = await searchNotes(p, { query: 'atlas' })
    assert.equal(hits[0].path, 'Projects/Atlas.md')
  })

  it('filters by tag when provided', async () => {
    const p = await seed()
    const hits = await searchNotes(p, { query: 'payments', tag: 'project' })
    assert.equal(hits.length, 1)
    assert.equal(hits[0].path, 'Projects/Atlas.md')
  })

  it('notes_by_tag returns exact matches', async () => {
    const p = await seed()
    const matches = await notesByTag(p, { tag: 'Project' })
    assert.equal(matches.length, 1)
    assert.equal(matches[0].path, 'Projects/Atlas.md')
  })
})
