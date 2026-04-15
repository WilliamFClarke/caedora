import { loadVaultState, saveVaultState } from './idb'
import { LocalGitProvider } from './local-provider'
import { GitHubProvider } from './github-provider'
import type { VaultProvider } from '../types'

export { saveVaultState, loadVaultState, clearVaultState } from './idb'
export { LocalGitProvider } from './local-provider'
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
  const state = await loadVaultState()
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

  if (
    state.type === 'github' &&
    state.githubToken &&
    state.githubOwner &&
    state.githubRepo
  ) {
    const provider = new GitHubProvider(
      state.githubToken,
      state.githubOwner,
      state.githubRepo
    )
    return { provider, needsPermission: false }
  }

  return { provider: null, needsPermission: false }
}

/**
 * Called from the vault "Grant access" button.  Requests permission for the
 * stored handle and returns a ready provider, or null if denied.
 * MUST be called from a user gesture (button click).
 */
export async function requestPermissionAndCreate(): Promise<VaultProvider | null> {
  const state = await loadVaultState()
  if (!state?.directoryHandle) return null
  const permission = await state.directoryHandle.requestPermission({ mode: 'readwrite' })
  if (permission !== 'granted') return null
  const provider = new LocalGitProvider(state.directoryHandle)
  await provider.init()
  return provider
}

/** Persist GitHub vault state. */
export async function saveGitHubState(
  token: string,
  owner: string,
  repo: string
): Promise<void> {
  await saveVaultState({ type: 'github', githubToken: token, githubOwner: owner, githubRepo: repo, lastOpenedAt: Date.now() })
}
