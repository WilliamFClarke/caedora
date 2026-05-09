'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FolderAppearance } from '@/lib/folder-appearance'
import { loadFolderAppearances, saveFolderAppearances } from '@/lib/storage/idb'

export function useFolderAppearance(vaultKey: string | null) {
  const [appearances, setAppearances] = useState<Record<string, FolderAppearance>>({})
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!vaultKey) {
      setAppearances({})
      setLoadedKey(null)
      return
    }
    void loadFolderAppearances(vaultKey).then((stored) => {
      if (cancelled) return
      setAppearances(stored)
      setLoadedKey(vaultKey)
    })
    return () => {
      cancelled = true
    }
  }, [vaultKey])

  useEffect(() => {
    if (!vaultKey || loadedKey !== vaultKey) return
    void saveFolderAppearances(vaultKey, appearances)
  }, [appearances, loadedKey, vaultKey])

  const setFolderAppearance = useCallback((path: string, appearance: FolderAppearance) => {
    setAppearances((prev) => ({ ...prev, [path]: appearance }))
  }, [])

  const setManyFolderAppearances = useCallback((nextAppearances: Record<string, FolderAppearance>) => {
    setAppearances((prev) => ({ ...nextAppearances, ...prev }))
  }, [])

  const renameFolderAppearance = useCallback((from: string, to: string) => {
    setAppearances((prev) => {
      const next: Record<string, FolderAppearance> = {}
      for (const [path, appearance] of Object.entries(prev)) {
        if (path === from) next[to] = appearance
        else if (path.startsWith(`${from}/`)) next[`${to}${path.slice(from.length)}`] = appearance
        else next[path] = appearance
      }
      return next
    })
  }, [])

  const removeFolderAppearance = useCallback((path: string) => {
    setAppearances((prev) => {
      const next: Record<string, FolderAppearance> = {}
      for (const [storedPath, appearance] of Object.entries(prev)) {
        if (storedPath !== path && !storedPath.startsWith(`${path}/`)) {
          next[storedPath] = appearance
        }
      }
      return next
    })
  }, [])

  return {
    folderAppearances: appearances,
    setFolderAppearance,
    setManyFolderAppearances,
    renameFolderAppearance,
    removeFolderAppearance,
  }
}
