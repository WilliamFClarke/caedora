import { parseFrontmatter } from './frontmatter'
import type { VaultProvider, FileEntry } from './types'

export const INDEX_PATH = 'index.md'
export const AGENTS_PATH = 'AGENTS.md'

// Paths that are locked — they can be edited but not renamed, moved, or deleted.
export const LOCKED_PATHS: ReadonlySet<string> = new Set([INDEX_PATH, AGENTS_PATH])

// Files that document the vault itself — excluded from the index listing.
const EXCLUDED_FROM_INDEX = new Set([INDEX_PATH, AGENTS_PATH, '.gitignore'])

function shouldIndex(e: FileEntry): boolean {
  return (
    e.type === 'file' &&
    e.name.endsWith('.md') &&
    !EXCLUDED_FROM_INDEX.has(e.path) &&
    !e.name.startsWith('.')
  )
}

interface IndexRow {
  path: string
  tags: string[]
}

interface TreeNode {
  name: string
  path: string
  children: Map<string, TreeNode>
  files: IndexRow[]
}

/**
 * Reads every indexable note's frontmatter and rewrites index.md.
 * Fire-and-forget safe — errors are swallowed so a bad read never blocks the UI.
 */
export async function rebuildVaultIndex(
  provider: VaultProvider,
  entries: FileEntry[]
): Promise<void> {
  try {
    const mdFiles = entries.filter(shouldIndex)

    const rows = await Promise.all(
      mdFiles.map(async (e): Promise<IndexRow> => {
        try {
          const raw = await provider.readFile(e.path)
          const { frontmatter } = parseFrontmatter(raw)
          return { path: e.path, tags: frontmatter.tags }
        } catch {
          return { path: e.path, tags: [] }
        }
      })
    )

    const folderPaths = entries
      .filter((e) => e.type === 'dir')
      .map((e) => e.path)

    const content = renderIndex(rows, folderPaths)
    await provider.writeFile(INDEX_PATH, content)
    if (!provider.writesAreCommits) {
      await provider.commit('Update vault index', [INDEX_PATH])
    }
  } catch {
    // Never surface index rebuild errors to the user.
  }
}

function buildTree(rows: IndexRow[], folderPaths: string[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map(), files: [] }
  const ensureDir = (path: string): TreeNode => {
    if (!path) return root
    const parts = path.split('/')
    let cur = root
    let acc = ''
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part
      let next = cur.children.get(part)
      if (!next) {
        next = { name: part, path: acc, children: new Map(), files: [] }
        cur.children.set(part, next)
      }
      cur = next
    }
    return cur
  }

  for (const folder of folderPaths) ensureDir(folder)

  for (const row of rows) {
    const parts = row.path.split('/')
    const parentPath = parts.slice(0, -1).join('/')
    const dir = ensureDir(parentPath)
    dir.files.push(row)
  }
  return root
}

function renderTree(node: TreeNode, depth: number): string {
  const lines: string[] = []
  const indent = '  '.repeat(depth)

  const dirs = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name))
  const files = [...node.files].sort((a, b) => a.path.localeCompare(b.path))

  for (const dir of dirs) {
    lines.push(`${indent}- **${dir.name}/**`)
    const sub = renderTree(dir, depth + 1)
    if (sub) lines.push(sub)
  }
  for (const file of files) {
    const filename = file.path.split('/').pop() ?? file.path
    const display = filename.replace(/\.md$/, '')
    const tagSuffix = file.tags.length > 0 ? ` _[${file.tags.join(', ')}]_` : ''
    lines.push(`${indent}- [${display}](${encodeURI(file.path)})${tagSuffix}`)
  }
  return lines.join('\n')
}

function renderIndex(rows: IndexRow[], folderPaths: string[]): string {
  const date = new Date().toISOString().slice(0, 10)

  let md = `---
tags: [index, system]
---
# Vault Index

Auto-maintained map of every folder and note in this vault. Rebuilt whenever
notes are added, renamed, moved, or removed. An AI assistant should read this
file **first** to discover what exists and where, then open specific notes
for detail.

_Last updated: ${date}_

## Folder structure

`

  if (rows.length === 0 && folderPaths.length === 0) {
    md += '_No notes yet._\n\n'
  } else {
    const tree = buildTree(rows, folderPaths)
    const rendered = renderTree(tree, 0)
    md += rendered + '\n\n'
  }

  md += `## All notes

`

  if (rows.length === 0) {
    md += '_No notes yet._\n'
    return md
  }

  md += `| Note | Path | Folder | Tags |\n`
  md += `| ---- | ---- | ------ | ---- |\n`

  const sorted = [...rows].sort((a, b) => a.path.localeCompare(b.path))
  for (const { path, tags } of sorted) {
    const parts = path.split('/')
    const filename = parts[parts.length - 1]
    const name = filename.replace(/\.md$/, '')
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '/'
    const tagStr = tags.length > 0 ? tags.join(', ') : '—'
    md += `| ${name} | \`${path}\` | ${folder} | ${tagStr} |\n`
  }

  return md
}
