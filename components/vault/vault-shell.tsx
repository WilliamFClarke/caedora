'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from './sidebar'
import { EditorPane } from './editor-pane'
import { AssistantSidebarLoader } from '@/components/assistant/assistant-sidebar-loader'
import { SettingsDialog } from '@/components/settings-dialog'
import { useVault } from '@/lib/vault-context'
import { listFilesRecursive } from '@/lib/storage'
import { getActiveVaultId } from '@/lib/storage/idb'
import { seedEmptyBundle, WELCOME_PATH } from '@/lib/vault-create'
import { rebuildBundleIndexes, isLockedPath } from '@/lib/vault-index'
import {
  combine,
  createConceptFrontmatter,
  slugifyFilename,
} from '@/lib/frontmatter'
import {
  isConceptPath,
  loadConceptCatalog,
  validateBundle,
  type OkfBundleReport,
  type OkfConceptSummary,
} from '@/lib/okf'
import { appendBundleLog } from '@/lib/bundle-log'
import { usePinned } from '@/hooks/use-pinned'
import { useFolderAppearance } from '@/hooks/use-folder-appearance'
import type { FolderAppearance } from '@/lib/folder-appearance'
import type { FileEntry, VaultProvider } from '@/lib/types'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

interface VaultShellProps {
  /** Path selected from the URL (vault/[...path]). Null for /vault. */
  initialPath: string | null
}

export function VaultShell({ initialPath }: VaultShellProps) {
  const router = useRouter()
  const { provider, status } = useVault()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [pendingEntries, setPendingEntries] = useState<Record<string, FileEntry>>({})
  const [selected, setSelected] = useState<string | null>(initialPath)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [virtualFolders, setVirtualFolders] = useState<Set<string>>(new Set())
  const [seeding, setSeeding] = useState(false)
  const [syncNonce, setSyncNonce] = useState(0)
  const [activeVaultId, setActiveVaultIdState] = useState<string | null>(null)
  const [assistantSettingsOpen, setAssistantSettingsOpen] = useState(false)
  const [conceptCatalog, setConceptCatalog] = useState<Record<string, OkfConceptSummary>>({})
  const [bundleReport, setBundleReport] = useState<OkfBundleReport | null>(null)
  const { pinned, toggle: togglePin, rename: renamePinned, remove: removePinned } = usePinned()
  const {
    folderAppearances,
    setFolderAppearance,
    setManyFolderAppearances,
    renameFolderAppearance,
    removeFolderAppearance,
  } = useFolderAppearance(activeVaultId)
  const didAutoSelect = useRef(false)
  const didAutoSeed = useRef(false)
  const initialPathRef = useRef(initialPath)
  initialPathRef.current = initialPath
  // Holds the editor's saveNow fn so Sync can flush unsaved changes first.
  const editorSaveRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    void getActiveVaultId().then(setActiveVaultIdState)
  }, [provider])

  // Update the URL without triggering a Next.js route transition. router.push
  // would refetch the RSC for /vault/[...path], painting an empty frame between
  // the old and new trees — the "black flicker" on file switch. The URL is
  // just a bookmark for `selected`; client state drives the UI.
  const syncUrl = useCallback((path: string | null, mode: 'push' | 'replace' = 'push') => {
    if (typeof window === 'undefined') return
    const url = path ? `/vault/${path}` : '/vault'
    if (window.location.pathname === url) return
    if (mode === 'replace') window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
  }, [])

  useEffect(() => {
    if (status.state === 'idle' || status.state === 'permission-required' || status.state === 'error') {
      router.replace('/')
    }
  }, [status.state, router])

  useEffect(() => {
    setSelected(initialPath)
  }, [initialPath])

  // Browser back/forward: re-derive `selected` from the URL without routing.
  useEffect(() => {
    const onPop = () => {
      const { pathname } = window.location
      if (!pathname.startsWith('/vault')) return
      const rest = pathname.slice('/vault'.length).replace(/^\//, '')
      setSelected(rest ? decodeURIComponent(rest) : null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const refreshEntries = useCallback(async () => {
    if (!provider) return
    try {
      let all = await listFilesRecursive(provider)

      // First-open seed: an empty folder or repository gets the same minimal
      // welcome concept and generated root index as the Create flow.
      const hasWelcome = all.some(
        (e) =>
          e.type === 'file' &&
          (/^readme(\.|$)/i.test(e.name) || /^welcome(-[a-z-]+)?\.md$/i.test(e.name))
      )
      if (!hasWelcome && !didAutoSeed.current) {
        didAutoSeed.current = true
        setSeeding(true)
        try {
          const seeded = await seedEmptyBundle(provider)
          if (seeded.length > 0) {
            // GitHub's Contents API can lag a beat between a PUT and the
            // next listing reflecting it. Poll until welcome.md is visible
            // (or give up after ~5s) so the UI doesn't flash
            // an empty sidebar.
            all = await waitForSeedVisible(provider, [WELCOME_PATH])
          }
        } finally {
          setSeeding(false)
        }
      }

      const mdEntries = all.filter((e) => e.type === 'dir' || e.name.endsWith('.md'))
      setEntries((prev) => (sameEntries(prev, mdEntries) ? prev : mdEntries))
      setPendingEntries((prev) => pruneVisiblePending(prev, mdEntries))
      setLoadError(null)

      // Prune virtual folders that now exist as real paths
      setVirtualFolders((prev) => {
        if (prev.size === 0) return prev
        const realPaths = new Set(all.filter((e) => e.type === 'dir').map((e) => e.path))
        const fileFolders = new Set(
          all.filter((e) => e.type === 'file').flatMap((e) => ancestors(e.path))
        )
        const next = new Set<string>()
        for (const v of prev) {
          if (!realPaths.has(v) && !fileFolders.has(v)) next.add(v)
        }
        return next
      })

      if (!initialPathRef.current && !didAutoSelect.current) {
        const firstFile =
          mdEntries.find((e) => e.path === WELCOME_PATH) ??
          mdEntries.find((e) => e.type === 'file' && isConceptPath(e.path))
        if (firstFile) {
          didAutoSelect.current = true
          setSelected(firstFile.path)
          syncUrl(firstFile.path, 'replace')
        }
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load concepts')
    }
  }, [provider, syncUrl])

  useEffect(() => {
    void refreshEntries()
  }, [refreshEntries])

  useEffect(() => {
    if (!provider || entries.length === 0) {
      setConceptCatalog({})
      setBundleReport(null)
      return
    }
    let cancelled = false
    void Promise.all([
      loadConceptCatalog(provider, entries),
      validateBundle(provider, entries),
    ]).then(([catalog, report]) => {
      if (cancelled) return
      setConceptCatalog(catalog)
      setBundleReport(report)
    })
    return () => {
      cancelled = true
    }
  }, [provider, entries, syncNonce])

  // ── Background auto-refresh ───────────────────────────────────────────────
  // Poll to pick up external changes (other devices, direct GitHub edits).
  // Gated on tab visibility so background tabs don't hammer the API.
  // GitHub: 30 s (each refresh walks the tree — one API call per folder).
  // Local: 10 s (FSAA reads are cheap and instant).
  const isGitHub = status.state === 'ready' && status.providerType === 'github'
  const pollMs = isGitHub ? 30_000 : 10_000

  useEffect(() => {
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshEntries()
    }, pollMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshEntries()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshEntries, pollMs])

  // ── Auto index ───────────────────────────────────────────────────────────
  // Rebuild index.md whenever the file list changes. Debounced so rapid
  // creates/deletes coalesce into one rebuild. index.md itself changing
  // doesn't trigger a re-render (sameEntries ignores it once it's present).
  const indexRebuildTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!provider || entries.length === 0) return
    if (indexRebuildTimer.current) clearTimeout(indexRebuildTimer.current)
    indexRebuildTimer.current = setTimeout(() => {
      void rebuildBundleIndexes(provider, entries)
    }, 3_000)
    return () => {
      if (indexRebuildTimer.current) clearTimeout(indexRebuildTimer.current)
    }
  }, [provider, entries])

  const combinedEntries = useMemo(() => {
    const byPath = new Map(entries.map((entry) => [entry.path, entry]))
    const existing = new Set(entries.filter((e) => e.type === 'dir').map((e) => e.path))
    for (const path of virtualFolders) {
      if (existing.has(path)) continue
      byPath.set(path, { path, name: path.split('/').pop() ?? path, type: 'dir' })
    }
    for (const [path, entry] of Object.entries(pendingEntries)) {
      if (!byPath.has(path)) byPath.set(path, entry)
    }
    return [...byPath.values()]
  }, [entries, pendingEntries, virtualFolders])

  const onSelect = useCallback(
    (path: string) => {
      setSelected(path)
      syncUrl(path)
    },
    [syncUrl]
  )

  const onCreateFile = useCallback(
    async (
      parent: string,
      name: string,
      metadata: { type: string; description: string }
    ) => {
      if (!provider) return
      const display = name.replace(/\.md$/i, '').trim() || 'Untitled'
      const fileName = `${slugifyFilename(display)}.md`
      const fullPath = parent ? `${parent}/${fileName}` : fileName
      const all = await listFilesRecursive(provider)
      if (all.some((e) => e.path === fullPath)) {
        throw new Error('A concept with that path already exists.')
      }
      const content = combine(
        createConceptFrontmatter(display, metadata.type, {
          description: metadata.description,
        }),
        '# Notes\n\n'
      )
      await provider.writeFile(fullPath, content)
      if (!provider.writesAreCommits) {
        await provider.commit(`Create ${fullPath}`, [fullPath])
      }
      await appendBundleLog(
        provider,
        'Creation',
        `Created [${display}](/${fullPath}).`
      )
      // Optimistic: show the new file immediately. Don't call refreshEntries
      // here — for GitHub the API lags and a stale listing would overwrite this.
      // Polling reconciles within 10–30 s.
      setPendingEntries((prev) => removeExactPendingEntries(prev, [fullPath]))
      setEntries((prev) => mergeEntries(prev, entriesForPaths([fullPath])))
      setSelected(fullPath)
      syncUrl(fullPath)
    },
    [provider, syncUrl]
  )

  const onCreateFolder = useCallback(
    (parent: string, name: string, appearance: FolderAppearance) => {
      const slug = slugifyFilename(name)
      const fullPath = parent ? `${parent}/${slug}` : slug
      setVirtualFolders((prev) => new Set(prev).add(fullPath))
      setFolderAppearance(fullPath, appearance)
    },
    [setFolderAppearance]
  )

  const onTemplateImported = useCallback((paths: string[]) => {
    if (paths.length === 0) return
    setPendingEntries((prev) => ({ ...pendingEntriesForPaths(paths), ...prev }))
  }, [])

  const onTemplateImportFailed = useCallback((paths: string[]) => {
    setPendingEntries((prev) => removeExactPendingEntries(prev, paths))
  }, [])

  const onTemplateImportSettled = useCallback((paths: string[]) => {
    if (paths.length === 0) return
    setPendingEntries((prev) => removeExactPendingEntries(prev, paths))
    setEntries((prev) => mergeEntries(prev, entriesForPaths(paths)))
  }, [])

  const onRenamePath = useCallback(
    async (from: string, to: string) => {
      if (!provider) return
      if (isLockedPath(from)) {
        throw new Error(`${from} is maintained by Caedora and can't be renamed or moved.`)
      }
      // Slugify just the final segment of the destination, keeping parent
      // folders untouched. Renames of folder paths also get a clean slug.
      const parts = to.split('/')
      const last = parts[parts.length - 1]
      const isMd = /\.md$/i.test(last)
      const stem = isMd ? last.slice(0, -3) : last
      parts[parts.length - 1] = `${slugifyFilename(stem)}${isMd ? '.md' : ''}`
      to = parts.join('/')
      if (from === to) return
      // Virtual-folder-only rename: update state, don't hit provider
      if (virtualFolders.has(from)) {
        setVirtualFolders((prev) => {
          const next = new Set<string>()
          for (const v of prev) {
            if (v === from) next.add(to)
            else if (v.startsWith(`${from}/`)) next.add(`${to}${v.slice(from.length)}`)
            else next.add(v)
          }
          return next
        })
        renameFolderAppearance(from, to)
        return
      }
      await provider.renamePath(from, to)
      renamePinned(from, to)
      renameFolderAppearance(from, to)
      setPendingEntries((prev) => renamePendingEntries(prev, from, to))
      if (!provider.writesAreCommits) {
        await provider.commit(`Rename ${from} to ${to}`, [to])
      }
      await appendBundleLog(
        provider,
        'Move',
        `Moved \`${from}\` to [${to.replace(/\.md$/i, '')}](/${to}).`
      )
      // Optimistic: update entries immediately so the sidebar reflects the
      // rename without waiting for a refresh (which may return stale data on
      // GitHub). Polling will reconcile within 10–30 s.
      setEntries((prev) =>
        prev.map((e) => {
          if (e.path === from) return { ...e, path: to, name: to.split('/').pop() ?? to }
          if (e.path.startsWith(`${from}/`)) {
            const newPath = `${to}${e.path.slice(from.length)}`
            return { ...e, path: newPath, name: newPath.split('/').pop() ?? newPath }
          }
          return e
        })
      )
      if (selected === from) {
        setSelected(to)
        syncUrl(to, 'replace')
      } else if (selected && selected.startsWith(`${from}/`)) {
        const newSelected = `${to}${selected.slice(from.length)}`
        setSelected(newSelected)
        syncUrl(newSelected, 'replace')
      }
    },
    [provider, virtualFolders, selected, syncUrl, renamePinned, renameFolderAppearance]
  )

  const onDeletePath = useCallback(
    async (path: string) => {
      if (!provider) return
      if (isLockedPath(path)) {
        throw new Error(`${path} is maintained by Caedora and can't be deleted.`)
      }
      if (virtualFolders.has(path)) {
        // Virtual folder — just remove from state
        setVirtualFolders((prev) => {
          const next = new Set<string>()
          for (const v of prev) {
            if (v !== path && !v.startsWith(`${path}/`)) next.add(v)
          }
          return next
        })
        removeFolderAppearance(path)
        return
      }
      await provider.deletePath(path)
      removePinned(path)
      removeFolderAppearance(path)
      setPendingEntries((prev) => removePendingEntries(prev, path))
      if (!provider.writesAreCommits) {
        await provider.commit(`Delete ${path}`, [])
      }
      await appendBundleLog(provider, 'Deletion', `Deleted \`${path}\`.`)
      // Optimistic: remove from entries immediately; polling reconciles.
      setEntries((prev) =>
        prev.filter((e) => e.path !== path && !e.path.startsWith(`${path}/`))
      )
      if (selected === path || selected?.startsWith(`${path}/`)) {
        setSelected(null)
        syncUrl(null, 'replace')
      }
    },
    [provider, virtualFolders, selected, syncUrl, removePinned, removeFolderAppearance]
  )

  const onSync = useCallback(async () => {
    // Flush any unsaved editor content first (important in manual-sync mode).
    if (editorSaveRef.current) await editorSaveRef.current()
    await refreshEntries()
    // Bump the nonce so EditorPane re-reads the currently-open note from
    // the provider (refreshEntries alone doesn't force a re-read).
    setSyncNonce((n) => n + 1)
  }, [refreshEntries])

  if (status.state !== 'ready' || !provider) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading your bundle...</p>
      </div>
    )
  }

  if (seeding) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <div className="border-muted-foreground/30 border-t-foreground size-6 animate-spin rounded-full border-2" />
        <p className="text-muted-foreground text-sm">
          Setting up your bundle: writing the welcome concept and OKF index...
        </p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar
        entries={combinedEntries}
        selected={selected}
        provider={provider}
        pinned={pinned}
        onTogglePin={togglePin}
        onSelect={onSelect}
        onCreateFile={onCreateFile}
        onCreateFolder={onCreateFolder}
        folderAppearances={folderAppearances}
        onSetFolderAppearance={setFolderAppearance}
        onSetManyFolderAppearances={setManyFolderAppearances}
        onTemplateImported={onTemplateImported}
        onTemplateImportFailed={onTemplateImportFailed}
        onTemplateImportSettled={onTemplateImportSettled}
        onRenamePath={onRenamePath}
        onDeletePath={onDeletePath}
        onSync={onSync}
        conceptCatalog={conceptCatalog}
        bundleReport={bundleReport}
      />
      <SidebarInset className="min-w-0">
        <div className="caedora-vault-workspace relative flex h-full min-w-0 flex-1 overflow-hidden bg-card">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {loadError ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-destructive text-sm">{loadError}</p>
              </div>
            ) : (
              <EditorPane
                provider={provider}
                path={selected}
                lastModified={
                  selected
                    ? entries.find((e) => e.path === selected)?.lastModified
                    : undefined
                }
                syncNonce={syncNonce}
                isPinned={selected ? pinned.has(selected) : false}
                onTogglePin={togglePin}
                onSaveNow={(fn) => { editorSaveRef.current = fn }}
                conceptCatalog={conceptCatalog}
              />
            )}
          </div>
          <AssistantSidebarLoader
            provider={provider}
            currentFilePath={selected}
            onOpenSettings={() => setAssistantSettingsOpen(true)}
          />
        </div>
      </SidebarInset>
      <SettingsDialog
        open={assistantSettingsOpen}
        onOpenChange={setAssistantSettingsOpen}
        initialSection="ai"
      />
    </SidebarProvider>
  )
}

async function waitForSeedVisible(
  provider: VaultProvider,
  expected: string[],
  maxAttempts = 10,
  delayMs = 500
): Promise<FileEntry[]> {
  const need = new Set(expected)
  let latest: FileEntry[] = []
  for (let i = 0; i < maxAttempts; i++) {
    latest = await listFilesRecursive(provider)
    const present = new Set(latest.map((e) => e.path))
    if ([...need].every((p) => present.has(p))) return latest
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return latest
}

function sameEntries(a: FileEntry[], b: FileEntry[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].path !== b[i].path ||
      a[i].type !== b[i].type ||
      a[i].size !== b[i].size ||
      a[i].lastModified !== b[i].lastModified
    ) {
      return false
    }
  }
  return true
}

function pendingEntriesForPaths(paths: string[]): Record<string, FileEntry> {
  const out = entriesForPaths(paths)
  for (const entry of Object.values(out)) {
    entry.pending = true
  }
  return out
}

function entriesForPaths(paths: string[]): Record<string, FileEntry> {
  const out: Record<string, FileEntry> = {}
  for (const path of paths) {
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join('/')
      out[folderPath] = {
        path: folderPath,
        name: parts[i - 1],
        type: 'dir',
      }
    }
    out[path] = {
      path,
      name: parts[parts.length - 1] ?? path,
      type: 'file',
    }
  }
  return out
}

function mergeEntries(current: FileEntry[], incoming: Record<string, FileEntry>): FileEntry[] {
  const byPath = new Map(current.map((entry) => [entry.path, entry]))
  for (const [path, entry] of Object.entries(incoming)) {
    byPath.set(path, entry)
  }
  return [...byPath.values()]
}

function pruneVisiblePending(
  pending: Record<string, FileEntry>,
  visibleEntries: FileEntry[]
): Record<string, FileEntry> {
  const visible = new Set(visibleEntries.map((entry) => entry.path))
  const next: Record<string, FileEntry> = {}
  for (const [path, entry] of Object.entries(pending)) {
    if (!visible.has(path)) next[path] = entry
  }
  return next
}

function renamePendingEntries(
  pending: Record<string, FileEntry>,
  from: string,
  to: string
): Record<string, FileEntry> {
  const next: Record<string, FileEntry> = {}
  for (const [path, entry] of Object.entries(pending)) {
    if (path === from || path.startsWith(`${from}/`)) {
      const newPath = path === from ? to : `${to}${path.slice(from.length)}`
      next[newPath] = {
        ...entry,
        path: newPath,
        name: newPath.split('/').pop() ?? newPath,
      }
    } else {
      next[path] = entry
    }
  }
  return next
}

function removePendingEntries(
  pending: Record<string, FileEntry>,
  path: string
): Record<string, FileEntry> {
  const next: Record<string, FileEntry> = {}
  for (const [entryPath, entry] of Object.entries(pending)) {
    if (entryPath !== path && !entryPath.startsWith(`${path}/`)) {
      next[entryPath] = entry
    }
  }
  return next
}

function removeExactPendingEntries(
  pending: Record<string, FileEntry>,
  paths: string[]
): Record<string, FileEntry> {
  const remove = new Set<string>()
  for (const path of paths) {
    remove.add(path)
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) {
      remove.add(parts.slice(0, i).join('/'))
    }
  }
  const next: Record<string, FileEntry> = {}
  for (const [path, entry] of Object.entries(pending)) {
    if (!remove.has(path)) next[path] = entry
  }
  return next
}

function ancestors(path: string): string[] {
  const parts = path.split('/')
  const out: string[] = []
  for (let i = 1; i < parts.length; i++) {
    out.push(parts.slice(0, i).join('/'))
  }
  return out
}
