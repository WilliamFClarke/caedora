'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { Separator } from '@/components/ui/separator'
import { useVault } from '@/lib/vault-context'
import type { FileEntry } from '@/lib/types'
import {
  FileText,
  Plus,
  Search,
  Settings,
  GitBranch,
  FolderOpen,
  LogOut,
  Loader2,
  AlertCircle,
  RefreshCw,
  File,
} from 'lucide-react'

export default function VaultPage() {
  const router = useRouter()
  const { provider, status, disconnect } = useVault()

  const [files, setFiles] = useState<FileEntry[]>([])
  const [branch, setBranch] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status.state === 'idle') router.replace('/connect')
    if (status.state === 'permission-required') router.replace('/connect')
  }, [status.state, router])

  useEffect(() => {
    if (status.state !== 'ready' || !provider) return
    setLoading(true)
    Promise.all([provider.listFiles(), provider.currentBranch()])
      .then(([f, b]) => { setFiles(f); setBranch(b) })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load vault'))
      .finally(() => setLoading(false))
  }, [provider, status.state])

  const createNote = useCallback(async () => {
    if (!provider) return
    const name = prompt('Note name (without .md):')
    if (!name?.trim()) return
    const path = `${name.trim()}.md`
    try {
      await provider.writeFile(path, `# ${name.trim()}\n`)
      router.push(`/vault/${path}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create note')
    }
  }, [provider, router])

  if (status.state === 'idle' || status.state === 'permission-required') return null

  if (status.state === 'connecting' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading vault…</p>
        </div>
      </div>
    )
  }

  if (status.state === 'error' || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-6">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">
            {status.state === 'error' ? status.error : error}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={disconnect}>
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const dirs = files.filter((f) => f.type === 'dir')
  const mdFiles = files.filter((f) => f.type === 'file' && f.name.endsWith('.md'))
  const recentFiles = [...files]
    .filter((f) => f.type === 'file' && f.lastModified)
    .sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0))
    .slice(0, 8)
  const topDirs = [...new Set(dirs.map((d) => d.name))]
  const noteCount = mdFiles.length

  return (
    <div className="min-h-screen bg-background flex flex-col font-[family-name:var(--font-geist-sans)]">
      <header className="border-b shrink-0">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-1 text-sm min-w-0">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="font-semibold">personal-md</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ModeToggle />
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={disconnect} aria-label="Disconnect vault">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 border-r flex flex-col shrink-0">
          <div className="p-3">
            <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground" size="sm">
              <Search className="h-3.5 w-3.5" />
              Search notes…
            </Button>
          </div>
          <Separator />
          <div className="flex-1 overflow-auto p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folders</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" aria-label="New folder">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <nav className="space-y-0.5">
              {topDirs.map((name) => {
                const count = files.filter((f) => f.path.startsWith(name + '/') && f.type === 'file').length
                return (
                  <Link
                    key={name}
                    href={`/vault?dir=${encodeURIComponent(name)}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{name}</span>
                    </div>
                    {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
                  </Link>
                )
              })}
              {topDirs.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1">No folders yet</p>
              )}
            </nav>
          </div>
          <Separator />
          <div className="p-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <GitBranch className="h-3 w-3 shrink-0" />
            <span className="truncate">{branch || 'local'}</span>
            <span>·</span>
            <span className="text-green-500">local</span>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold">Your vault</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {noteCount} note{noteCount !== 1 ? 's' : ''}
                  {topDirs.length > 0 && ` across ${topDirs.length} folder${topDirs.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Button onClick={createNote}>
                <Plus className="h-4 w-4" />
                New note
              </Button>
            </div>

            {files.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-4 opacity-30" />
                <p className="font-medium mb-1">Your vault is empty</p>
                <p className="text-sm">Create your first note to get started.</p>
              </div>
            )}

            {recentFiles.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Recent notes</p>
                {recentFiles.map((f) => (
                  <Link
                    key={f.path}
                    href={`/vault/${f.path}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {f.name.endsWith('.md')
                        ? <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <File className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.name.replace(/\.md$/, '')}</p>
                        <p className="text-xs text-muted-foreground truncate">{f.path}</p>
                      </div>
                    </div>
                    {f.lastModified && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-4">
                        {relativeTime(f.lastModified)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
