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
  requestPermissionAndCreate,
  saveVaultState,
  clearVaultState,
  LocalGitProvider,
  GitHubProvider,
} from './storage'
import type { VaultContextValue, VaultProvider, VaultStatus } from './types'

const defaultContext: VaultContextValue = {
  provider: null,
  status: { state: 'idle' },
  connectLocal: async () => null,
  connectGitHub: async () => {},
  grantPermission: async () => {},
  disconnect: () => {},
}

const VaultContext = createContext<VaultContextValue>(defaultContext)

export function VaultContextProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<VaultProvider | null>(null)
  const [status, setStatus] = useState<VaultStatus>({ state: 'idle' })

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
  const connectLocal = useCallback(async () => {
    setStatus({ state: 'connecting' })
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      await saveVaultState({
        type: 'local',
        directoryHandle: handle,
        lastOpenedAt: Date.now(),
      })
      const p = new LocalGitProvider(handle)
      await p.init()
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
      return null
    }
  }, [])

  const connectGitHub = useCallback(
    async (pat: string, owner: string, repo: string) => {
      setStatus({ state: 'connecting' })
      try {
        await saveVaultState({
          type: 'github',
          githubPat: pat,
          githubOwner: owner,
          githubRepo: repo,
          lastOpenedAt: Date.now(),
        })
        const p = new GitHubProvider(pat, owner, repo)
        setProvider(p)
        setStatus({ state: 'ready', providerType: 'github' })
      } catch (e) {
        setStatus({
          state: 'error',
          error: e instanceof Error ? e.message : 'Failed to connect GitHub',
        })
      }
    },
    []
  )

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
    void clearVaultState()
  }, [])

  return (
    <VaultContext.Provider
      value={{ provider, status, connectLocal, connectGitHub, grantPermission, disconnect }}
    >
      {children}
    </VaultContext.Provider>
  )
}

export function useVault(): VaultContextValue {
  return useContext(VaultContext)
}
