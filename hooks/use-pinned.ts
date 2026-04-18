'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadPinned, savePinned } from '@/lib/storage/idb'

export function usePinned() {
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void loadPinned().then((paths) => {
      setPinned(new Set(paths))
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    void savePinned([...pinned])
  }, [pinned, loaded])

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
