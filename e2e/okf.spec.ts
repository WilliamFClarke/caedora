import { expect, test } from '@playwright/test'
import { bundleSeedFiles, seedLocalBundle } from '@/lib/vault-create'
import { assertValidOkfDocument, validateDocument } from '@/lib/okf'
import type { CommitEntry, DiffResult, FileEntry, VaultProvider } from '@/lib/types'

class MemoryProvider implements VaultProvider {
  readonly type = 'local' as const
  readonly writesAreCommits = true
  readonly files = new Map<string, string>()

  isReady() {
    return true
  }

  async readFile(path: string) {
    const content = this.files.get(path)
    if (content === undefined) throw new Error(`Missing ${path}`)
    return content
  }

  async writeFile(path: string, content: string) {
    assertValidOkfDocument(path, content)
    this.files.set(path, content)
  }

  async deleteFile(path: string) {
    this.files.delete(path)
  }

  async listFiles(): Promise<FileEntry[]> {
    return [...this.files.keys()].map((path) => ({
      path,
      name: path,
      type: 'file' as const,
    }))
  }

  async renamePath(from: string, to: string) {
    const content = await this.readFile(from)
    this.files.delete(from)
    this.files.set(to, content)
  }

  async deletePath(path: string) {
    this.files.delete(path)
  }

  async commit() {
    return 'memory'
  }

  async log(): Promise<CommitEntry[]> {
    return []
  }

  async diff(): Promise<DiffResult> {
    return { hunks: [], oldContent: '', newContent: '' }
  }

  async currentBranch() {
    return 'main'
  }
}

test('new bundles use one minimal conformant welcome concept', async () => {
  for (const template of ['default', 'personal', 'work'] as const) {
    const files = bundleSeedFiles(template)
    expect(files.map(([path]) => path)).toEqual(['welcome.md'])
    expect(validateDocument(files[0][0], files[0][1])).toEqual([])
  }

  const provider = new MemoryProvider()
  await seedLocalBundle(provider)
  expect([...provider.files.keys()].sort()).toEqual(['index.md', 'welcome.md'])
  expect(validateDocument('index.md', provider.files.get('index.md') ?? '')).toEqual([])
})

test('OKF validation blocks invalid concept writes with a useful reason', () => {
  const invalid = '# Missing frontmatter'
  expect(validateDocument('broken.md', invalid)).toEqual([
    expect.objectContaining({
      severity: 'error',
      code: 'missing-frontmatter',
    }),
  ])
  expect(() => assertValidOkfDocument('broken.md', invalid)).toThrow(
    'Concept documents must start with YAML frontmatter.'
  )
})

test('OKF validation enforces reserved index frontmatter rules', () => {
  expect(
    validateDocument(
      'projects/index.md',
      '---\ntags: [projects]\n---\n\n# Projects\n\n* [Example](example.md)\n'
    )
  ).toEqual([
    expect.objectContaining({
      severity: 'error',
      code: 'invalid-index',
      message: 'Only the bundle-root index.md may contain frontmatter.',
    }),
  ])

  expect(
    validateDocument(
      'index.md',
      '---\nokf_version: "0.1"\n---\n\n# Knowledge Bundle\n\n* [Welcome](welcome.md)\n'
    )
  ).toEqual([])
})
