import { openDB, type IDBPDatabase } from 'idb'
import type { PersistedVaultState } from '../types'

const DB_NAME = 'personal-md'
const DB_VERSION = 2
const STORE = 'vault-state'
const PINNED_STORE = 'pinned'

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
      if (!db.objectStoreNames.contains(PINNED_STORE)) {
        db.createObjectStore(PINNED_STORE)
      }
    },
  })
}

export async function savePinned(paths: string[]): Promise<void> {
  try {
    const db = await getDB()
    await db.put(PINNED_STORE, paths, 'current')
  } catch {
    // ignore
  }
}

export async function loadPinned(): Promise<string[]> {
  try {
    const db = await getDB()
    return ((await db.get(PINNED_STORE, 'current')) as string[] | undefined) ?? []
  } catch {
    return []
  }
}

export async function saveVaultState(state: PersistedVaultState): Promise<void> {
  const db = await getDB()
  await db.put(STORE, state, 'current')
}

export async function loadVaultState(): Promise<PersistedVaultState | null> {
  try {
    const db = await getDB()
    return (await db.get(STORE, 'current')) ?? null
  } catch {
    return null
  }
}

export async function clearVaultState(): Promise<void> {
  try {
    const db = await getDB()
    await db.delete(STORE, 'current')
  } catch {
    // ignore — if IDB isn't available we can't clear it anyway
  }
}
