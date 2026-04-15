'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  Plus,
  Search,
  Settings,
  GitBranch,
  ChevronRight,
  FolderOpen,
  LogOut,
  Loader2,
  AlertCircle,
  Lock,
  File,
  RefreshCw,
} from 'lucide-react'
import {
  getUser,
  listRepos,
  getContents,
  type GitHubUser,
  type GitHubRepo,
  type GitHubContent,
} from '@/lib/github'

const TOKEN_KEY = 'pmd_github_token'
const REPO_KEY = 'pmd_github_repo'

export default function VaultPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [user, setUser] = useState<GitHubUser | null>(null)
  // null = not in repo-picker mode, array = show picker
  const [repos, setRepos] = useState<GitHubRepo[] | null>(null)
  const [selectedRepo, setSelectedRepo] = useState('')
  const [contents, setContents] = useState<GitHubContent[]>([])
  const [path, setPath] = useState('')

  const disconnect = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REPO_KEY)
    router.push('/connect')
  }, [router])

  useEffect(() => {
    const tok = localStorage.getItem(TOKEN_KEY)
    if (!tok) {
      router.replace('/connect')
      return
    }
    setToken(tok)
    const repo = localStorage.getItem(REPO_KEY)

    ;(async () => {
      try {
        const u = await getUser(tok)
        setUser(u)
        if (repo) {
          const items = await getContents(tok, repo)
          setSelectedRepo(repo)
          setContents(items)
        } else {
          const r = await listRepos(tok)
          setRepos(r)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to connect to GitHub')
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  const pickRepo = useCallback(
    async (repo: GitHubRepo) => {
      setLoading(true)
      setError(null)
      localStorage.setItem(REPO_KEY, repo.full_name)
      try {
        const items = await getContents(token, repo.full_name)
        setSelectedRepo(repo.full_name)
        setContents(items)
        setPath('')
        setRepos(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load repository')
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  const navigate = useCallback(
    async (item: GitHubContent) => {
      if (item.type !== 'dir') return
      setLoading(true)
      try {
        const items = await getContents(token, selectedRepo, item.path)
        setContents(items)
        setPath(item.path)
      } catch {
        // keep current view on nav error
      } finally {
        setLoading(false)
      }
    },
    [token, selectedRepo]
  )

  const goUp = useCallback(async () => {
    const parts = path.split('/')
    parts.pop()
    const parent = parts.join('/')
    setLoading(true)
    try {
      const items = await getContents(token, selectedRepo, parent)
      setContents(items)
      setPath(parent)
    } catch {
      // keep current view on error
    } finally {
      setLoading(false)
    }
  }, [token, selectedRepo, path])

  const changeRepo = useCallback(async () => {
    localStorage.removeItem(REPO_KEY)
    setSelectedRepo('')
    setPath('')
    setContents([])
    setLoading(true)
    try {
      const r = await listRepos(token)
      setRepos(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list repos')
    } finally {
      setLoading(false)
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading vault…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-6">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={disconnect}>
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
            <Button
              onClick={() => {
                setError(null)
                setLoading(true)
                window.location.reload()
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (repos !== null) {
    return (
      <RepoPicker
        user={user!}
        repos={repos}
        onPick={pickRepo}
        onDisconnect={disconnect}
      />
    )
  }

  return (
    <VaultLayout
      user={user!}
      repo={selectedRepo}
      contents={contents}
      path={path}
      onNavigate={navigate}
      onGoUp={goUp}
      onDisconnect={disconnect}
      onChangeRepo={changeRepo}
    />
  )
}

// ─── Repo Picker ─────────────────────────────────────────────────────────────

function RepoPicker({
  user,
  repos,
  onPick,
  onDisconnect,
}: {
  user: GitHubUser
  repos: GitHubRepo[]
  onPick: (repo: GitHubRepo) => void
  onDisconnect: () => void
}) {
  return (
    <div className="min-h-screen bg-background font-[family-name:var(--font-geist-sans)]">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="font-bold tracking-tight">personal-md</span>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="ghost" size="sm" onClick={onDisconnect}>
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-1">Signed in as @{user.login}</p>
          <h1 className="text-2xl font-bold">Select your vault repo</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Choose the GitHub repository that contains your personal markdown files.
          </p>
        </div>

        <div className="space-y-2">
          {repos.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No repositories found.{' '}
              <a
                href="https://github.com/new"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                Create one on GitHub
              </a>
              .
            </p>
          )}
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onPick(repo)}
              className="w-full text-left flex items-center justify-between p-4 rounded-lg border hover:bg-accent hover:border-foreground/20 transition-colors group"
            >
              <div className="flex items-center gap-3">
                {repo.private ? (
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">{repo.name}</p>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {repo.description}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

// ─── Vault Layout ─────────────────────────────────────────────────────────────

function VaultLayout({
  user,
  repo,
  contents,
  path,
  onNavigate,
  onGoUp,
  onDisconnect,
  onChangeRepo,
}: {
  user: GitHubUser
  repo: string
  contents: GitHubContent[]
  path: string
  onNavigate: (item: GitHubContent) => void
  onGoUp: () => void
  onDisconnect: () => void
  onChangeRepo: () => void
}) {
  const repoName = repo.split('/')[1] ?? repo
  const pathParts = path ? path.split('/') : []
  const dirs = contents.filter((c) => c.type === 'dir')
  const mdFiles = contents.filter((c) => c.type === 'file' && c.name.endsWith('.md'))
  const otherFiles = contents.filter((c) => c.type === 'file' && !c.name.endsWith('.md'))

  return (
    <div className="min-h-screen bg-background flex flex-col font-[family-name:var(--font-geist-sans)]">
      {/* Top bar */}
      <header className="border-b shrink-0">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-1 text-sm min-w-0">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="font-semibold">personal-md</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <button
              onClick={onChangeRepo}
              className="text-muted-foreground hover:text-foreground transition-colors truncate"
            >
              {repoName}
            </button>
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">{part}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-4">
            <span className="text-xs text-muted-foreground hidden sm:block mr-2">
              @{user.login}
            </span>
            <ModeToggle />
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDisconnect}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r flex flex-col shrink-0">
          <div className="p-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-muted-foreground"
              size="sm"
            >
              <Search className="h-3.5 w-3.5" />
              Search notes…
            </Button>
          </div>
          <Separator />
          <div className="flex-1 overflow-auto p-3">
            <nav className="space-y-0.5">
              {path && (
                <button
                  onClick={onGoUp}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors w-full text-muted-foreground"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>..</span>
                </button>
              )}
              {dirs.map((dir) => (
                <button
                  key={dir.sha}
                  onClick={() => onNavigate(dir)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{dir.name}</span>
                </button>
              ))}
              {mdFiles.map((file) => (
                <button
                  key={file.sha}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
              {otherFiles.map((file) => (
                <button
                  key={file.sha}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left text-muted-foreground"
                >
                  <File className="h-3.5 w-3.5" />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </nav>
          </div>
          <Separator />
          <div className="p-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <GitBranch className="h-3 w-3 shrink-0" />
            <span className="truncate">{repo}</span>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold">
                  {path ? (path.split('/').pop() ?? 'folder') : 'Your vault'}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {contents.length} item{contents.length !== 1 ? 's' : ''}
                  {path && (
                    <>
                      {' · '}
                      <button
                        onClick={onGoUp}
                        className="hover:text-foreground transition-colors underline underline-offset-2"
                      >
                        back
                      </button>
                    </>
                  )}
                </p>
              </div>
              <Button>
                <Plus className="h-4 w-4" />
                New note
              </Button>
            </div>

            {contents.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">This folder is empty</p>
                <p className="text-xs mt-1">Create your first note to get started</p>
              </div>
            )}

            <div className="space-y-1">
              {dirs.map((dir) => (
                <button
                  key={dir.sha}
                  onClick={() => onNavigate(dir)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{dir.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground" />
                </button>
              ))}
              {mdFiles.map((file) => (
                <button
                  key={file.sha}
                  className="flex items-center p-3 rounded-lg hover:bg-accent transition-colors w-full text-left"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mr-3" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.name.replace(/\.md$/, '')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{file.path}</p>
                  </div>
                </button>
              ))}
              {otherFiles.map((file) => (
                <div
                  key={file.sha}
                  className="flex items-center p-3 rounded-lg text-muted-foreground"
                >
                  <File className="h-4 w-4 shrink-0 mr-3" />
                  <span className="text-sm truncate">{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
