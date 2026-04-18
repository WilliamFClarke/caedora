'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from './sidebar'
import { EditorPane } from './editor-pane'
import { useVault } from '@/lib/vault-context'
import { listFilesRecursive } from '@/lib/storage'
import { seedEmptyVault } from '@/lib/vault-create'
import { usePinned } from '@/hooks/use-pinned'
import type { FileEntry } from '@/lib/types'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

interface VaultShellProps {
  /** Path selected from the URL (vault/[...path]). Null for /vault. */
  initialPath: string | null
}

export function VaultShell({ initialPath }: VaultShellProps) {
  const router = useRouter()
  const { provider, status } = useVault()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [selected, setSelected] = useState<string | null>(initialPath)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [virtualFolders, setVirtualFolders] = useState<Set<string>>(new Set())
  const { pinned, toggle: togglePin, rename: renamePinned, remove: removePinned } = usePinned()
  const didAutoSelect = useRef(false)
  const didAutoSeed = useRef(false)
  const initialPathRef = useRef(initialPath)
  initialPathRef.current = initialPath

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
    if (status.state === 'idle' || status.state === 'permission-required') {
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

      // First-open seed: if the repo/folder has no README at all, treat it
      // as a pre-personal-md repo and seed welcome.md + SKILL.md so the user
      // gets the same out-of-the-box state Create gives them. Runs once per
      // session so a manual delete of the README afterwards won't re-seed.
      const hasReadme = all.some(
        (e) => e.type === 'file' && /^readme(\.|$)/i.test(e.name)
      )
      if (!hasReadme && !didAutoSeed.current) {
        didAutoSeed.current = true
        const seeded = await seedEmptyVault(provider)
        if (seeded.length > 0) {
          all = await listFilesRecursive(provider)
        }
      }

      const mdEntries = all.filter((e) => e.type === 'dir' || e.name.endsWith('.md'))
      setEntries((prev) => (sameEntries(prev, mdEntries) ? prev : mdEntries))
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
        const firstFile = mdEntries.find((e) => e.type === 'file')
        if (firstFile) {
          didAutoSelect.current = true
          setSelected(firstFile.path)
          syncUrl(firstFile.path, 'replace')
        }
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load notes')
    }
  }, [provider, syncUrl])

  useEffect(() => {
    void refreshEntries()
  }, [refreshEntries])

  const combinedEntries = useMemo(() => {
    if (virtualFolders.size === 0) return entries
    const existing = new Set(entries.filter((e) => e.type === 'dir').map((e) => e.path))
    const extras: FileEntry[] = []
    for (const path of virtualFolders) {
      if (existing.has(path)) continue
      extras.push({ path, name: path.split('/').pop() ?? path, type: 'dir' })
    }
    return [...entries, ...extras]
  }, [entries, virtualFolders])

  const onSelect = useCallback(
    (path: string) => {
      setSelected(path)
      syncUrl(path)
    },
    [syncUrl]
  )

  const onCreateFile = useCallback(
    async (parent: string, name: string) => {
      if (!provider) return
      const fileName = name.endsWith('.md') ? name : `${name}.md`
      const fullPath = parent ? `${parent}/${fileName}` : fileName
      const all = await listFilesRecursive(provider)
      if (all.some((e) => e.path === fullPath)) {
        throw new Error('A note with that name already exists.')
      }
      const display = fileName.replace(/\.md$/, '')
      await provider.writeFile(fullPath, `# ${display}\n\n`)
      // Optimistic: show the new file in the sidebar and open it immediately
      setEntries((prev) =>
        prev.some((e) => e.path === fullPath)
          ? prev
          : [...prev, { path: fullPath, name: fileName, type: 'file' }]
      )
      setSelected(fullPath)
      syncUrl(fullPath)
      if (!provider.writesAreCommits) {
        await provider.commit(`Create ${fullPath}`, [fullPath])
      }
      void refreshEntries()
    },
    [provider, refreshEntries, syncUrl]
  )

  const onCreateFolder = useCallback((parent: string, name: string) => {
    const fullPath = parent ? `${parent}/${name}` : name
    setVirtualFolders((prev) => new Set(prev).add(fullPath))
  }, [])

  const onRenamePath = useCallback(
    async (from: string, to: string) => {
      if (!provider) return
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
        return
      }
      await provider.renamePath(from, to)
      renamePinned(from, to)
      if (!provider.writesAreCommits) {
        await provider.commit(`Rename ${from} to ${to}`, [to])
      }
      if (selected === from) {
        setSelected(to)
        syncUrl(to, 'replace')
      } else if (selected && selected.startsWith(`${from}/`)) {
        const newSelected = `${to}${selected.slice(from.length)}`
        setSelected(newSelected)
        syncUrl(newSelected, 'replace')
      }
      await refreshEntries()
    },
    [provider, virtualFolders, selected, refreshEntries, syncUrl, renamePinned]
  )

  const onDeletePath = useCallback(
    async (path: string) => {
      if (!provider) return
      if (virtualFolders.has(path)) {
        // Virtual folder — just remove from state
        setVirtualFolders((prev) => {
          const next = new Set<string>()
          for (const v of prev) {
            if (v !== path && !v.startsWith(`${path}/`)) next.add(v)
          }
          return next
        })
        return
      }
      await provider.deletePath(path)
      removePinned(path)
      if (!provider.writesAreCommits) {
        await provider.commit(`Delete ${path}`, [])
      }
      if (selected === path || selected?.startsWith(`${path}/`)) {
        setSelected(null)
        syncUrl(null, 'replace')
      }
      await refreshEntries()
    },
    [provider, virtualFolders, selected, refreshEntries, syncUrl, removePinned]
  )

  const breadcrumbSegments = useMemo(() => {
    if (!selected) return []
    const parts = selected.split('/')
    return parts.map((part, i) => ({
      name: i === parts.length - 1 && part.endsWith('.md') ? part.slice(0, -3) : part,
      path: parts.slice(0, i + 1).join('/'),
      isLast: i === parts.length - 1,
    }))
  }, [selected])

  if (status.state !== 'ready' || !provider) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading your vault…</p>
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
        onRenamePath={onRenamePath}
        onDeletePath={onDeletePath}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                  vault
                </span>
              </BreadcrumbItem>
              {breadcrumbSegments.length === 0 ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Home</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                breadcrumbSegments.map((seg) => (
                  <div key={seg.path} className="flex items-center gap-1.5 sm:gap-2.5">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {seg.isLast ? (
                        <BreadcrumbPage>{seg.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            const firstFile = entries.find(
                              (x) => x.type === 'file' && x.path.startsWith(`${seg.path}/`)
                            )
                            if (firstFile) onSelect(firstFile.path)
                          }}
                        >
                          {seg.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 overflow-hidden">
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
              isPinned={selected ? pinned.has(selected) : false}
              onTogglePin={togglePin}
              onRename={onRenamePath}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function sameEntries(a: FileEntry[], b: FileEntry[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].path !== b[i].path || a[i].type !== b[i].type) return false
  }
  return true
}

function ancestors(path: string): string[] {
  const parts = path.split('/')
  const out: string[] = []
  for (let i = 1; i < parts.length; i++) {
    out.push(parts.slice(0, i).join('/'))
  }
  return out
}
