import { OKF_VERSION, parseFrontmatter } from './frontmatter'
import {
  INDEX_FILENAME,
  LOG_FILENAME,
  deriveTitleFromPath,
  isConceptPath,
} from './okf'
import type { FileEntry, VaultProvider } from './types'

export const INDEX_PATH = INDEX_FILENAME
export const LOG_PATH = LOG_FILENAME

export function isLockedPath(path: string): boolean {
  const name = path.split('/').pop()?.toLowerCase()
  return name === INDEX_FILENAME || name === LOG_FILENAME
}

interface ConceptSummary {
  path: string
  title: string
  description: string
  type: string
  tags: string[]
}

/**
 * Rebuild every hierarchical index.md required for progressive disclosure.
 * Errors are swallowed so indexing never blocks editing.
 */
export async function rebuildBundleIndexes(
  provider: VaultProvider,
  entries: FileEntry[]
): Promise<void> {
  try {
    const conceptEntries = entries.filter(
      (entry) => entry.type === 'file' && isConceptPath(entry.path)
    )
    const summaries = await Promise.all(
      conceptEntries.map(async (entry): Promise<ConceptSummary> => {
        const raw = await provider.readFile(entry.path)
        const parsed = parseFrontmatter(raw)
        return {
          path: entry.path,
          title: parsed.frontmatter.title || deriveTitleFromPath(entry.path),
          description: parsed.frontmatter.description,
          type: parsed.frontmatter.type || 'Unknown',
          tags: parsed.frontmatter.tags,
        }
      })
    )

    const directories = collectDirectories(entries, summaries)
    const changed: string[] = []

    for (const directory of directories) {
      const path = directory ? `${directory}/${INDEX_FILENAME}` : INDEX_FILENAME
      const content = renderDirectoryIndex(directory, directories, summaries)
      const current = await provider.readFile(path).catch(() => null)
      if (current === content) continue
      await provider.writeFile(path, content)
      changed.push(path)
    }

    if (changed.length > 0 && !provider.writesAreCommits) {
      await provider.commit(
        changed.length === 1 ? `Update ${changed[0]}` : 'Update bundle indexes',
        changed
      )
    }
  } catch {
    // A malformed or temporarily unavailable concept must not block the editor.
  }
}

/** @deprecated Use rebuildBundleIndexes. */
export const rebuildVaultIndex = rebuildBundleIndexes

function collectDirectories(
  entries: FileEntry[],
  concepts: ConceptSummary[]
): string[] {
  const directories = new Set<string>([''])
  for (const entry of entries) {
    if (entry.type === 'dir') addDirectoryAndParents(directories, entry.path)
  }
  for (const concept of concepts) {
    const parent = dirname(concept.path)
    addDirectoryAndParents(directories, parent)
  }
  return [...directories].sort((a, b) => {
    const depth = a.split('/').filter(Boolean).length - b.split('/').filter(Boolean).length
    return depth || a.localeCompare(b)
  })
}

function addDirectoryAndParents(target: Set<string>, path: string): void {
  target.add('')
  if (!path) return
  const parts = path.split('/')
  for (let index = 1; index <= parts.length; index++) {
    target.add(parts.slice(0, index).join('/'))
  }
}

function renderDirectoryIndex(
  directory: string,
  directories: string[],
  concepts: ConceptSummary[]
): string {
  const title = 'Index'
  const childDirectories = directories
    .filter((candidate) => candidate && dirname(candidate) === directory)
    .sort()
  const childConcepts = concepts
    .filter((concept) => dirname(concept.path) === directory)
    .sort((a, b) => a.title.localeCompare(b.title))

  const lines: string[] = []
  if (!directory) {
    lines.push('---', `okf_version: "${OKF_VERSION}"`, '---', '')
  }
  lines.push(`# ${title}`, '')
  if (!directory) {
    lines.push(
      'Progressive-disclosure map of this Open Knowledge Format bundle.',
      'Open the most relevant concept rather than loading the entire bundle.',
      ''
    )
  }

  if (childDirectories.length > 0) {
    lines.push('### Directories', '')
    for (const child of childDirectories) {
      const name = child.split('/').pop() ?? child
      lines.push(`* [${deriveTitleFromPath(name)}](${encodeURI(`${name}/${INDEX_FILENAME}`)}) - Browse this section.`)
    }
    lines.push('')
  }

  if (childConcepts.length > 0) {
    lines.push('### Concepts', '')
    for (const concept of childConcepts) {
      const relative = concept.path.slice(directory ? directory.length + 1 : 0)
      const description = concept.description || `${concept.type} concept.`
      const tags = concept.tags.length > 0 ? ` Tags: ${concept.tags.join(', ')}.` : ''
      lines.push(`* [${concept.title}](${encodeURI(relative)}) - ${description}${tags}`)
    }
    lines.push('')
  }

  if (childDirectories.length === 0 && childConcepts.length === 0) {
    lines.push('_No concepts in this scope yet._', '')
  }

  return `${lines.join('\n').trimEnd()}\n`
}

function dirname(path: string): string {
  const parts = path.split('/')
  parts.pop()
  return parts.join('/')
}
