'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useVault } from '@/lib/vault-context'
import { LocalGitProvider } from '@/lib/storage/local-provider'
import { ElectronLocalProvider } from '@/lib/storage/electron-provider'
import {
  BrowserBundleProvider,
  browserStoragePersistence,
  createBrowserBundleId,
  exportBrowserBundle,
  getActiveVaultId,
  loadGitHubAppSession,
  listVaults,
  removeVault,
  saveGitHubAppSession,
} from '@/lib/storage'
import { getDesktopApi } from '@/lib/desktop'
import {
  seedLocalVault,
  isFolderEmpty,
  WELCOME_PATH,
  type VaultTemplate,
} from '@/lib/vault-create'
import { slugifyFilename } from '@/lib/frontmatter'
import { cn } from '@/lib/utils'
import { Database, Folder, Github, Loader2 } from 'lucide-react'
import { SavedVaultList, type StoredVault } from '@/components/vault/saved-vault-list'

type Mode = 'create' | 'open'
type OpenFlow = 'saved' | 'sources' | 'create'

const VAULT_PRESETS: Array<{
  id: VaultTemplate
  title: string
  description: string
}> = [
  {
    id: 'personal',
    title: 'Personal',
    description: 'A home base for priorities, routines, references, and life notes.',
  },
  {
    id: 'work',
    title: 'Work / project',
    description: 'A project hub for outcomes, decisions, risks, and next actions.',
  },
  {
    id: 'blank',
    title: 'Blank',
    description: 'Only the welcome guide and generated indexes.',
  },
]

interface ConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  showSavedVaults?: boolean
}

export function ConnectDialog({ open, onOpenChange, mode, showSavedVaults = true }: ConnectDialogProps) {
  const router = useRouter()
  const { connectToVault, disconnect } = useVault()
  const openDefaultTab =
    typeof window !== 'undefined' &&
    (window.caedoraDesktop || 'showDirectoryPicker' in window)
      ? 'local'
      : 'github'

  const vaultTemplate: VaultTemplate = 'default'
  const [preparing, setPreparing] = useState(false)
  const [openFlow, setOpenFlow] = useState<OpenFlow>(showSavedVaults ? 'saved' : 'sources')
  const [vaults, setVaults] = useState<StoredVault[]>([])
  const [activeVaultId, setActiveVaultIdState] = useState<string | null>(null)
  const [switchingVaultId, setSwitchingVaultId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPreparing(false)
      setOpenFlow(showSavedVaults ? 'saved' : 'sources')
      void refreshVaults()
    }
  }, [open, showSavedVaults])

  async function refreshVaults() {
    const [stored, active] = await Promise.all([listVaults(), getActiveVaultId()])
    setVaults(stored)
    setActiveVaultIdState(active)
  }

  async function openSavedVault(id: string) {
    if (switchingVaultId) return
    setSwitchingVaultId(id)
    setPreparing(true)
    try {
      await connectToVault(id)
      router.push('/vault')
      onOpenChange(false)
    } finally {
      setSwitchingVaultId(null)
      setPreparing(false)
    }
  }

  async function deleteSavedVault(id: string) {
    await removeVault(id)
    if (id === activeVaultId) {
      disconnect()
      router.push('/')
    }
    await refreshVaults()
  }

  async function exportVault(vault: StoredVault) {
    if (!vault.state.browserBundleId) return
    const name = vault.state.browserBundleName ?? 'Browser vault'
    const blob = await exportBrowserBundle(vault.state.browserBundleId, name)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${slugForDownload(name)}.caedora-vault.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function closeAllVaults() {
    disconnect()
    setActiveVaultIdState(null)
    router.push('/')
    onOpenChange(false)
  }

  const effectiveMode: Mode = mode === 'create' || openFlow === 'create' ? 'create' : 'open'
  const showVaultLauncher = effectiveMode === 'open' && openFlow === 'saved'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-[calc(100vw-1rem)] overflow-hidden',
          showVaultLauncher
            ? 'max-h-[calc(100dvh-1rem)] gap-0 p-0 sm:max-w-5xl [&>button]:top-3 [&>button]:right-3'
            : 'max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl'
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {!showVaultLauncher && (
          <DialogHeader>
            <DialogTitle>{effectiveMode === 'create' ? 'Start a new vault' : 'Open an existing vault'}</DialogTitle>
            <DialogDescription>
              {effectiveMode === 'create'
                ? 'Caedora starts in this browser so you can begin immediately. Nothing is stored by us.'
                : 'Reconnect to an OKF knowledge vault you already have.'}
            </DialogDescription>
          </DialogHeader>
        )}

        {effectiveMode === 'create' ? (
          <BrowserPanel
            mode="create"
            onPreparingChange={setPreparing}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <div className={cn('flex min-w-0 flex-col gap-4', !showVaultLauncher && 'mt-2')}>
            {openFlow === 'saved' && (
              <SavedVaultList
                className="rounded-none border-0"
                vaults={vaults}
                activeVaultId={activeVaultId}
                switchingVaultId={switchingVaultId}
                onOpenVault={(id) => void openSavedVault(id)}
                onDeleteVault={(id) => void deleteSavedVault(id)}
                onExportVault={(vault) => void exportVault(vault)}
                onCreateVault={() => setOpenFlow('create')}
                onAddExistingVault={() => setOpenFlow('sources')}
                onCloseAllVaults={() => void closeAllVaults()}
              />
            )}

            {openFlow === 'sources' && (
              <Tabs defaultValue={openDefaultTab} className="min-w-0">
                <TabsList className="grid h-auto w-full min-w-0 grid-cols-2">
                  <TabsTrigger value="local" disabled={preparing} className="min-w-0">
                    <Folder className="mr-1 size-4" />
                    Computer
                  </TabsTrigger>
                  <TabsTrigger value="github" disabled={preparing} className="min-w-0">
                    <Github className="mr-1 size-4" />
                    GitHub
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="local">
                  <LocalPanel
                    mode={mode}
                    vaultTemplate={vaultTemplate}
                    onPreparingChange={setPreparing}
                    onDone={() => onOpenChange(false)}
                  />
                </TabsContent>
                <TabsContent value="github">
                  <GitHubPanel
                    mode={mode}
                    onPreparingChange={setPreparing}
                    onDone={() => onOpenChange(false)}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Local panel ──────────────────────────────────────────────────────────────

type Phase = 'idle' | 'picking' | 'preparing'

function useMountedRef() {
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return mountedRef
}

function LocalPanel({
  mode,
  vaultTemplate,
  onPreparingChange,
  onDone,
}: {
  mode: Mode
  vaultTemplate: VaultTemplate
  onPreparingChange: (preparing: boolean) => void
  onDone: () => void
}) {
  const router = useRouter()
  const { connectLocal, connectDesktopLocal } = useVault()
  const [vaultName, setVaultName] = useState('My Knowledge Vault')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showChromiumWarning, setShowChromiumWarning] = useState(false)

  useEffect(() => {
    setShowChromiumWarning(!getDesktopApi() && !('showDirectoryPicker' in window))
  }, [])

  useEffect(() => {
    onPreparingChange(phase === 'preparing')
  }, [phase, onPreparingChange])

  const folderSlug = slugifyFilename(vaultName)

  async function onPick() {
    setError(null)
    setPhase('picking')
    try {
      const desktop = getDesktopApi()
      if (desktop) {
        if (mode === 'create') {
          const trimmed = vaultName.trim()
          if (!trimmed) {
            setError('Give your vault a name.')
            setPhase('idle')
            return
          }
          const slug = slugifyFilename(trimmed)
          if (!slug || slug === 'untitled') {
            setError('That vault name needs at least one letter or digit.')
            setPhase('idle')
            return
          }
          const parent = await desktop.vault.selectDirectory({
            title: 'Choose parent folder',
          })
          if (!parent) {
            setPhase('idle')
            return
          }
          const root = await desktop.vault.createChildDirectory(parent.path, slug)
          const provider = new ElectronLocalProvider(root.path, root.name)
          await provider.init()
          if (!(await isFolderEmpty(provider))) {
            setError(
              `A folder called "${slug}" already exists here and isn't empty. Pick a different vault name, or open it from the "Open vault" flow.`
            )
            setPhase('idle')
            return
          }
          setPhase('preparing')
          await seedLocalVault(provider, vaultTemplate)
          const connected = await connectDesktopLocal(root)
          if (!connected) {
            setPhase('idle')
            onDone()
            return
          }
          router.push(`/vault/${WELCOME_PATH}`)
        } else {
          const root = await desktop.vault.selectDirectory({
            title: 'Open vault folder',
          })
          if (!root) {
            setPhase('idle')
            return
          }
          const connected = await connectDesktopLocal(root)
          if (!connected) {
            setPhase('idle')
            onDone()
            return
          }
          router.push('/vault')
          onDone()
        }
        return
      }

      if (mode === 'create') {
        // Create flow: pick a PARENT folder, then create/reuse a subfolder
        // named after the user's vault name. This means the user doesn't need
        // to manually create an empty folder first.
        const trimmed = vaultName.trim()
        if (!trimmed) {
          setError('Give your vault a name.')
          setPhase('idle')
          return
        }
        const slug = slugifyFilename(trimmed)
        if (!slug || slug === 'untitled') {
          setError('That vault name needs at least one letter or digit.')
          setPhase('idle')
          return
        }
        const parent = await window.showDirectoryPicker({ mode: 'readwrite' })
        const handle = await parent.getDirectoryHandle(slug, { create: true })
        const provider = new LocalGitProvider(handle)
        await provider.init()
        if (!(await isFolderEmpty(provider))) {
          setError(
            `A folder called "${slug}" already exists here and isn't empty. Pick a different vault name, or open it from the "Open vault" flow.`
          )
          setPhase('idle')
          return
        }
        setPhase('preparing')
        await seedLocalVault(provider, vaultTemplate)
        const connectedHandle = await connectLocal(handle)
        if (!connectedHandle) {
          setError('Could not open the new vault folder.')
          setPhase('idle')
          return
        }
        router.push(`/vault/${WELCOME_PATH}`)
        // Don't close the dialog — the route change unmounts it and prevents a
        // race with the home page's auto-redirect.
      } else {
        // Open flow: pick the vault folder directly (existing behaviour).
        const handle = await connectLocal()
        if (!handle) {
          setPhase('idle')
          return
        }
        router.push('/vault')
        onDone()
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setPhase('idle')
        return
      }
      setError(e instanceof Error ? e.message : 'Could not open folder')
      setPhase('idle')
      if (mode === 'open') onDone()
    }
  }

  const busy = phase !== 'idle'
  const canSubmit = mode === 'open' || (vaultName.trim().length > 0 && folderSlug !== '' && folderSlug !== 'untitled')

  return (
    <div className="flex flex-col gap-3 py-4">
      {mode === 'create' ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vault-name">Vault name</Label>
            <Input
              id="vault-name"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              placeholder="My Knowledge Vault"
              autoComplete="off"
              disabled={busy}
            />
            <p className="text-muted-foreground text-xs">
              A folder named{' '}
              <span className="bg-muted text-foreground rounded px-1 py-0.5 font-mono text-[11px]">
                {folderSlug || 'your-vault'}
              </span>{' '}
              will be created inside the location you pick next.
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            {phase === 'preparing'
              ? 'Preparing your vault - writing OKF indexes, agent guidance, and git history...'
              : 'Pick the parent folder (e.g. Documents). We\'ll create your vault folder inside it.'}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Pick the folder that already contains your knowledge vault.
        </p>
      )}
      <Button onClick={onPick} disabled={busy || !canSubmit} size="lg" className="w-full">
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Folder className="size-4" />
        )}
        {phase === 'preparing'
          ? 'Preparing your vault...'
          : mode === 'create'
            ? 'Choose parent folder'
            : 'Open folder'}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {showChromiumWarning && (
        <p className="text-destructive text-xs">
          Requires a Chromium browser (Chrome, Edge, Arc, Brave).
        </p>
      )}
    </div>
  )
}

// ─── GitHub panel ─────────────────────────────────────────────────────────────

function BrowserPanel({
  mode,
  onPreparingChange,
  onDone,
}: {
  mode: Mode
  onPreparingChange: (preparing: boolean) => void
  onDone: () => void
}) {
  const router = useRouter()
  const { connectBrowserBundle } = useVault()
  const [bundleName, setBundleName] = useState('My Knowledge Vault')
  const [template, setTemplate] = useState<VaultTemplate>('personal')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [persistence, setPersistence] = useState<'unknown' | 'granted' | 'best-effort'>('unknown')
  const [showGitHubGuide, setShowGitHubGuide] = useState(false)

  useEffect(() => {
    onPreparingChange(phase === 'preparing')
  }, [phase, onPreparingChange])

  async function onCreate() {
    setError(null)
    setPhase('preparing')
    try {
      const name = bundleName.trim()
      if (!name) {
        setError('Give your browser vault a name.')
        setPhase('idle')
        return
      }

      const persistenceResult = await browserStoragePersistence()
      setPersistence(persistenceResult.persisted ? 'granted' : 'best-effort')

      const id = createBrowserBundleId()
      const provider = new BrowserBundleProvider(id, name)
      await provider.init()
      await seedLocalVault(provider, template)

      const connected = await connectBrowserBundle({ id, name })
      if (!connected) throw new Error('Could not open the browser vault.')

      router.push(`/vault/${WELCOME_PATH}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create browser vault')
      setPhase('idle')
    }
  }

  const busy = phase !== 'idle'

  return (
    <div className="flex flex-col gap-3 py-4">
      {mode === 'create' ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="browser-bundle-name">Vault name</Label>
            <Input
              id="browser-bundle-name"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              placeholder="My Knowledge Vault"
              autoComplete="off"
              disabled={busy}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Store the full OKF vault inside this browser. It works across modern
            browsers, including Firefox and mobile, and can be exported or moved
            to GitHub later.
          </p>
          <div className="flex flex-col gap-2">
            <Label>Preset</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {VAULT_PRESETS.map((preset) => {
                const selected = template === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTemplate(preset.id)}
                    disabled={busy}
                    className={cn(
                      'rounded-md border p-3 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'hover:bg-accent text-muted-foreground'
                    )}
                    aria-pressed={selected}
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {preset.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed">
                      {preset.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="rounded-md border border-dashed">
            <button
              type="button"
              onClick={() => setShowGitHubGuide((open) => !open)}
              className="hover:bg-accent/60 flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors"
              aria-expanded={showGitHubGuide}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Github className="text-muted-foreground size-4 shrink-0" />
                <span className="text-sm font-medium">Moving to GitHub later</span>
              </span>
              <span className="text-muted-foreground text-xs">
                {showGitHubGuide ? 'Hide' : 'Show'}
              </span>
            </button>
            <div
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
                showGitHubGuide ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="min-h-0 overflow-hidden">
                {showGitHubGuide && (
                  <div className="text-muted-foreground px-3 pb-3 text-xs">
                    <p>
                      Open Settings, use Manage vaults, and export a browser backup before
                      moving devices. The current export is a Caedora JSON backup. A
                      proper OKF folder export for dropping directly into a GitHub repo
                      is planned next.
                    </p>
                    <p className="mt-2">
                      To start GitHub sync today, create an empty private repository on
                      GitHub, then use the GitHub tab and select only that repo.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Browser vaults you have created on this device appear in the saved
          vaults list on the home screen.
        </p>
      )}
      {persistence === 'best-effort' && (
        <p className="text-muted-foreground text-xs">
          Your browser did not grant persistent storage, so the vault remains
          local but may be removed if the browser clears site data.
        </p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {mode === 'create' ? (
        <Button onClick={onCreate} disabled={busy || !bundleName.trim()} size="lg" className="w-full">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
          {busy ? 'Preparing browser vault...' : 'Create browser vault'}
        </Button>
      ) : (
        <Button type="button" variant="secondary" onClick={onDone}>
          Close
        </Button>
      )}
    </div>
  )
}


type GitHubRepoOption = {
  owner: string
  name: string
  fullName: string
  private: boolean
  description: string | null
  updatedAt: string
  defaultBranch: string
}

type GitHubAppResult =
  | {
      ok: true
      accessToken: string
      refreshToken?: string
      expiresAt?: number
      repos: GitHubRepoOption[]
    }
  | { ok: false; error: string }

type GitHubAppSession = {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

function waitForGitHubAppResult(): Promise<GitHubAppResult> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new Error('GitHub authorization timed out. Please try again.'))
    }, 5 * 60 * 1000)

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const data = event.data as Partial<GitHubAppResult> & { type?: string }
      if (data.type !== 'caedora:github-app') return
      window.clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
      resolve(data as GitHubAppResult)
    }

    window.addEventListener('message', onMessage)
  })
}

function GitHubPanel({
  onPreparingChange,
  onDone,
}: {
  mode: Mode
  onPreparingChange: (preparing: boolean) => void
  onDone: () => void
}) {
  const router = useRouter()
  const { connectGitHubApp } = useVault()
  const mountedRef = useMountedRef()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [repos, setRepos] = useState<GitHubRepoOption[]>([])
  const [session, setSession] = useState<GitHubAppSession | null>(null)

  useEffect(() => {
    onPreparingChange(phase === 'preparing')
  }, [phase, onPreparingChange])

  const loadReposFromSession = useCallback(async (savedSession: GitHubAppSession) => {
    setError(null)
    setPhase('preparing')
    try {
      const refreshed = await refreshGitHubSessionIfNeeded(savedSession)
      if (!mountedRef.current) return
      if (!refreshed) {
        setPhase('idle')
        return
      }

      const result = await listReposWithSession(refreshed)
      if (!mountedRef.current) return
      setSession(refreshed)
      setRepos(result)
      setPhase('idle')
    } catch {
      if (!mountedRef.current) return
      setSession(null)
      setRepos([])
      setPhase('idle')
    }
  }, [mountedRef])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const saved = await loadGitHubAppSession()
      if (!alive || !saved) return
      await loadReposFromSession(saved)
    })()
    return () => {
      alive = false
    }
  }, [loadReposFromSession])

  async function onConnectGitHub({ manageAccess = false }: { manageAccess?: boolean } = {}) {
    setError(null)
    setPhase('preparing')
    try {
      const popup = window.open(
        `/api/github/start?mode=open${manageAccess ? '' : '&oauth=1'}`,
        'caedora-github-app',
        'popup,width=720,height=760'
      )
      if (!popup) {
        throw new Error('Allow popups for Caedora, then try connecting GitHub again.')
      }

      const result = await waitForGitHubAppResult()
      if (!mountedRef.current) return
      if (!result.ok) throw new Error(result.error)

      const nextSession = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      }
      await saveGitHubAppSession(nextSession)
      setSession(nextSession)
      setRepos(result.repos)
      setPhase('idle')
    } catch (e) {
      if (!mountedRef.current) return
      setError(e instanceof Error ? e.message : 'Could not connect GitHub')
      setPhase('idle')
    }
  }

  async function openRepo(repo: GitHubRepoOption) {
    if (!session || phase !== 'idle') return
    setError(null)
    setPhase('preparing')
    try {
      const connected = await connectGitHubApp({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        owner: repo.owner,
        repo: repo.name,
      })
      if (!connected) throw new Error('Could not connect to the GitHub vault.')
      router.push('/vault')
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open GitHub vault')
      setPhase('idle')
    }
  }

  const busy = phase !== 'idle'

  return (
    <div className="min-w-0 overflow-hidden py-4">
      {repos.length > 0 && (
        <div className="flex min-w-0 flex-col gap-2">
          <Label>Writable GitHub vault repositories</Label>
          <div className="flex max-h-72 min-w-0 flex-col gap-2 overflow-y-auto overflow-x-hidden rounded-md border p-2">
            {repos.map((repo) => (
              <button
                key={repo.fullName}
                type="button"
                onClick={() => void openRepo(repo)}
                disabled={busy || !session}
                className="hover:bg-accent flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left transition-colors disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {repo.fullName}
                    <Github className="ml-1.5 inline size-3.5 align-[-2px] text-muted-foreground" />
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {repo.private ? 'Private' : 'Public'}{repo.description ? ' - ' + repo.description : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex min-w-0 flex-col gap-2">
        <Button
          type="button"
          onClick={() => void onConnectGitHub()}
          disabled={busy}
          size="lg"
          className="w-full"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />}
          {repos.length > 0 ? 'Refresh available repos' : 'Show GitHub repos'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onConnectGitHub({ manageAccess: true })}
          disabled={busy}
          className="w-full"
        >
          <Github className="size-4" />
          Manage repository access
        </Button>
        <p className="text-muted-foreground text-xs">
          If you already gave Caedora access, show repos will list them without
          changing access. Use manage repository access to add another repo, then choose{' '}
          <span className="text-foreground font-medium">Only select repositories</span>{' '}
          on GitHub.
        </p>
      </div>

      {session && repos.length === 0 && !busy && (
        <p className="text-muted-foreground text-sm">
          Caedora could not see any writable repositories. Reopen GitHub access and select the repository you want Caedora to use.
        </p>
      )}
      {phase === 'preparing' && (
        <p className="text-muted-foreground text-sm">Connecting to GitHub...</p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}

async function refreshGitHubSessionIfNeeded(
  session: GitHubAppSession
): Promise<GitHubAppSession | null> {
  if (!session.refreshToken || !session.expiresAt || session.expiresAt - Date.now() > 60_000) {
    return session
  }

  const response = await fetch('/api/github/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  })

  if (!response.ok) return null
  const data = await response.json() as GitHubAppSession
  const refreshed = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? session.refreshToken,
    expiresAt: data.expiresAt ?? session.expiresAt,
  }
  await saveGitHubAppSession(refreshed)
  return refreshed
}

async function listReposWithSession(session: GitHubAppSession): Promise<GitHubRepoOption[]> {
  const response = await fetch('/api/github/repositories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: session.accessToken }),
  })

  const data = await response.json().catch(() => ({})) as {
    repos?: GitHubRepoOption[]
    error?: string
  }
  if (!response.ok) throw new Error(data.error || 'Could not list GitHub repositories.')
  return data.repos ?? []
}

function slugForDownload(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'caedora-vault'
}
