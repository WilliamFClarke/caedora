'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, CloudOff, GitBranch, Loader2 } from 'lucide-react'
import { Editor } from './editor'
import { NoteMeta } from './note-meta'
import { useAutosave, type SyncStatus } from '@/lib/autosave'
import {
  combine,
  parseFrontmatter,
  type Frontmatter,
} from '@/lib/frontmatter'
import type { VaultProvider } from '@/lib/types'
import { cn } from '@/lib/utils'

interface EditorPaneProps {
  provider: VaultProvider
  path: string | null
  lastModified?: number
  isPinned: boolean
  onTogglePin: (path: string) => void
  onRename: (from: string, to: string) => Promise<void>
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

function formatRelative(ts: number | null): string {
  if (!ts) return 'just now'
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 10) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`
  return new Date(ts).toLocaleDateString()
}

function titleFromPath(path: string): string {
  const name = path.split('/').pop() ?? path
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

function extractH1(markdown: string): string | null {
  const match = markdown.match(/^\s*#\s+(.+?)\s*$/m)
  return match ? match[1].trim() : null
}

function sanitizeFilename(raw: string): string {
  return raw.replace(/[\\/:*?"<>|]/g, '').trim()
}

export function EditorPane({
  provider,
  path,
  lastModified,
  isPinned,
  onTogglePin,
  onRename,
}: EditorPaneProps) {
  const [loaded, setLoaded] = useState<{
    path: string
    body: string
    frontmatter: Frontmatter
  } | null>(null)
  const [liveBody, setLiveBody] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [branch, setBranch] = useState<string>('')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [metaAnchor, setMetaAnchor] = useState<HTMLElement | null>(null)
  const [, forceTick] = useState(0)

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
      setLiveBody(null)
      setTags([])
      return
    }
    setLoadError(null)
    provider
      .readFile(path)
      .then((content) => {
        if (cancelled) return
        const { frontmatter, body } = parseFrontmatter(content)
        const stem = titleFromPath(path)
        const ensuredBody = /^\s*#\s+/.test(body) ? body : `# ${stem}\n\n${body}`
        setLoaded({ path, body: ensuredBody, frontmatter })
        setLiveBody(ensuredBody)
        setTags(frontmatter.tags)
        setSavedAt(lastModified ?? Date.now())
      })
      .catch((e) => {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : 'Failed to load note')
      })
    return () => {
      cancelled = true
    }
  }, [provider, path, lastModified])

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const fmForSave = useMemo<Frontmatter>(() => {
    const extra = loaded?.frontmatter.extra ?? []
    return { tags, extra }
  }, [tags, loaded])

  const fullContent = useMemo(() => {
    if (liveBody === null) return null
    return combine(fmForSave, liveBody)
  }, [fmForSave, liveBody])

  const status = useAutosave({ provider, path, content: fullContent })

  useEffect(() => {
    if (status === 'saved') setSavedAt(Date.now())
  }, [status])

  const words = useMemo(() => countWords(liveBody ?? ''), [liveBody])
  const readMinutes = Math.max(1, Math.ceil(words / 225))

  // Debounced H1 → filename sync. When the first H1's text diverges from the
  // current filename stem, rename the file. Guard rename loops by comparing
  // against the live `path` (which updates after each successful rename).
  const renamingRef = useRef(false)
  useEffect(() => {
    if (!path || liveBody === null) return
    const h1 = extractH1(liveBody)
    if (!h1) return
    const currentStem = titleFromPath(path)
    const nextStem = sanitizeFilename(h1)
    if (!nextStem || nextStem === currentStem) return
    const timer = setTimeout(async () => {
      if (renamingRef.current) return
      const parent = path.split('/').slice(0, -1).join('/')
      const to = parent ? `${parent}/${nextStem}.md` : `${nextStem}.md`
      if (to === path) return
      renamingRef.current = true
      try {
        await onRename(path, to)
      } finally {
        renamingRef.current = false
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [liveBody, path, onRename])

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

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  const displayPath = path

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor
          fileKey={loaded.path}
          initialMarkdown={loaded.body}
          onChange={setLiveBody}
          onMetaAnchorChange={setMetaAnchor}
        />
      </div>
      {metaAnchor &&
        createPortal(
          <NoteMeta
            savedAt={savedAt}
            words={words}
            readMinutes={readMinutes}
            tags={tags}
            onTagsChange={setTags}
            isPinned={isPinned}
            onTogglePin={() => onTogglePin(displayPath)}
          />,
          metaAnchor
        )}
      <StatusBar
        status={status}
        path={displayPath}
        branch={branch}
        words={words}
        savedAt={savedAt}
      />
    </div>
  )
}

function StatusBar({
  status,
  path,
  branch,
  words,
  savedAt,
}: {
  status: SyncStatus
  path: string
  branch: string
  words: number
  savedAt: number | null
}) {
  return (
    <div className="border-border bg-sidebar text-muted-foreground flex items-center justify-between border-t px-4 py-1.5 text-[11px]">
      <div className="flex min-w-0 items-center gap-3">
        <SavedPill status={status} />
        <span className="font-mono text-[10px]">{formatRelative(savedAt)}</span>
      </div>
      <div className="flex min-w-0 flex-1 justify-center px-4">
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
