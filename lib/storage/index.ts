import {
  loadActiveVault,
  upsertVault,
  getVault,
  vaultId,
  loadGitHubAppSession,
  rotateGitHubAppCredentials,
} from './idb'
import { LocalGitProvider } from './local-provider'
import { ElectronLocalProvider } from './electron-provider'
import { GitHubProvider } from './github-provider'
import { GitHubAuth, GitHubAuthExpiredError, type GitHubCredentials } from './github-auth'
import { BrowserBundleProvider } from './browser-provider'
import { getDesktopApi } from '../desktop'
import type { VaultProvider, FileEntry, PersistedVaultState } from '../types'

export {
  upsertVault,
  listVaults,
  getVault,
  removeVault,
  getActiveVaultId,
  setActiveVaultId,
  saveGitHubAppSession,
  loadGitHubAppSession,
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
export { GitHubAuthExpiredError } from './github-auth'
export {
  BrowserBundleProvider,
  browserStoragePersistence,
  createBrowserBundleId,
  exportBrowserBundle,
  exportBrowserBundleAsOkfZip,
} from './browser-provider'

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
    return { provider: createGitHubProvider(state), needsPermission: false }
  }

  if (state.type === 'browser' && state.browserBundleId && state.browserBundleName) {
    const provider = new BrowserBundleProvider(state.browserBundleId, state.browserBundleName)
    await provider.init()
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
    const provider = createGitHubProvider(state)
    await upsertVault(state)
    return { provider, needsPermission: false, state }
  }

  if (state.type === 'browser' && state.browserBundleId && state.browserBundleName) {
    const provider = new BrowserBundleProvider(state.browserBundleId, state.browserBundleName)
    await provider.init()
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
  if (provider.type === 'local' || provider.type === 'browser') {
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

/**
 * A provider for a stored GitHub vault. App connections get a token source
 * that renews expiring tokens, on use and after a 401, and saves each new pair.
 */
export function createGitHubProvider(state: PersistedVaultState): GitHubProvider {
  const owner = state.githubOwner!
  const repo = state.githubRepo!
  if (state.githubAuth !== 'app' || !state.githubRefreshToken) {
    return new GitHubProvider(state.githubPat!, owner, repo)
  }
  const id = vaultId(state)
  const auth = new GitHubAuth(
    {
      accessToken: state.githubPat!,
      refreshToken: state.githubRefreshToken,
      expiresAt: state.githubTokenExpiresAt,
    },
    {
      load: async () => {
        const saved = await getVault(id)
        return saved?.githubPat
          ? {
              accessToken: saved.githubPat,
              refreshToken: saved.githubRefreshToken,
              expiresAt: saved.githubTokenExpiresAt,
            }
          : null
      },
      save: (next, consumed) => rotateGitHubAppCredentials(consumed, next),
      exchange: exchangeGitHubRefreshToken,
      withLock: withRefreshLock,
    }
  )
  return new GitHubProvider(auth, owner, repo)
}


/**
 * Renew the saved GitHub sign in used to browse repositories. Goes through the
 * same lock and rotation as vault providers so the two never spend one token.
 */
export async function refreshGitHubAppSession(
  session: GitHubCredentials
): Promise<GitHubCredentials | null> {
  if (!session.refreshToken) return null
  const consumed = session.refreshToken
  const auth = new GitHubAuth(session, {
    load: async () => (await loadGitHubAppSession()) ?? session,
    save: (next, old) => rotateGitHubAppCredentials(old, next),
    exchange: exchangeGitHubRefreshToken,
    withLock: withRefreshLock,
  })
  try {
    const token = await auth.refresh(session.accessToken)
    if (!token) return null
  } catch {
    return null
  }
  return (await loadGitHubAppSession()) ?? null
}

/** Web Locks keep two tabs from spending the same single use refresh token. */
async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return fn()
  return await navigator.locks.request('caedora-github-refresh', fn)
}

async function exchangeGitHubRefreshToken(refreshToken: string): Promise<GitHubCredentials> {
  const response = await fetch('/api/github/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const data = (await response.json().catch(() => ({}))) as GitHubCredentials & {
    permanent?: boolean
  }
  if (!response.ok || !data.accessToken) {
    if (data.permanent) throw new GitHubAuthExpiredError()
    throw new Error(`Could not refresh GitHub token (${response.status})`)
  }
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
  }
}
