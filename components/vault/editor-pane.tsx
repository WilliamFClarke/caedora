'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, CloudOff, GitBranch, Loader2 } from 'lucide-react'
import { Editor } from './editor'
import { useAutosave, type SyncStatus } from '@/lib/autosave'
import type { VaultProvider } from '@/lib/types'
import { cn } from '@/lib/utils'

interface EditorPaneProps {
  provider: VaultProvider
  path: string | null
}

function countWords(markdown: string): number {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  const tokens = plain.trim().split(/\s+/).filter(Boolean)
  return tokens.length
}

export function EditorPane({ provider, path }: EditorPaneProps) {
  const [loaded, setLoaded] = useState<{ path: string; content: string } | null>(null)
  const [liveContent, setLiveContent] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [branch, setBranch] = useState<string>('')

  useEffect(() => {
    let alive = true
    provider.currentBranch().then((b) => {
      if (alive) setBranch(b)
    }).catch(() => {})
    return () => {
      alive = false
    }
  }, [provider])

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

  const words = useMemo(() => countWords(liveContent ?? ''), [liveContent])
  const readMinutes = Math.max(1, Math.ceil(words / 225))

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
      <div className="text-muted-foreground flex items-center gap-3 border-b px-6 py-2 font-mono text-[10px] uppercase tracking-wide">
        <span>{words} words</span>
        <span className="text-border">·</span>
        <span>{readMinutes} min read</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor
          fileKey={path}
          initialMarkdown={loaded.content}
          onChange={setLiveContent}
        />
      </div>
      <StatusBar status={status} path={path} branch={branch} words={words} />
    </div>
  )
}

function StatusBar({
  status,
  path,
  branch,
  words,
}: {
  status: SyncStatus
  path: string
  branch: string
  words: number
}) {
  return (
    <div className="border-border bg-sidebar text-muted-foreground flex items-center justify-between border-t px-4 py-1.5 text-[11px]">
      <div className="flex min-w-0 items-center gap-3">
        <SavedPill status={status} />
        <span className="text-border">·</span>
        <span className="truncate font-mono text-[10px]">{path}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 font-mono text-[10px]">
          <GitBranch className="size-3" />
          {branch || '…'}
        </span>
        <span className="text-border">·</span>
        <span className="font-mono text-[10px]">{words} words</span>
        <span className="text-border">·</span>
        <span className="font-mono text-[10px] uppercase">markdown</span>
      </div>
    </div>
  )
}

function SavedPill({ status }: { status: SyncStatus }) {
  const base =
    'flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide'
  if (status === 'saving') {
    return (
      <span className={cn(base, 'border-border text-muted-foreground')}>
        <Loader2 className="size-2.5 animate-spin" />
        Saving
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className={cn(base, 'border-destructive/40 text-destructive')}>
        <CloudOff className="size-2.5" />
        Error
      </span>
    )
  }
  return (
    <span className={cn(base, 'border-good/40 text-good')}>
      <Check className="size-2.5" />
      Saved
    </span>
  )
}
