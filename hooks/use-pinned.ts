'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadPinned, savePinned } from '@/lib/storage/idb'

export function usePinned(vaultKey: string | null) {
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!vaultKey) {
      setPinned(new Set())
      setLoadedKey(null)
      return
    }
    void loadPinned(vaultKey).then((paths) => {
      if (cancelled) return
      setPinned(new Set(paths))
      setLoadedKey(vaultKey)
    })
    return () => {
      cancelled = true
    }
  }, [vaultKey])

  useEffect(() => {
    if (!vaultKey || loadedKey !== vaultKey) return
    void savePinned(vaultKey, [...pinned])
  }, [pinned, loadedKey, vaultKey])

  const toggle = useCallback((path: string) => {
    setPinned((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const rename = useCallback((from: string, to: string) => {
    setPinned((prev) => {
      const next = new Set<string>()
      for (const p of prev) {
        if (p === from) next.add(to)
        else if (p.startsWith(`${from}/`)) next.add(`${to}${p.slice(from.length)}`)
        else next.add(p)
      }
      return next
    })
  }, [])

  const remove = useCallback((path: string) => {
    setPinned((prev) => {
      const next = new Set<string>()
      for (const p of prev) {
        if (p !== path && !p.startsWith(`${path}/`)) next.add(p)
      }
      return next
    })
  }, [])

  return { pinned, toggle, rename, remove }
}
