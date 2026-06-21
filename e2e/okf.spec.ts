import { expect, test } from '@playwright/test'
import {
  PERSONAL_CONCEPT_PATH,
  WELCOME_PATH,
  WORK_CONCEPT_PATH,
  bundleSeedFiles,
  seedLocalBundle,
} from '@/lib/vault-create'
import { parseFrontmatter } from '@/lib/frontmatter'
import { CURATED_TEMPLATES, fetchTemplateFiles } from '@/lib/vault-templates'
import { assertValidOkfDocument, extractLinks, validateDocument } from '@/lib/okf'
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

test('new vault presets seed conformant starter concepts and generated indexes', async () => {
  const expectedPaths = {
    default: [WELCOME_PATH, PERSONAL_CONCEPT_PATH],
    personal: [WELCOME_PATH, PERSONAL_CONCEPT_PATH],
    work: [WELCOME_PATH, WORK_CONCEPT_PATH],
    blank: [WELCOME_PATH],
  } as const

  for (const template of ['default', 'personal', 'work', 'blank'] as const) {
    const files = bundleSeedFiles(template)
    expect(files.map(([path]) => path)).toEqual(expectedPaths[template])
    for (const [path, content] of files) {
      expect(validateDocument(path, content)).toEqual([])
    }

    const welcome = files.find(([path]) => path === WELCOME_PATH)?.[1] ?? ''
    const starterPath = expectedPaths[template].find((path) => path !== WELCOME_PATH)
    if (starterPath) {
      const starter = files.find(([path]) => path === starterPath)?.[1] ?? ''
      expect(extractLinks(parseFrontmatter(welcome).body, WELCOME_PATH)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ targetPath: starterPath }),
        ])
      )
      expect(extractLinks(parseFrontmatter(starter).body, starterPath)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ targetPath: WELCOME_PATH }),
        ])
      )
    } else {
      expect(
        extractLinks(parseFrontmatter(welcome).body, WELCOME_PATH)
          .some((link) => Boolean(link.targetPath))
      ).toBe(false)
    }
  }

  const provider = new MemoryProvider()
  await seedLocalBundle(provider)
  expect([...provider.files.keys()].sort()).toEqual([
    'index.md',
    PERSONAL_CONCEPT_PATH,
    'personal/index.md',
    WELCOME_PATH,
  ])

  const rootIndex = provider.files.get('index.md') ?? ''
  const folderIndex = provider.files.get('personal/index.md') ?? ''
  expect(validateDocument('index.md', rootIndex)).toEqual([])
  expect(validateDocument('example/index.md', folderIndex)).toEqual([])
  expect(rootIndex).toMatch(/^# Index$/m)
  expect(rootIndex).toMatch(/^### Directories$/m)
  expect(rootIndex).toMatch(/^### Concepts$/m)
  expect(folderIndex).toMatch(/^# Index$/m)
  expect(folderIndex).toMatch(/^### Concepts$/m)
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
      message: 'Only the vault-root index.md may contain frontmatter.',
    }),
  ])

  expect(
    validateDocument(
      'index.md',
      '---\nokf_version: "0.1"\n---\n\n# Index\n\n* [Welcome](welcome.md)\n'
    )
  ).toEqual([])
})

test('curated templates expand into linked OKF concepts', async () => {
  for (const template of CURATED_TEMPLATES) {
    const files = await fetchTemplateFiles(template)
    const paths = new Set(files.map((file) => file.path))
    const conceptFiles = files.filter((file) => file.path.endsWith('.md'))

    expect(conceptFiles.length).toBeGreaterThan(1)

    for (const file of conceptFiles) {
      expect(validateDocument(file.path, file.content)).toEqual([])
      const parsed = parseFrontmatter(file.content)
      expect(parsed.frontmatter.type).not.toEqual('')
      expect(parsed.frontmatter.title).not.toEqual('')
      expect(parsed.frontmatter.description).not.toEqual('')
      expect(parsed.frontmatter.resource).toContain(`https://caedora.app/templates/${template.id}#`)
      expect(parsed.frontmatter.tags).toEqual(expect.arrayContaining(template.tags))

      const internalLinks = extractLinks(parsed.body, file.path).filter((link) => !link.external)
      expect(internalLinks.length).toBeGreaterThan(0)
      for (const link of internalLinks) {
        expect(paths.has(link.targetPath ?? '')).toBe(true)
      }
    }
  }
})
