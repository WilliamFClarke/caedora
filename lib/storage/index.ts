import {
  loadActiveVault,
  upsertVault,
  getVault,
} from './idb'
import { LocalGitProvider } from './local-provider'
import { ElectronLocalProvider } from './electron-provider'
import { GitHubProvider } from './github-provider'
import { getDesktopApi } from '../desktop'
import type { VaultProvider, FileEntry, PersistedVaultState } from '../types'

export {
  upsertVault,
  listVaults,
  getVault,
  removeVault,
  getActiveVaultId,
  setActiveVaultId,
  loadActiveVault,
  vaultId,
  // Back-compat
  saveVaultState,
  loadVaultState,
  clearVaultState,
} from './idb'
export { LocalGitProvider } from './local-provider'
export { ElectronLocalProvider } from './electron-provider'
export { GitHubProvider } from './github-provider'

/**
 * Attempts to restore a VaultProvider from the previous session stored in
 * IndexedDB.  Returns:
 *   - provider: VaultProvider if ready
 *   - needsPermission: true if a local handle exists but permission was revoked
 *   - folderName: the handle name for the re-grant UI
 */
export async function createProviderFromPersistedState(): Promise<{
  provider: VaultProvider | null
  needsPermission: boolean
  folderName?: string
}> {
  const state = await loadActiveVault()
  if (!state) return { provider: null, needsPermission: false }

  if (state.type === 'local' && state.directoryHandle) {
    const handle = state.directoryHandle
    const permission = await handle.queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') {
      const provider = new LocalGitProvider(handle)
      await provider.init()
      return { provider, needsPermission: false }
    }
    // 'prompt' or 'denied' — user needs to re-grant
    return { provider: null, needsPermission: true, folderName: handle.name }
  }

  if (state.type === 'local' && state.directoryPath) {
    const desktop = getDesktopApi()
    if (!desktop) {
      return {
        provider: null,
        needsPermission: true,
        folderName: state.directoryName ?? state.directoryPath,
      }
    }
    const provider = new ElectronLocalProvider(
      state.directoryPath,
      state.directoryName ?? 'Local vault'
    )
    await provider.init()
    return { provider, needsPermission: false, folderName: provider.folderName }
  }

  if (
    state.type === 'github' &&
    state.githubPat &&
    state.githubOwner &&
    state.githubRepo
  ) {
    const provider = new GitHubProvider(
      state.githubPat,
      state.githubOwner,
      state.githubRepo
    )
    return { provider, needsPermission: false }
  }

  return { provider: null, needsPermission: false }
}

/**
 * Called from the "Grant access" button.  Requests permission for the stored
 * handle and returns a ready provider, or null if denied.
 * MUST be called from a user gesture (button click).
 */
export async function requestPermissionAndCreate(): Promise<VaultProvider | null> {
  const state = await loadActiveVault()
  if (state?.directoryPath) {
    const desktop = getDesktopApi()
    if (!desktop) return null
    const provider = new ElectronLocalProvider(
      state.directoryPath,
      state.directoryName ?? 'Local vault'
    )
    await provider.init()
    return provider
  }
  if (!state?.directoryHandle) return null
  const permission = await state.directoryHandle.requestPermission({ mode: 'readwrite' })
  if (permission !== 'granted') return null
  const provider = new LocalGitProvider(state.directoryHandle)
  await provider.init()
  return provider
}

/**
 * Reconnect to a previously-stored vault by its id. For GitHub that's
 * instant (PAT is already cached); for local it queries / requests
 * filesystem permission (must be called from a user gesture).
 */
export async function createProviderFromStoredVault(id: string): Promise<{
  provider: VaultProvider | null
  needsPermission: boolean
  folderName?: string
  state?: PersistedVaultState
}> {
  const state = await getVault(id)
  if (!state) return { provider: null, needsPermission: false }

  if (state.type === 'local' && state.directoryHandle) {
    const handle = state.directoryHandle
    const existing = await handle.queryPermission({ mode: 'readwrite' })
    let permission = existing
    if (permission !== 'granted') {
      permission = await handle.requestPermission({ mode: 'readwrite' })
    }
    if (permission !== 'granted') {
      return { provider: null, needsPermission: true, folderName: handle.name, state }
    }
    const provider = new LocalGitProvider(handle)
    await provider.init()
    await upsertVault(state)
    return { provider, needsPermission: false, folderName: handle.name, state }
  }

  if (state.type === 'local' && state.directoryPath) {
    const desktop = getDesktopApi()
    if (!desktop) {
      return {
        provider: null,
        needsPermission: true,
        folderName: state.directoryName ?? state.directoryPath,
        state,
      }
    }
    const provider = new ElectronLocalProvider(
      state.directoryPath,
      state.directoryName ?? 'Local vault'
    )
    await provider.init()
    await upsertVault(state)
    return { provider, needsPermission: false, folderName: provider.folderName, state }
  }

  if (state.type === 'github' && state.githubPat && state.githubOwner && state.githubRepo) {
    const provider = new GitHubProvider(state.githubPat, state.githubOwner, state.githubRepo)
    await upsertVault(state)
    return { provider, needsPermission: false, state }
  }

  return { provider: null, needsPermission: false, state }
}

/** Convenience: mark a vault as used. Equivalent to upsertVault(state). */
export async function touchVault(state: PersistedVaultState): Promise<void> {
  await upsertVault(state)
}

/**
 * Recursively list every file and directory in the vault.
 *
 * - Local: one call already returns the full tree.
 * - GitHub: the contents API returns a single directory level; walk subfolders.
 */
export async function listFilesRecursive(
  provider: VaultProvider,
  dir = ''
): Promise<FileEntry[]> {
  if (provider.type === 'local') {
    return provider.listFiles(dir)
  }
  // GitHub: walk
  const out: FileEntry[] = []
  const queue: string[] = [dir]
  while (queue.length > 0) {
    const current = queue.shift()!
    const entries = await provider.listFiles(current)
    for (const e of entries) {
      out.push(e)
      if (e.type === 'dir') queue.push(e.path)
    }
  }
  return out
}
