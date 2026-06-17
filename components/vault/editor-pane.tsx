'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CloudOff,
  GitBranch,
  Loader2,
  Network,
} from 'lucide-react'
import { Editor } from './editor'
import { NoteMeta } from './note-meta'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAutosave, type SyncStatus } from '@/lib/autosave'
import {
  combine,
  emptyFrontmatter,
  parseFrontmatter,
  type Frontmatter,
} from '@/lib/frontmatter'
import {
  backlinksFor,
  deriveTitleFromPath,
  extractLinks,
  isReservedPath,
  validateDocument,
  type OkfIssue,
  type OkfConceptSummary,
} from '@/lib/okf'
import type { VaultProvider } from '@/lib/types'
import { useSettings } from '@/lib/settings-context'
import { cn } from '@/lib/utils'

interface EditorPaneProps {
  provider: VaultProvider
  path: string | null
  lastModified?: number
  /** Bumped by VaultShell when the user clicks Sync; forces a re-read. */
  syncNonce?: number
  isPinned: boolean
  onTogglePin: (path: string) => void
  /** Called with a stable saveNow fn so the parent can trigger a flush (e.g. Sync button). */
  onSaveNow?: (fn: () => Promise<void>) => void
  conceptCatalog: Record<string, OkfConceptSummary>
  linkGraphOpen?: boolean
  onToggleLinkGraph?: () => void
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

export function EditorPane({
  provider,
  path,
  lastModified,
  syncNonce = 0,
  isPinned,
  onTogglePin,
  onSaveNow,
  conceptCatalog,
  linkGraphOpen = false,
  onToggleLinkGraph,
}: EditorPaneProps) {
  const [loaded, setLoaded] = useState<{
    path: string
    body: string
    frontmatter: Frontmatter
    raw: string
  } | null>(null)
  const [liveBody, setLiveBody] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<Frontmatter>(emptyFrontmatter())
  const [hasLocalChanges, setHasLocalChanges] = useState(false)
  const [bodyRevision, setBodyRevision] = useState(0)
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
      setMetadata(emptyFrontmatter())
      setHasLocalChanges(false)
      setBodyRevision((revision) => revision + 1)
      return
    }
    setLoadError(null)
    provider
      .readFile(path)
      .then((content) => {
        if (cancelled) return
        const parsed = parseFrontmatter(content)
        const body =
          isReservedPath(path) && !parsed.hasFrontmatter ? content : parsed.body
        setLoaded({ path, body, frontmatter: parsed.frontmatter, raw: content })
        setLiveBody(body)
        setMetadata(parsed.frontmatter)
        setHasLocalChanges(false)
        setBodyRevision((revision) => revision + 1)
        setSavedAt(lastModified ?? Date.now())
      })
      .catch((e) => {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : 'Failed to load concept')
      })
    return () => {
      cancelled = true
    }
  }, [provider, path, lastModified, syncNonce])

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const candidateContent = useMemo(() => {
    if (liveBody === null || !path) return null
    if (isReservedPath(path)) {
      if (path === 'index.md' && Object.keys(loaded?.frontmatter.extra ?? {}).length > 0) {
        return combine(loaded?.frontmatter ?? emptyFrontmatter(), liveBody)
      }
      return liveBody
    }
    return combine(metadata, liveBody)
  }, [liveBody, loaded, metadata, path])

  const okfIssues = useMemo(() => {
    if (!path || !loaded || candidateContent === null) return []
    return validateDocument(path, hasLocalChanges ? candidateContent : loaded.raw)
  }, [candidateContent, hasLocalChanges, loaded, path])
  const okfConformant = !okfIssues.some((issue) => issue.severity === 'error')
  const saveableContent = okfConformant ? candidateContent : null

  const { settings } = useSettings()
  const isGitHub = provider.type === 'github'
  const autoSaveDisabled = settings.syncMode === 'manual'
  // GitHub: each writeFile IS a commit, so we throttle writes to syncIntervalMs.
  // Local: disk writes are cheap and stay at 1 s; only the git commit is throttled.
  const writeDebounceMs = isGitHub ? settings.syncIntervalMs : 1_000
  const commitDebounceMs = settings.syncIntervalMs

  const { status, saveNow } = useAutosave({
    provider,
    path,
    content: saveableContent,
    writeDebounceMs,
    commitDebounceMs,
    disabled: autoSaveDisabled,
  })

  useEffect(() => {
    onSaveNow?.(saveNow)
  }, [saveNow, onSaveNow])

  useEffect(() => {
    if (status === 'saved') setSavedAt(Date.now())
  }, [status])

  const words = useMemo(() => countWords(liveBody ?? ''), [liveBody])
  const links = useMemo(
    () =>
      path && liveBody !== null && !isReservedPath(path)
        ? extractLinks(liveBody, path)
        : [],
    [liveBody, path]
  )
  const backlinks = useMemo(
    () => (path ? backlinksFor(path, conceptCatalog) : []),
    [conceptCatalog, path]
  )
  const insertConceptLink = (concept: OkfConceptSummary) => {
    const current = liveBody ?? ''
    const link = `[${concept.title}](/${concept.path})`
    const next = `${current.replace(/\s*$/, '')}\n\n${link}\n`
    setLiveBody(next)
    setHasLocalChanges(true)
    setBodyRevision((revision) => revision + 1)
    setMetadata((currentMetadata) => ({
      ...currentMetadata,
      timestamp: new Date().toISOString(),
    }))
  }

  if (!path) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Select a concept, or create a new one.
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
        <p className="text-muted-foreground text-sm">Loadingâ€¦</p>
      </div>
    )
  }

  const displayPath = path
  const reserved = isReservedPath(path)
  const fallbackTitle = deriveTitleFromPath(path)

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor
          fileKey={loaded.path}
          contentRevision={bodyRevision}
          initialMarkdown={liveBody ?? loaded.body}
          documentHeader={
            !reserved ? (
              <NoteMeta
                metadata={metadata}
                fallbackTitle={fallbackTitle}
                onMetadataChange={(next) => {
                  setMetadata(next)
                  setHasLocalChanges(true)
                }}
                links={links}
                backlinks={backlinks}
                currentPath={displayPath}
                conceptCatalog={conceptCatalog}
                onInsertConceptLink={insertConceptLink}
                isPinned={isPinned}
                onTogglePin={() => onTogglePin(displayPath)}
              />
            ) : null
          }
          onChange={(body) => {
            setLiveBody(body)
            setHasLocalChanges(true)
            if (!reserved) {
              setMetadata((current) => ({
                ...current,
                timestamp: new Date().toISOString(),
              }))
            }
          }}
        />
      </div>
      <StatusBar
        status={status}
        path={displayPath}
        branch={branch}
        words={words}
        savedAt={savedAt}
        reserved={reserved}
        okfIssues={okfIssues}
        linkGraphOpen={linkGraphOpen}
        onToggleLinkGraph={onToggleLinkGraph}
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
  reserved,
  okfIssues,
  linkGraphOpen,
  onToggleLinkGraph,
}: {
  status: SyncStatus
  path: string
  branch: string
  words: number
  savedAt: number | null
  reserved: boolean
  okfIssues: OkfIssue[]
  linkGraphOpen: boolean
  onToggleLinkGraph?: () => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const compactLevel = useCompactStatusBar(barRef)
  const hideTime = compactLevel >= 2
  const hideWords = compactLevel >= 1
  const hidePath = compactLevel >= 3

  return (
    <div
      ref={barRef}
      className="border-border bg-sidebar text-muted-foreground relative z-40 flex min-w-0 items-center overflow-hidden border-t px-3 py-1.5 text-[11px] sm:px-4"
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2 overflow-hidden sm:gap-3">
        <SavedPill status={status} />
        {!hideTime && (
          <span className="font-mono text-[10px]">{formatRelative(savedAt)}</span>
        )}
      </div>
      {!hidePath && (
        <div className="flex min-w-0 flex-1 justify-center px-2 sm:px-4">
          <span className="truncate font-mono text-[10px]">{path}</span>
        </div>
      )}
      <div className="flex min-w-0 shrink items-center justify-end gap-2 overflow-hidden sm:gap-3">
        <span className="flex min-w-0 items-center gap-1 font-mono text-[10px]">
          <GitBranch className="size-3" />
          <span className="truncate">{branch || '…'}</span>
        </span>
        {!hideWords && (
          <>
            <span className="text-border">·</span>
            <span className="shrink-0 font-mono text-[10px]">{words} words</span>
          </>
        )}
        {onToggleLinkGraph && (
          <>
            <span className="text-border">·</span>
            <button
              type="button"
              onClick={onToggleLinkGraph}
              aria-pressed={linkGraphOpen}
              aria-label={linkGraphOpen ? 'Hide concept link map' : 'Open concept link map'}
              className={cn(
                'hover:bg-accent inline-flex h-6 shrink-0 items-center gap-1 rounded px-1.5 font-mono text-[10px] font-medium uppercase transition',
                linkGraphOpen ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Network className="size-3" />
              <span className={cn(compactLevel >= 2 && 'sr-only')}>
                {linkGraphOpen ? 'Hide map' : 'Link map'}
              </span>
            </button>
          </>
        )}
        <span className="text-border">·</span>
        <OkfStatusIndicator reserved={reserved} issues={okfIssues} />
      </div>
    </div>
  )
}

function OkfStatusIndicator({
  reserved,
  issues,
}: {
  reserved: boolean
  issues: OkfIssue[]
}) {
  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  const conformant = errors.length === 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={conformant ? 'OKF compliant' : 'OKF not compliant'}
          className={cn(
            'hover:bg-accent inline-flex h-6 shrink-0 items-center gap-1 rounded px-1.5 font-mono text-[10px] font-medium uppercase transition',
            conformant ? 'text-good' : 'text-destructive'
          )}
        >
          {conformant ? (
            <CircleCheck className="size-3" />
          ) : (
            <CircleAlert className="size-3" />
          )}
          OKF
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80">
        <div className="flex items-start gap-2">
          {conformant ? (
            <CircleCheck className="text-good mt-0.5 size-4 shrink-0" />
          ) : (
            <CircleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {conformant ? 'OKF v0.1 compliant' : 'Not OKF compliant'}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {reserved
                ? 'This is a managed OKF document. Caedora regenerates indexes and maintains chronological logs.'
                : conformant
                  ? 'This concept has parseable YAML frontmatter and a non-empty type.'
                  : 'Caedora will not save this concept until the blocking format errors are fixed.'}
            </p>
          </div>
        </div>
        {issues.length > 0 && (
          <ul className="mt-3 space-y-2 border-t pt-3">
            {[...errors, ...warnings].map((issue, index) => (
              <li key={`${issue.code}-${index}`} className="text-xs leading-relaxed">
                <span
                  className={cn(
                    'font-medium',
                    issue.severity === 'error'
                      ? 'text-destructive'
                      : 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  {issue.severity === 'error' ? 'Error' : 'Warning'}:
                </span>{' '}
                <span className="text-muted-foreground">{issue.message}</span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
function useCompactStatusBar(ref: React.RefObject<HTMLDivElement | null>) {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const update = () => {
      const width = element.getBoundingClientRect().width
      if (width < 360) setLevel(3)
      else if (width < 460) setLevel(2)
      else if (width < 620) setLevel(1)
      else setLevel(0)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return level
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
  if (status === 'unsaved') {
    return (
      <span className={cn(base, 'border-amber-500/40 text-amber-600 dark:text-amber-400')}>
        <CircleDot className="size-2.5" />
        Unsaved
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
