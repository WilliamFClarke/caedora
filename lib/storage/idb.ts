/**
 * IndexedDB-backed persistence for connected vaults.
 *
 * # Where sensitive data lives (GitHub PATs, FileSystemDirectoryHandles)
 *
 * Everything stays inside IndexedDB on the user's device, in this origin. That
 * gives us the properties we want:
 *
 *  - **Never sent with requests.** Unlike cookies, IndexedDB entries are not
 *    attached to outgoing HTTP traffic; the app explicitly reads a PAT and
 *    includes it in an `Authorization` header when it needs to talk to
 *    api.github.com, and nowhere else.
 *  - **Origin-scoped.** Only code running on this origin can read it. Other
 *    tabs, sites, or extensions from different origins cannot.
 *  - **Not accessible to the server.** The app has no server-side component —
 *    there is nothing for a PAT to be uploaded to.
 *
 * Client-side encryption with a key that also lives on the device is security
 * theater: anything that can decrypt can also read the ciphertext. The real
 * guarantees come from the architectural choices above, not from wrapping bytes
 * in AES. If an attacker has JS execution on this origin they already win.
 *
 * Operational hygiene:
 *  - Never log PATs or dump vault entries to the console.
 *  - PATs are never placed in URLs or query strings.
 *  - The Disconnect flow removes the active-vault pointer; Remove from the
 *    home-page list wipes the stored entry entirely.
 */
import { openDB, type IDBPDatabase } from 'idb'
import type { PersistedVaultState } from '../types'
import { DEFAULT_SETTINGS, type AppSettings } from '../settings'
import type { FolderAppearance } from '../folder-appearance'

const DB_NAME = 'caedora'
const DB_VERSION = 4
const LEGACY_STATE_STORE = 'vault-state'
const VAULTS_STORE = 'vaults'
const META_STORE = 'vault-meta'
const PINNED_STORE = 'pinned'
const SETTINGS_STORE = 'app-settings'
const FOLDER_APPEARANCE_PREFIX = 'folderAppearance:'

/** Stable key for a stored vault. Used as the IDB key in the vaults store. */
export function vaultId(state: PersistedVaultState): string {
  if (state.type === 'github') return `github:${state.githubOwner}/${state.githubRepo}`
  if (state.directoryPath) return `local-desktop:${state.directoryPath}`
  return `local:${state.directoryHandle?.name ?? 'unknown'}`
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (!db.objectStoreNames.contains(LEGACY_STATE_STORE)) {
        db.createObjectStore(LEGACY_STATE_STORE)
      }
      if (!db.objectStoreNames.contains(PINNED_STORE)) {
        db.createObjectStore(PINNED_STORE)
      }
      if (!db.objectStoreNames.contains(VAULTS_STORE)) {
        db.createObjectStore(VAULTS_STORE)
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE)
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE)
      }

      // Migrate the single `vault-state/current` entry from v2 into the new
      // per-vault `vaults` store, and record it as the active vault.
      if (oldVersion < 3) {
        const legacy = (await tx.objectStore(LEGACY_STATE_STORE).get('current')) as
          | PersistedVaultState
          | undefined
        if (legacy) {
          const id = vaultId(legacy)
          await tx.objectStore(VAULTS_STORE).put(legacy, id)
          await tx.objectStore(META_STORE).put(id, 'activeVaultId')
          await tx.objectStore(LEGACY_STATE_STORE).delete('current')
        }
      }
    },
  })
}

// ─── Multi-vault API ─────────────────────────────────────────────────────────

/** Upsert a vault entry and mark it as active. Updates lastOpenedAt. */
export async function upsertVault(state: PersistedVaultState): Promise<string> {
  const db = await getDB()
  const id = vaultId(state)
  const stamped: PersistedVaultState = { ...state, lastOpenedAt: Date.now() }
  await db.put(VAULTS_STORE, stamped, id)
  await db.put(META_STORE, id, 'activeVaultId')
  return id
}

/** List every stored vault, most recently opened first. */
export async function listVaults(): Promise<Array<{ id: string; state: PersistedVaultState }>> {
  try {
    const db = await getDB()
    const keys = (await db.getAllKeys(VAULTS_STORE)) as string[]
    const values = (await db.getAll(VAULTS_STORE)) as PersistedVaultState[]
    return keys
      .map((id, i) => ({ id, state: values[i] }))
      .sort((a, b) => (b.state.lastOpenedAt ?? 0) - (a.state.lastOpenedAt ?? 0))
  } catch {
    return []
  }
}

export async function getVault(id: string): Promise<PersistedVaultState | null> {
  try {
    const db = await getDB()
    return ((await db.get(VAULTS_STORE, id)) as PersistedVaultState | undefined) ?? null
  } catch {
    return null
  }
}

export async function removeVault(id: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete(VAULTS_STORE, id)
    const activeId = (await db.get(META_STORE, 'activeVaultId')) as string | undefined
    if (activeId === id) await db.delete(META_STORE, 'activeVaultId')
  } catch {
    // ignore
  }
}

export async function getActiveVaultId(): Promise<string | null> {
  try {
    const db = await getDB()
    return ((await db.get(META_STORE, 'activeVaultId')) as string | undefined) ?? null
  } catch {
    return null
  }
}

export async function setActiveVaultId(id: string | null): Promise<void> {
  try {
    const db = await getDB()
    if (id === null) await db.delete(META_STORE, 'activeVaultId')
    else await db.put(META_STORE, id, 'activeVaultId')
  } catch {
    // ignore
  }
}

/** Load the active vault (or the most recent if none flagged). */
export async function loadActiveVault(): Promise<PersistedVaultState | null> {
  const activeId = await getActiveVaultId()
  if (activeId) {
    const state = await getVault(activeId)
    if (state) return state
  }
  const all = await listVaults()
  return all[0]?.state ?? null
}

// ─── Pinned notes ───────────────────────────────────────────────────────────

export async function savePinned(vaultKey: string, paths: string[]): Promise<void> {
  try {
    const db = await getDB()
    await db.put(PINNED_STORE, paths, vaultKey)
  } catch {
    // ignore
  }
}

export async function loadPinned(vaultKey: string): Promise<string[]> {
  try {
    const db = await getDB()
    const scoped = (await db.get(PINNED_STORE, vaultKey)) as string[] | undefined
    if (scoped) return scoped

    // One-time best-effort migration for users who had global pins before
    // vault-scoped storage existed. The first active vault keeps the old pins.
    const legacy = (await db.get(PINNED_STORE, 'current')) as string[] | undefined
    if (!legacy) return []
    await db.put(PINNED_STORE, legacy, vaultKey)
    await db.delete(PINNED_STORE, 'current')
    return legacy
  } catch {
    return []
  }
}

// Folder appearance metadata. This is local UI preference data, scoped to the
// active vault and stored in IndexedDB so user markdown stays untouched.

export async function loadFolderAppearances(
  vaultKey: string
): Promise<Record<string, FolderAppearance>> {
  try {
    const db = await getDB()
    return (
      ((await db.get(META_STORE, `${FOLDER_APPEARANCE_PREFIX}${vaultKey}`)) as
        | Record<string, FolderAppearance>
        | undefined) ?? {}
    )
  } catch {
    return {}
  }
}

export async function saveFolderAppearances(
  vaultKey: string,
  appearances: Record<string, FolderAppearance>
): Promise<void> {
  try {
    const db = await getDB()
    await db.put(META_STORE, appearances, `${FOLDER_APPEARANCE_PREFIX}${vaultKey}`)
  } catch {
    // ignore
  }
}

// ─── App settings ────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<AppSettings> {
  try {
    const db = await getDB()
    const stored = await db.get(SETTINGS_STORE, 'current')
    return mergeSettings(stored as Partial<AppSettings> | undefined)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const db = await getDB()
    await db.put(SETTINGS_STORE, settings, 'current')
  } catch {
    // ignore
  }
}

// ─── Back-compat wrappers (for call sites not yet migrated) ──────────────────

/** @deprecated use {@link upsertVault}. */
export async function saveVaultState(state: PersistedVaultState): Promise<void> {
  await upsertVault(state)
}

function mergeSettings(stored?: Partial<AppSettings>): AppSettings {
  if (!stored) return DEFAULT_SETTINGS
  const storedAi = stored.ai
  const toolPermissionLevelConfigured =
    storedAi?.toolPermissionLevelConfigured === true
  const shouldUpgradeOldAiPermissionDefault =
    !toolPermissionLevelConfigured &&
    storedAi?.toolPermissionLevel === 'require-approval' &&
    storedAi.autoApproveSafeOperations === false
  const ai = {
    ...DEFAULT_SETTINGS.ai,
    ...storedAi,
    toolPermissionLevel:
      shouldUpgradeOldAiPermissionDefault
        ? DEFAULT_SETTINGS.ai.toolPermissionLevel
        : (storedAi?.toolPermissionLevel ??
            (storedAi?.autoApproveSafeOperations
              ? 'allow-all'
              : DEFAULT_SETTINGS.ai.toolPermissionLevel)),
    toolPermissionLevelConfigured,
    sidebar: {
      ...DEFAULT_SETTINGS.ai.sidebar,
      ...storedAi?.sidebar,
    },
    bundledModel: {
      ...DEFAULT_SETTINGS.ai.bundledModel,
      ...storedAi?.bundledModel,
    },
    cloud: {
      ...DEFAULT_SETTINGS.ai.cloud,
      ...storedAi?.cloud,
    },
  }
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    localLlm: {
      ...DEFAULT_SETTINGS.localLlm,
      ...stored.localLlm,
    },
    ai,
  }
}

/** @deprecated use {@link loadActiveVault}. */
export async function loadVaultState(): Promise<PersistedVaultState | null> {
  return loadActiveVault()
}

/** @deprecated use {@link setActiveVaultId}(null). */
export async function clearVaultState(): Promise<void> {
  await setActiveVaultId(null)
}
