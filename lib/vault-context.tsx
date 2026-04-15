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
  connectLocal: async () => {},
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
   * Opens the native folder picker and connects a local git vault.
   * CRITICAL: this MUST be invoked directly from a user click handler —
   * showDirectoryPicker() will be blocked if called after an async gap.
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
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setStatus({ state: 'idle' })  // user cancelled picker
      } else {
        setStatus({
          state: 'error',
          error: e instanceof Error ? e.message : 'Failed to open folder',
        })
      }
    }
  }, [])

  const connectGitHub = useCallback(
    async (token: string, owner: string, repo: string) => {
      setStatus({ state: 'connecting' })
      try {
        await saveVaultState({
          type: 'github',
          githubToken: token,
          githubOwner: owner,
          githubRepo: repo,
          lastOpenedAt: Date.now(),
        })
        const p = new GitHubProvider(token, owner, repo)
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
   * MUST be called from a user gesture (button click).
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
