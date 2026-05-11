'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  FolderOpen,
  FolderPlus,
  Github,
  Loader2,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { ConnectDialog } from '@/components/connect-dialog'
import { useVault } from '@/lib/vault-context'
import { listVaults, removeVault } from '@/lib/storage'
import type { PersistedVaultState } from '@/lib/types'
import { cn } from '@/lib/utils'

type StoredVault = { id: string; state: PersistedVaultState }

export default function Home() {
  const router = useRouter()
  const { status, grantPermission, connectToVault } = useVault()
  const [dialogMode, setDialogMode] = useState<'create' | 'open' | null>(null)
  const [vaults, setVaults] = useState<StoredVault[]>([])
  const [connectingId, setConnectingId] = useState<string | null>(null)

  // If a vault is already connected, jump straight in. But stay put while the
  // connect dialog is open — dialog-driven flows (create) navigate to a
  // specific note (e.g. /vault/welcome.md) themselves, and we don't want this
  // effect to race them to `/vault`.
  useEffect(() => {
    if (dialogMode !== null) return
    if (status.state === 'ready') router.replace('/vault')
  }, [status.state, router, dialogMode])

  const refreshVaults = useCallback(async () => {
    setVaults(await listVaults())
  }, [])

  useEffect(() => {
    void refreshVaults()
  }, [refreshVaults])

  const onOpenStored = useCallback(
    async (id: string) => {
      setConnectingId(id)
      try {
        await connectToVault(id)
      } finally {
        setConnectingId(null)
      }
    },
    [connectToVault]
  )

  const onRemove = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      await removeVault(id)
      await refreshVaults()
    },
    [refreshVaults]
  )

  if (status.state === 'checking' || status.state === 'connecting' || status.state === 'ready') {
    return (
      <HomeShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="text-primary size-6 animate-spin" />
          <p className="text-muted-foreground text-sm">
            {status.state === 'checking' ? 'Checking for vault...' : 'Opening vault...'}
          </p>
        </div>
      </HomeShell>
    )
  }

  return (
    <HomeShell>
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-3">
          <FileText className="size-10" />
          <span className="text-3xl font-semibold tracking-tight">Caedora</span>
        </div>

        {status.state === 'permission-required' ? (
          <div className="flex max-w-sm flex-col items-center gap-4">
            <p className="text-muted-foreground text-sm">
              Re-grant access to <span className="font-medium">{status.folderName}</span>{' '}
              to continue.
            </p>
            <Button size="lg" onClick={() => void grantPermission()}>
              Grant access
            </Button>
          </div>
        ) : (
          <>
            {vaults.length > 0 && (
              <div className="flex w-full flex-col gap-2">
                <p className="text-muted-foreground self-start text-xs font-medium uppercase tracking-wider">
                  Recent vaults
                </p>
                <ul className="flex w-full flex-col gap-1.5">
                  {vaults.map((v) => (
                    <VaultRow
                      key={v.id}
                      vault={v}
                      connecting={connectingId === v.id}
                      onOpen={() => onOpenStored(v.id)}
                      onRemove={(e) => onRemove(v.id, e)}
                    />
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => setDialogMode('create')}>
                <FolderPlus className="size-4" />
                Create vault
              </Button>
              <Button size="lg" variant="outline" onClick={() => setDialogMode('open')}>
                <FolderOpen className="size-4" />
                Open vault
              </Button>
            </div>
          </>
        )}
      </div>

      <ConnectDialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && setDialogMode(null)}
        mode={dialogMode ?? 'create'}
      />
    </HomeShell>
  )
}

function HomeShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="caedora-home-screen bg-background relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="caedora-home-titlebar absolute inset-x-0 top-0 z-20 h-11" />
      <div className="caedora-home-theme-toggle absolute top-3 left-4 z-30">
        <ModeToggle />
      </div>
      {children}
    </main>
  )
}

function VaultRow({
  vault,
  connecting,
  onOpen,
  onRemove,
}: {
  vault: StoredVault
  connecting: boolean
  onOpen: () => void
  onRemove: (e: React.MouseEvent) => void
}) {
  const isGithub = vault.state.type === 'github'
  const label = isGithub
    ? `${vault.state.githubOwner}/${vault.state.githubRepo}`
    : vault.state.directoryName ?? vault.state.directoryHandle?.name ?? 'Local vault'
  const subtitle = isGithub
    ? 'GitHub'
    : vault.state.directoryPath
      ? 'Desktop folder'
      : 'Local folder'
  const lastOpened = vault.state.lastOpenedAt
    ? timeAgo(vault.state.lastOpenedAt)
    : 'never'

  return (
    <li
      className={cn(
        'hover:bg-accent hover:border-border group/vault border-border/60 flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition',
        connecting && 'pointer-events-none opacity-60'
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={connecting}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {isGithub ? (
          <Github className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <FolderOpen className="text-muted-foreground size-4 shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{label}</span>
          <span className="text-muted-foreground font-mono text-[10px]">
            {subtitle} · opened {lastOpened}
          </span>
        </div>
      </button>
      {connecting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="text-muted-foreground hover:text-destructive opacity-0 transition group-hover/vault:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  )
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(ts).toLocaleDateString()
}
