'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  CircleCheck,
  Database,
  Download,
  FolderOpen,
  FolderPlus,
  Github,
  Loader2,
  LogOut,
  MoreVertical,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PersistedVaultState } from '@/lib/types'
import { cn } from '@/lib/utils'

export type StoredVault = { id: string; state: PersistedVaultState }

type SavedVaultListProps = {
  vaults: StoredVault[]
  activeVaultId: string | null
  switchingVaultId?: string | null
  onOpenVault: (id: string) => void
  onDeleteVault: (id: string) => void
  onExportVault: (vault: StoredVault) => void
  onAddExistingVault: () => void
  onCreateVault?: () => void
  onCloseAllVaults?: () => void
  addExistingVaultLabel?: string
  createVaultLabel?: string
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

export function SavedVaultList({
  vaults,
  activeVaultId,
  switchingVaultId = null,
  onOpenVault,
  onDeleteVault,
  onExportVault,
  onAddExistingVault,
  onCreateVault,
  onCloseAllVaults,
  addExistingVaultLabel = 'Open existing vault',
  createVaultLabel = 'Create new vault',
  emptyTitle = 'No saved vaults',
  emptyDescription = 'Create or open a vault to add it here.',
  className,
}: SavedVaultListProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  return (
    <section
      className={cn(
        'bg-background text-foreground grid min-h-[min(720px,calc(100dvh-1rem))] w-full min-w-0 overflow-hidden rounded-lg border md:grid-cols-[minmax(220px,36%)_minmax(360px,1fr)]',
        className
      )}
    >
      <aside className="order-1 flex min-h-0 min-w-0 flex-col border-b bg-muted/25 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 md:px-6 md:pt-7">
          <div className="min-w-0">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Vaults
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {vaults.length ? `${vaults.length} saved on this device` : emptyDescription}
            </p>
          </div>
          <VaultKindIcon
            state={vaults.find((vault) => vault.id === activeVaultId)?.state}
            className="size-4 shrink-0"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 md:max-h-none md:px-3 md:pb-5">
          {vaults.length > 0 ? (
            <div className="flex flex-col gap-1">
              {vaults.map((vault) => {
                const isActive = vault.id === activeVaultId
                const isSwitching = switchingVaultId === vault.id
                const confirmingDelete = confirmingDeleteId === vault.id
                const canExport = vault.state.type === 'browser' && Boolean(vault.state.browserBundleId)

                return (
                  <div
                    key={vault.id}
                    className={cn(
                      'group rounded-lg border border-transparent transition-colors hover:border-border hover:bg-accent/70',
                      isActive && 'border-primary/35 bg-primary/8 hover:border-primary/45 hover:bg-primary/12'
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => onOpenVault(vault.id)}
                        disabled={isActive || Boolean(switchingVaultId)}
                        className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left disabled:cursor-default"
                      >
                        <VaultKindIcon state={vault.state} className="mt-0.5 size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium leading-5">
                              {vaultLabel(vault.state)}
                            </span>
                            {isActive && (
                              <span className="text-primary inline-flex shrink-0 items-center gap-1 text-[11px] font-medium">
                                <CircleCheck className="size-3" />
                                Open
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                            {vaultLocation(vault.state)}
                          </span>
                        </span>
                      </button>

                      {isSwitching ? (
                        <Loader2 className="text-muted-foreground mt-1 size-4 shrink-0 animate-spin" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
                              aria-label={`Options for ${vaultLabel(vault.state)}`}
                            >
                              <MoreVertical className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {!isActive && (
                              <DropdownMenuItem onSelect={() => onOpenVault(vault.id)}>
                                <FolderOpen className="size-4" />
                                Open
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onSelect={(event) => {
                                if (!canExport) event.preventDefault()
                                if (canExport) onExportVault(vault)
                              }}
                              disabled={!canExport}
                            >
                              <Download className="size-4" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setConfirmingDeleteId(vault.id)}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {confirmingDelete && (
                      <div className="mx-3 mb-3 rounded-md border border-destructive/25 bg-destructive/8 p-3">
                        <p className="text-sm font-medium">Delete this vault connection?</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          This removes the saved connection from this device. It does not delete files,
                          browser data, or GitHub repositories.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmingDeleteId(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setConfirmingDeleteId(null)
                              onDeleteVault(vault.id)
                            }}
                            className="flex-1"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4">
              <p className="text-sm font-medium">{emptyTitle}</p>
              <p className="text-muted-foreground mt-1 text-xs">{emptyDescription}</p>
            </div>
          )}
        </div>
      </aside>

      <div className="order-2 flex min-h-0 min-w-0 flex-col items-center justify-center overflow-y-auto p-5 md:p-8">
        <div className="flex w-full max-w-xl flex-col items-center">
          <Image
            src="/caedora-logo.png"
            alt=""
            width={88}
            height={88}
            priority
            className="size-20 rounded-2xl md:size-24"
          />
          <h2 className="mt-4 text-center text-3xl font-semibold leading-tight md:text-4xl">
            Caedora
          </h2>
          <p className="text-muted-foreground mt-1 text-center text-sm">
            Offline OKF vaults
          </p>

          <div className="mt-8 w-full rounded-xl bg-muted/45 p-4 md:p-5">
            {onCreateVault && (
              <LauncherAction
                title={createVaultLabel}
                description="Start in browser storage with a preset OKF template."
                buttonLabel="Create"
                icon={Plus}
                onClick={onCreateVault}
              />
            )}
            <LauncherAction
              title={addExistingVaultLabel}
              description="Use a local folder or a GitHub repository Caedora can access."
              buttonLabel="Open"
              icon={FolderPlus}
              onClick={onAddExistingVault}
              bordered={Boolean(onCreateVault)}
            />
            {onCloseAllVaults && vaults.length > 0 && (
              <LauncherAction
                title="Close all vaults"
                description="Return to the website without removing saved vaults."
                buttonLabel="Close"
                icon={LogOut}
                onClick={onCloseAllVaults}
                variant="outline"
                bordered
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export function vaultLabel(state: PersistedVaultState): string {
  if (state.type === 'github') return `${state.githubOwner}/${state.githubRepo}`
  if (state.type === 'browser') return state.browserBundleName ?? 'Browser vault'
  return state.directoryName ?? state.directoryHandle?.name ?? 'Local vault'
}

export function vaultKind(state: PersistedVaultState): string {
  if (state.type === 'github') return 'GitHub vault'
  if (state.type === 'browser') return 'Browser storage'
  return state.directoryPath ? 'Desktop folder' : 'Local folder'
}

function vaultLocation(state: PersistedVaultState): string {
  if (state.type === 'github') return 'GitHub repository'
  if (state.type === 'browser') return 'Browser storage'
  return state.directoryPath ?? 'Local folder'
}

function VaultKindIcon({
  state,
  className,
}: {
  state?: PersistedVaultState
  className?: string
}) {
  const Icon = state?.type === 'github'
    ? Github
    : state?.type === 'browser'
      ? Database
      : FolderOpen
  return <Icon className={cn('text-muted-foreground', className)} />
}

function LauncherAction({
  title,
  description,
  buttonLabel,
  icon: Icon,
  onClick,
  bordered = false,
  variant = 'secondary',
}: {
  title: string
  description: string
  buttonLabel: string
  icon: LucideIcon
  onClick: () => void
  bordered?: boolean
  variant?: 'secondary' | 'outline'
}) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center',
        bordered && 'border-t'
      )}
    >
      <div className="min-w-0">
        <h3 className="text-base font-medium leading-6">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm leading-5">{description}</p>
      </div>
      <Button type="button" variant={variant} onClick={onClick} className="w-full sm:w-32">
        <Icon className="size-4" />
        {buttonLabel}
      </Button>
    </div>
  )
}
