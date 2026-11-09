import { openDB, type IDBPDatabase } from 'idb'
import type { WorkoutDraft } from '@/lib/workout'

/**
 * Keeps the workout in progress on the device, in its own IndexedDB database
 * so the vault database's version never has to change for it. Nothing here
 * leaves the browser: the draft goes into the vault only when the workout is
 * finished, and the cached files are copies of the vault's own Datasets so
 * the tracker still opens when the gym has no signal.
 */

const DB_NAME = 'caedora-workouts'
const DB_VERSION = 1
const DRAFTS = 'drafts'
const FILES = 'files'

export interface StoredDraft {
  /** The training log the draft will be written to. */
  logPath: string
  draft: WorkoutDraft
  savedAt: number
}

export interface CachedFiles {
  /** Every workout Dataset's text, by path, as last read from the vault. */
  files: Record<string, string>
  savedAt: number
}

let dbPromise: Promise<IDBPDatabase> | null = null

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(DRAFTS)) database.createObjectStore(DRAFTS)
      if (!database.objectStoreNames.contains(FILES)) database.createObjectStore(FILES)
    },
  })
  return dbPromise
}

export async function loadDraft(vaultKey: string): Promise<StoredDraft | null> {
  try {
    return ((await (await db()).get(DRAFTS, vaultKey)) as StoredDraft | undefined) ?? null
  } catch {
    return null
  }
}

export async function saveDraft(vaultKey: string, stored: StoredDraft): Promise<void> {
  await (await db()).put(DRAFTS, stored, vaultKey)
}

export async function clearDraft(vaultKey: string): Promise<void> {
  await (await db()).delete(DRAFTS, vaultKey)
}

export async function loadCachedFiles(vaultKey: string): Promise<CachedFiles | null> {
  try {
    return ((await (await db()).get(FILES, vaultKey)) as CachedFiles | undefined) ?? null
  } catch {
    return null
  }
}

export async function saveCachedFiles(vaultKey: string, files: Record<string, string>): Promise<void> {
  try {
    await (await db()).put(FILES, { files, savedAt: Date.now() } satisfies CachedFiles, vaultKey)
  } catch {
    // The cache only helps offline starts; failing to write it is harmless.
  }
}
