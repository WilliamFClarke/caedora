'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  createProviderFromPersistedState,
  createProviderFromStoredVault,
  requestPermissionAndCreate,
  saveVaultState,
  setActiveVaultId,
  LocalGitProvider,
  GitHubProvider,
  BrowserBundleProvider,
} from './storage'
import { ElectronLocalProvider } from './storage/electron-provider'
import type { VaultContextValue, VaultProvider, VaultStatus } from './types'

const defaultContext: VaultContextValue = {
  provider: null,
  status: { state: 'checking' },
  connectLocal: async () => null,
  connectDesktopLocal: async () => false,
  connectGitHub: async () => false,
  connectGitHubApp: async () => false,
  connectBrowserBundle: async () => false,
  connectToVault: async () => {},
  grantPermission: async () => {},
  disconnect: () => {},
}

const VaultContext = createContext<VaultContextValue>(defaultContext)

export function VaultContextProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<VaultProvider | null>(null)
  const [status, setStatus] = useState<VaultStatus>({ state: 'checking' })

  // On mount: restore vault from IndexedDB
  useEffect(() => {
    ;(async () => {
      try {
        const { provider: p, needsPermission, folderName } =
          await createProviderFromPersistedState()
        if (p) {
          setProvider(p)
          setStatus({ state: 'ready', providerType: p.type })
        } else if (needsPermission && folderName) {
          setStatus({ state: 'permission-required', folderName })
        } else {
          setStatus({ state: 'idle' })
        }
      } catch (e) {
        setStatus({
          state: 'error',
          error: e instanceof Error ? e.message : 'Failed to restore vault',
        })
      }
    })()
  }, [])

  /**
   * Opens the native folder picker and connects a local vault.
   * CRITICAL: MUST be invoked directly from a user click — showDirectoryPicker
   * is blocked if called after an async gap.
   *
   * Returns the resulting provider (so callers can seed files before navigating)
   * or null if the user cancelled.
   */
  const connectLocal = useCallback(async (preselected?: FileSystemDirectoryHandle) => {
    setStatus({ state: 'connecting' })
    try {
      const handle = preselected ?? (await window.showDirectoryPicker({ mode: 'readwrite' }))
      const p = new LocalGitProvider(handle)
      await p.init()
      await saveVaultState({
        type: 'local',
        directoryHandle: handle,
        lastOpenedAt: Date.now(),
      })
      setProvider(p)
      setStatus({ state: 'ready', providerType: 'local' })
      return handle
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setStatus({ state: 'idle' })
        return null
      }
      setStatus({
        state: 'error',
        error: e instanceof Error ? e.message : 'Failed to open folder',
      })
      throw e
    }
  }, [])

  const connectDesktopLocal = useCallback(async (root: { path: string; name: string }) => {
    setStatus({ state: 'connecting' })
    try {
      const p = new ElectronLocalProvider(root.path, root.name)
      await p.init()
      await saveVaultState({
        type: 'local',
        directoryPath: root.path,
        directoryName: root.name,
        lastOpenedAt: Date.now(),
      })
      setProvider(p)
      setStatus({ state: 'ready', providerType: 'local' })
      return true
    } catch (e) {
      setStatus({
        state: 'error',
        error: e instanceof Error ? e.message : 'Failed to open desktop folder',
      })
      return false
    }
  }, [])

  const connectGitHub = useCallback(
    async (pat: string, owner: string, repo: string) => {
      setStatus({ state: 'connecting' })
      try {
        await saveVaultState({
          type: 'github',
          githubAuth: 'pat',
          githubPat: pat,
          githubOwner: owner,
          githubRepo: repo,
          lastOpenedAt: Date.now(),
        })
      const p = new GitHubProvider(pat, owner, repo)
      setProvider(p)
      setStatus({ state: 'ready', providerType: 'github' })
      return true
    } catch (e) {
      setStatus({
        state: 'error',
        error: e instanceof Error ? e.message : 'Failed to connect GitHub',
      })
      return false
    }
  },
    []
  )

  const connectGitHubApp = useCallback(
    async (connection: {
      accessToken: string
      refreshToken?: string
      expiresAt?: number
      owner: string
      repo: string
    }) => {
      setStatus({ state: 'connecting' })
      try {
        await saveVaultState({
          type: 'github',
          githubAuth: 'app',
          githubPat: connection.accessToken,
          githubRefreshToken: connection.refreshToken,
          githubTokenExpiresAt: connection.expiresAt,
          githubOwner: connection.owner,
          githubRepo: connection.repo,
          lastOpenedAt: Date.now(),
        })
        const p = new GitHubProvider(connection.accessToken, connection.owner, connection.repo)
        setProvider(p)
        setStatus({ state: 'ready', providerType: 'github' })
        return true
      } catch (e) {
        setStatus({
          state: 'error',
          error: e instanceof Error ? e.message : 'Failed to connect GitHub',
        })
        return false
      }
    },
    []
  )

  const connectBrowserBundle = useCallback(async (bundle: { id: string; name: string }) => {
    setStatus({ state: 'connecting' })
    try {
      const p = new BrowserBundleProvider(bundle.id, bundle.name)
      await p.init()
      await saveVaultState({
        type: 'browser',
        browserBundleId: bundle.id,
        browserBundleName: bundle.name,
        lastOpenedAt: Date.now(),
      })
      setProvider(p)
      setStatus({ state: 'ready', providerType: 'browser' })
      return true
    } catch (e) {
      setStatus({
        state: 'error',
        error: e instanceof Error ? e.message : 'Failed to create browser vault',
      })
      return false
    }
  }, [])

  /**
   * Reconnect to a previously-stored vault by id. Instant for GitHub
   * (PAT is cached); for local it may prompt for filesystem permission,
   * which requires this to be called from a user gesture.
   */
  const connectToVault = useCallback(async (id: string) => {
    setStatus({ state: 'connecting' })
    try {
      const { provider: p, needsPermission, folderName } =
        await createProviderFromStoredVault(id)
      if (p) {
        setProvider(p)
        setStatus({ state: 'ready', providerType: p.type })
      } else if (needsPermission && folderName) {
        setStatus({ state: 'permission-required', folderName })
      } else {
        setStatus({ state: 'idle' })
      }
    } catch (e) {
      setStatus({
        state: 'error',
        error: e instanceof Error ? e.message : 'Could not reconnect to vault',
      })
    }
  }, [])

  /**
   * Re-requests FSAA permission for the stored handle.
   * MUST be called from a user gesture.
   */
  const grantPermission = useCallback(async () => {
    setStatus({ state: 'connecting' })
    try {
      const p = await requestPermissionAndCreate()
      if (p) {
        setProvider(p)
        setStatus({ state: 'ready', providerType: p.type })
      } else {
        setStatus({ state: 'idle' })
      }
    } catch (e) {
      setStatus({
        state: 'error',
        error: e instanceof Error ? e.message : 'Permission denied',
      })
    }
  }, [])

  const disconnect = useCallback(() => {
    setProvider(null)
    setStatus({ state: 'idle' })
    // Keep the vault in the saved list — just clear the "active" pointer so
    // the user lands on the home page and can pick a different vault.
    void setActiveVaultId(null)
  }, [])

  return (
    <VaultContext.Provider
      value={{
        provider,
        status,
        connectLocal,
        connectDesktopLocal,
        connectGitHub,
        connectGitHubApp,
        connectBrowserBundle,
        connectToVault,
        grantPermission,
        disconnect,
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}

export function useVault(): VaultContextValue {
  return useContext(VaultContext)
}
