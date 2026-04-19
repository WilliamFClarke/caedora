import { parseFrontmatter } from './frontmatter'
import type { VaultProvider, FileEntry } from './types'

export const INDEX_PATH = 'index.md'

// Files that document the vault itself — excluded from the index table.
const EXCLUDED_FROM_INDEX = new Set([INDEX_PATH, 'AGENTS.md', '.gitignore'])

function shouldIndex(e: FileEntry): boolean {
  return (
    e.type === 'file' &&
    e.name.endsWith('.md') &&
    !EXCLUDED_FROM_INDEX.has(e.path) &&
    !e.name.startsWith('.')
  )
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

    // Read frontmatter in parallel — fast for local, one API call per file for GitHub.
    const rows = await Promise.all(
      mdFiles.map(async (e) => {
        try {
          const raw = await provider.readFile(e.path)
          const { frontmatter } = parseFrontmatter(raw)
          return { path: e.path, tags: frontmatter.tags }
        } catch {
          return { path: e.path, tags: [] as string[] }
        }
      })
    )

    const content = renderIndex(rows)
    await provider.writeFile(INDEX_PATH, content)
    if (!provider.writesAreCommits) {
      await provider.commit('Update vault index', [INDEX_PATH])
    }
  } catch {
    // Never surface index rebuild errors to the user.
  }
}

function renderIndex(files: Array<{ path: string; tags: string[] }>): string {
  const date = new Date().toISOString().slice(0, 10)
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))

  let md = `---
tags: [index, system]
---
# Vault Index

Auto-maintained list of every note in this vault. Rebuilt whenever notes are
added, removed, or renamed. An AI assistant can read this to find files by
name, folder, or tag without scanning the whole vault.

_Last updated: ${date}_

`

  if (sorted.length === 0) {
    md += '_No notes yet._\n'
    return md
  }

  md += `| Note | Path | Folder | Tags |\n`
  md += `| ---- | ---- | ------ | ---- |\n`

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
