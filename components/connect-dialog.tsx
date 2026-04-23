'use client'

import { useEffect, useState } from 'react'
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
import {
  seedLocalVault,
  isFolderEmpty,
  WELCOME_PATH,
  WELCOME_MARKDOWN,
  SKILL_PATH,
  SKILL_MARKDOWN,
  pinInitial,
  templateFilesFor,
  type VaultTemplate,
} from '@/lib/vault-create'
import { cn } from '@/lib/utils'
import { BriefcaseBusiness, Folder, Github, Loader2, User } from 'lucide-react'

type Mode = 'create' | 'open'

interface ConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
}

export function ConnectDialog({ open, onOpenChange, mode }: ConnectDialogProps) {
  const defaultTab =
    typeof window !== 'undefined' && 'showDirectoryPicker' in window
      ? 'local'
      : 'github'

  const [vaultTemplate, setVaultTemplate] = useState<VaultTemplate>('default')
  const [preparing, setPreparing] = useState(false)

  // Reset template choice whenever the dialog opens
  useEffect(() => {
    if (open) {
      setVaultTemplate('default')
      setPreparing(false)
    }
  }, [open])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (preparing && !next) return
        onOpenChange(next)
      }}
    >
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (preparing) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create a new vault' : 'Open an existing vault'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Your notes live on your own computer or in your own GitHub account. Nothing is stored by us.'
              : 'Reconnect to a vault you already have.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'create' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">What will you use this vault for?</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: 'personal', label: 'Personal', Icon: User, desc: 'Shopping, health, travel, contacts' },
                  { value: 'work', label: 'Work', Icon: BriefcaseBusiness, desc: 'Meetings, projects, reviews' },
                  { value: 'default', label: 'Blank', Icon: Folder, desc: 'Start with just a welcome note' },
                ] as const
              ).map(({ value, label, Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVaultTemplate(value)}
                  disabled={preparing}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center text-xs transition-colors',
                    vaultTemplate === value
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-border/80 hover:bg-accent/50',
                    preparing && 'cursor-not-allowed opacity-50 hover:bg-transparent'
                  )}
                >
                  <Icon className={cn('size-5', vaultTemplate === value && 'text-primary')} />
                  <span className="font-medium">{label}</span>
                  <span className="leading-tight opacity-80">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue={defaultTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local" disabled={preparing}>
              <Folder className="mr-1 size-4" />
              On this computer
            </TabsTrigger>
            <TabsTrigger value="github" disabled={preparing}>
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
              vaultTemplate={vaultTemplate}
              onPreparingChange={setPreparing}
              onDone={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ─── Local panel ──────────────────────────────────────────────────────────────

type Phase = 'idle' | 'picking' | 'preparing'

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
  const { connectLocal } = useVault()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showChromiumWarning, setShowChromiumWarning] = useState(false)

  useEffect(() => {
    setShowChromiumWarning(!('showDirectoryPicker' in window))
  }, [])

  useEffect(() => {
    onPreparingChange(phase === 'preparing')
  }, [phase, onPreparingChange])

  async function onPick() {
    setError(null)
    setPhase('picking')
    try {
      const handle = await connectLocal()
      if (!handle) {
        setPhase('idle')
        return
      }
      const provider = new LocalGitProvider(handle)
      await provider.init()
      if (mode === 'create') {
        if (!(await isFolderEmpty(provider))) {
          setError(
            'That folder already has files. Pick an empty folder, or choose "Open" instead.'
          )
          setPhase('idle')
          return
        }
        setPhase('preparing')
        await seedLocalVault(provider, vaultTemplate)
        router.push(`/vault/${WELCOME_PATH}`)
        // Don't close the dialog — the route change unmounts it and prevents a
        // race with the home page's auto-redirect.
      } else {
        router.push('/vault')
        onDone()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open folder')
      setPhase('idle')
    }
  }

  const busy = phase !== 'idle'
  return (
    <div className="flex flex-col gap-3 py-4">
      <p className="text-muted-foreground text-sm">
        {phase === 'preparing'
          ? 'Preparing your vault — writing your welcome note and setting up git…'
          : mode === 'create'
            ? 'Pick an empty folder on your computer. We will use it as your vault.'
            : 'Pick the folder that already contains your vault.'}
      </p>
      <Button onClick={onPick} disabled={busy} size="lg" className="w-full">
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Folder className="size-4" />
        )}
        {phase === 'preparing'
          ? 'Preparing your vault…'
          : mode === 'create'
            ? 'Choose folder'
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

async function waitForGithubListing(
  pat: string,
  owner: string,
  repo: string,
  expectedPaths: string[],
  maxAttempts = 10,
  delayMs = 500
): Promise<void> {
  const need = new Set(expectedPaths)
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github+json',
        },
      })
      if (res.ok) {
        const items = (await res.json()) as Array<{ path: string }>
        const present = new Set(items.map((item) => item.path))
        if ([...need].every((p) => present.has(p))) return
      }
    } catch {
      // ignore, retry
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }
  // Give up silently — the in-app seed-fallback will pick up the slack.
}

function GitHubPanel({
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
  const { connectGitHub } = useVault()
  const [pat, setPat] = useState('')
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onPreparingChange(phase === 'preparing')
  }, [phase, onPreparingChange])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPhase('picking')
    try {
      if (mode === 'create') {
        setPhase('preparing')
        // Create repo on GitHub
        const resp = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${pat}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: repo,
            private: true,
            description: 'My personal-md vault',
            auto_init: true,
          }),
        })
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}))
          throw new Error(
            body.message || `Could not create repository (${resp.status})`
          )
        }
        const created = (await resp.json()) as { owner: { login: string } }
        const actualOwner = created.owner.login

        // Seed welcome.md + AGENTS.md + template files
        const templateFiles = templateFilesFor(vaultTemplate)
        const seeds: Array<{ path: string; body: string }> = [
          { path: WELCOME_PATH, body: WELCOME_MARKDOWN },
          { path: SKILL_PATH, body: SKILL_MARKDOWN },
          ...templateFiles.map(([path, body]) => ({ path, body })),
        ]
        for (const { path, body } of seeds) {
          await fetch(
            `https://api.github.com/repos/${actualOwner}/${repo}/contents/${encodeURIComponent(path)}`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${pat}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: 'Initial vault setup',
                content: btoa(unescape(encodeURIComponent(body))),
              }),
            }
          )
        }
        await pinInitial(WELCOME_PATH)

        // Wait for GitHub's contents listing to reflect the seeds before
        // navigating. Without this, VaultShell can mount, list an empty tree
        // (GitHub propagation lag on fresh repos), and show a blank sidebar
        // until the user does something that triggers another refresh.
        await waitForGithubListing(pat, actualOwner, repo, [
          WELCOME_PATH,
          SKILL_PATH,
        ])

        await connectGitHub(pat, actualOwner, repo)
      } else {
        // Open: verify access
        const verify = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          {
            headers: {
              Authorization: `Bearer ${pat}`,
              Accept: 'application/vnd.github+json',
            },
          }
        )
        if (!verify.ok) {
          throw new Error(
            verify.status === 404
              ? 'Repository not found, or this token cannot access it.'
              : `Could not reach GitHub (${verify.status}).`
          )
        }
        await connectGitHub(pat, owner, repo)
      }
      if (mode === 'create') {
        router.push(`/vault/${WELCOME_PATH}`)
        // Let the route change unmount the dialog — avoids racing the home
        // page's auto-redirect to `/vault`.
      } else {
        router.push('/vault')
        onDone()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to GitHub')
      setPhase('idle')
    }
  }

  const busy = phase !== 'idle'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="pat">Access token</Label>
        <Input
          id="pat"
          type="password"
          autoComplete="off"
          placeholder="github_pat_..."
          value={pat}
          onChange={(e) => setPat(e.target.value)}
          required
        />
        <p className="text-muted-foreground text-xs">
          Create a fine-grained token with read/write access to the repo you
          want to use.{' '}
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Generate one here
          </a>
          . Your token is stored only in this browser.
        </p>
      </div>
      {mode === 'open' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="owner">Owner</Label>
          <Input
            id="owner"
            placeholder="your-username"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            required
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="repo">
          {mode === 'create' ? 'New repository name' : 'Repository name'}
        </Label>
        <Input
          id="repo"
          placeholder={mode === 'create' ? 'my-vault' : 'my-vault'}
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          required
        />
      </div>
      {phase === 'preparing' && (
        <p className="text-muted-foreground text-sm">
          Preparing your vault — creating the repo and writing your welcome note…
        </p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={busy || !pat || !repo} size="lg">
        {busy && <Loader2 className="size-4 animate-spin" />}
        {phase === 'preparing'
          ? 'Preparing your vault…'
          : mode === 'create'
            ? 'Create vault on GitHub'
            : 'Open vault'}
      </Button>
    </form>
  )
}
