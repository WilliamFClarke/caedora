'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CloudOff, GitBranch, Loader2, Plus, Star, X } from 'lucide-react'
import { Editor } from './editor'
import { useAutosave, type SyncStatus } from '@/lib/autosave'
import {
  combine,
  normalizeTag,
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
        setLoaded({ path, body, frontmatter })
        setLiveBody(body)
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

  // Tick every 30s so "Edited X ago" stays current without re-render churn.
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

  // Track last saved timestamp so the meta row can show "Edited just now" etc.
  useEffect(() => {
    if (status === 'saved') setSavedAt(Date.now())
  }, [status])

  const words = useMemo(() => countWords(liveBody ?? ''), [liveBody])
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

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  const displayPath = path
  const title = titleFromPath(displayPath)
  const renameFile = async (nextTitle: string) => {
    const trimmed = nextTitle.trim()
    if (!trimmed || trimmed === title) return
    const parent = displayPath.split('/').slice(0, -1).join('/')
    const newName = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
    const to = parent ? `${parent}/${newName}` : newName
    await onRename(displayPath, to)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 pt-6 pb-4">
        <TitleRow
          title={title}
          isPinned={isPinned}
          onCommit={renameFile}
          onTogglePin={() => onTogglePin(displayPath)}
        />
        <MetaRow savedAt={savedAt} words={words} readMinutes={readMinutes} />
        <TagRow tags={tags} onChange={setTags} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor
          fileKey={loaded.path}
          initialMarkdown={loaded.body}
          onChange={setLiveBody}
        />
      </div>
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

function TitleRow({
  title,
  isPinned,
  onCommit,
  onTogglePin,
}: {
  title: string
  isPinned: boolean
  onCommit: (next: string) => void | Promise<void>
  onTogglePin: () => void
}) {
  const [value, setValue] = useState(title)
  const committedRef = useRef(title)
  // Sync when the selected file changes
  useEffect(() => {
    setValue(title)
    committedRef.current = title
  }, [title])

  return (
    <div className="flex items-center justify-between gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const next = value.trim() || 'Untitled'
          setValue(next)
          if (next !== committedRef.current) {
            committedRef.current = next
            void onCommit(next)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            setValue(committedRef.current)
            e.currentTarget.blur()
          }
        }}
        placeholder="Untitled"
        className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={onTogglePin}
        aria-label={isPinned ? 'Unpin note' : 'Pin note'}
        className={cn(
          'text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition',
          isPinned && 'text-primary hover:text-primary'
        )}
      >
        <Star className={cn('size-4', isPinned && 'fill-current')} />
      </button>
    </div>
  )
}

function MetaRow({
  savedAt,
  words,
  readMinutes,
}: {
  savedAt: number | null
  words: number
  readMinutes: number
}) {
  return (
    <div className="text-muted-foreground mt-2 flex items-center gap-2 font-mono text-[11px]">
      <span>Edited {formatRelative(savedAt)}</span>
      <span className="text-border">·</span>
      <span>
        {words} word{words === 1 ? '' : 's'}
      </span>
      <span className="text-border">·</span>
      <span>{readMinutes} min read</span>
    </div>
  )
}

function TagRow({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (next: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    const tag = normalizeTag(draft)
    setDraft('')
    setAdding(false)
    if (!tag || tags.includes(tag)) return
    onChange([...tags, tag])
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="bg-accent text-accent-foreground group/tag inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px]"
        >
          #{t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            aria-label={`Remove ${t}`}
            className="text-muted-foreground hover:text-foreground opacity-0 transition group-hover/tag:opacity-100"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setDraft('')
              setAdding(false)
            }
          }}
          placeholder="tag"
          className="bg-background h-6 w-20 rounded-full border px-2 font-mono text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 font-mono text-[11px] transition"
        >
          <Plus className="size-2.5" />
          tag
        </button>
      )}
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
