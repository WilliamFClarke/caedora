import { openDB, type IDBPDatabase } from 'idb'
import type { PersistedVaultState } from '../types'

const DB_NAME = 'personal-md'
const DB_VERSION = 1
const STORE = 'vault-state'

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    },
  })
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
