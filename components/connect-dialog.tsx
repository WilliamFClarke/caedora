'use client'

import { useState } from 'react'
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
import { seedLocalVault, isFolderEmpty } from '@/lib/vault-create'
import { Folder, Github, Loader2 } from 'lucide-react'

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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

        <Tabs defaultValue={defaultTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">
              <Folder className="mr-1 size-4" />
              On this computer
            </TabsTrigger>
            <TabsTrigger value="github">
              <Github className="mr-1 size-4" />
              GitHub
            </TabsTrigger>
          </TabsList>
          <TabsContent value="local">
            <LocalPanel mode={mode} onDone={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="github">
            <GitHubPanel mode={mode} onDone={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ─── Local panel ──────────────────────────────────────────────────────────────

function LocalPanel({ mode, onDone }: { mode: Mode; onDone: () => void }) {
  const router = useRouter()
  const { connectLocal } = useVault()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick() {
    setError(null)
    setBusy(true)
    try {
      const handle = await connectLocal()
      if (!handle) {
        setBusy(false)
        return
      }
      const provider = new LocalGitProvider(handle)
      await provider.init()
      if (mode === 'create') {
        if (!(await isFolderEmpty(provider))) {
          setError(
            'That folder already has files. Pick an empty folder, or choose "Open" instead.'
          )
          setBusy(false)
          return
        }
        await seedLocalVault(provider)
      }
      router.push('/vault')
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open folder')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      <p className="text-muted-foreground text-sm">
        {mode === 'create'
          ? 'Pick an empty folder on your computer. We will use it as your vault.'
          : 'Pick the folder that already contains your vault.'}
      </p>
      <Button onClick={onPick} disabled={busy} size="lg" className="w-full">
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Folder className="size-4" />
        )}
        {mode === 'create' ? 'Choose folder' : 'Open folder'}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <p className="text-destructive text-xs">
        Requires a Chromium browser (Chrome, Edge, Arc, Brave).
      </p>
    </div>
  )
}

// ─── GitHub panel ─────────────────────────────────────────────────────────────

function GitHubPanel({ mode, onDone }: { mode: Mode; onDone: () => void }) {
  const router = useRouter()
  const { connectGitHub } = useVault()
  const [pat, setPat] = useState('')
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'create') {
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

        // Seed welcome.md
        const welcome =
          '# Welcome to your vault\n\nThis vault is yours. Everything you write here is a plain markdown file stored in your own GitHub repository — never on our servers.\n'
        await fetch(
          `https://api.github.com/repos/${actualOwner}/${repo}/contents/welcome.md`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${pat}`,
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: 'Initial vault setup',
              content: btoa(welcome),
            }),
          }
        )

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
      router.push('/vault')
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to GitHub')
    } finally {
      setBusy(false)
    }
  }

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
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={busy || !pat || !repo} size="lg">
        {busy && <Loader2 className="size-4 animate-spin" />}
        {mode === 'create' ? 'Create vault on GitHub' : 'Open vault'}
      </Button>
    </form>
  )
}
