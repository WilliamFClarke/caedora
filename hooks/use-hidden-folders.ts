'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  hideFolder,
  NO_HIDDEN_FOLDERS,
  removeHiddenFolder,
  renameHiddenFolder,
  showFolder,
  type HiddenFolders,
} from '@/lib/hidden-folders'
import { loadHiddenFolders, saveHiddenFolders } from '@/lib/storage/idb'

export function useHiddenFolders(vaultKey: string | null) {
  const [state, setState] = useState<HiddenFolders>(NO_HIDDEN_FOLDERS)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!vaultKey) {
      setState(NO_HIDDEN_FOLDERS)
      setLoadedKey(null)
      return
    }
    void loadHiddenFolders(vaultKey).then((stored) => {
      if (cancelled) return
      setState(stored)
      setLoadedKey(vaultKey)
    })
    return () => {
      cancelled = true
    }
  }, [vaultKey])

  useEffect(() => {
    if (!vaultKey || loadedKey !== vaultKey) return
    void saveHiddenFolders(vaultKey, state)
  }, [state, loadedKey, vaultKey])

  return {
    hiddenFolders: state,
    hideFolder: useCallback((path: string) => setState((prev) => hideFolder(prev, path)), []),
    showFolder: useCallback((path: string) => setState((prev) => showFolder(prev, path)), []),
    setShowHidden: useCallback(
      (showHidden: boolean) => setState((prev) => ({ ...prev, showHidden })),
      []
    ),
    renameHiddenFolder: useCallback(
      (from: string, to: string) => setState((prev) => renameHiddenFolder(prev, from, to)),
      []
    ),
    removeHiddenFolder: useCallback(
      (path: string) => setState((prev) => removeHiddenFolder(prev, path)),
      []
    ),
  }
}
