import { INDEX_FILENAME, LOG_FILENAME, isReservedPath, rebuildIndexes } from './okf'
import type { FileEntry, VaultProvider } from './types'

export const INDEX_PATH = INDEX_FILENAME
export const LOG_PATH = LOG_FILENAME
export const isLockedPath = isReservedPath

/**
 * Rebuild every hierarchical index.md required for progressive disclosure.
 * Errors are swallowed so indexing never blocks editing.
 */
export async function rebuildBundleIndexes(
  provider: VaultProvider,
  entries: FileEntry[]
): Promise<void> {
  try {
    await rebuildIndexes(provider, entries)
  } catch {
    // A malformed or temporarily unavailable concept must not block the editor.
  }
}
