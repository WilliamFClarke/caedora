import { LOG_FILENAME } from './okf'
import type { VaultProvider } from './types'

export type BundleLogAction =
  | 'Creation'
  | 'Update'
  | 'Move'
  | 'Deletion'
  | 'Ingest'
  | 'Query'
  | 'Lint'
  | 'Initialization'

export async function appendBundleLog(
  provider: VaultProvider,
  action: BundleLogAction,
  message: string,
  scope = ''
): Promise<void> {
  const path = scope ? `${scope}/${LOG_FILENAME}` : LOG_FILENAME
  const date = new Date().toISOString().slice(0, 10)
  const entry = `* **${action}**: ${message}`
  const current = await provider
    .readFile(path)
    .catch(() => '# Vault Update Log\n')
  const next = insertNewestEntry(current, date, entry)
  if (next === current) return
  await provider.writeFile(path, next)
  if (!provider.writesAreCommits) {
    await provider.commit(`Update ${path}`, [path])
  }
}

export function insertNewestEntry(log: string, date: string, entry: string): string {
  const normalized = log.trimEnd()
  const heading = `## ${date}`
  if (normalized.includes(`${heading}\n`)) {
    const marker = `${heading}\n`
    const index = normalized.indexOf(marker) + marker.length
    return `${normalized.slice(0, index)}${entry}\n${normalized.slice(index).replace(/^\n*/, '')}\n`
  }

  const titleMatch = normalized.match(/^#\s+.+$/m)
  if (!titleMatch || titleMatch.index === undefined) {
    return `# Vault Update Log\n\n${heading}\n${entry}\n`
  }
  const titleEnd = titleMatch.index + titleMatch[0].length
  return `${normalized.slice(0, titleEnd)}\n\n${heading}\n${entry}\n${normalized.slice(titleEnd).replace(/^\s*/, '')}\n`
}
