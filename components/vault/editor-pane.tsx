'use client'

import { useEffect, useState } from 'react'
import { Editor } from './editor'
import { SyncIndicator } from './sync-indicator'
import { useAutosave } from '@/lib/autosave'
import type { VaultProvider } from '@/lib/types'

interface EditorPaneProps {
  provider: VaultProvider
  path: string | null
}

export function EditorPane({ provider, path }: EditorPaneProps) {
  const [loaded, setLoaded] = useState<{ path: string; content: string } | null>(null)
  const [liveContent, setLiveContent] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!path) {
      setLoaded(null)
      setLiveContent(null)
      return
    }
    setLoadError(null)
    provider
      .readFile(path)
      .then((content) => {
        if (cancelled) return
        setLoaded({ path, content })
        setLiveContent(content)
      })
      .catch((e) => {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : 'Failed to load note')
      })
    return () => {
      cancelled = true
    }
  }, [provider, path])

  const status = useAutosave({ provider, path, content: liveContent })

  if (!path) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Select a note, or create a new one.
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive text-sm">{loadError}</p>
      </div>
    )
  }

  if (!loaded || loaded.path !== path) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="text-muted-foreground text-xs">{path}</div>
        <SyncIndicator status={status} />
      </div>
      <div className="flex-1 overflow-auto">
        <Editor />
      </div>
    </div>
  )
}
