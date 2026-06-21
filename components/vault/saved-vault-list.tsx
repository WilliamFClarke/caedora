'use client'

import { useState } from 'react'
import { CircleCheck, Database, Download, FolderOpen, FolderPlus, Github, Loader2, LogOut, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'
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
  addExistingVaultLabel = 'Add existing vault',
  createVaultLabel = 'Create vault',
  emptyTitle = 'No saved vaults',
  emptyDescription = 'Create or open a vault to add it here.',
  className,
}: SavedVaultListProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  return (
    <ItemGroup className={cn('min-w-0', className)}>
      {vaults.length > 0 ? (
        vaults.map((vault, index) => {
          const isActive = vault.id === activeVaultId
          const isSwitching = switchingVaultId === vault.id
          const canExport = vault.state.type === 'browser' && Boolean(vault.state.browserBundleId)
          const confirmingDelete = confirmingDeleteId === vault.id

          return (
            <div key={vault.id}>
              {index > 0 && <Separator />}
              <Item
                variant={isActive ? 'outline' : 'default'}
                className={cn(
                  'min-w-0 items-start gap-3',
                  isActive && 'border-primary/45 bg-primary/5'
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpenVault(vault.id)}
                  disabled={isActive || Boolean(switchingVaultId)}
                  className="hover:text-foreground flex min-w-0 flex-1 items-start gap-3 rounded-md text-left disabled:cursor-default"
                >
                  <VaultKindIcon state={vault.state} className="mt-0.5 size-4 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex min-w-0 items-center gap-2 font-medium leading-none">
                      <span className="truncate">{vaultLabel(vault.state)}</span>
                      <VaultKindIcon state={vault.state} className="size-3.5 shrink-0" />
                    </span>
                    <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-2 text-sm leading-relaxed">
                      <span>{vaultKind(vault.state)}</span>
                      {isActive && (
                        <span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
                          <CircleCheck className="size-3.5" />
                          Open now
                        </span>
                      )}
                    </span>
                  </span>
                </button>

                <ItemActions className="shrink-0 flex-wrap justify-end">
                  {isSwitching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : confirmingDelete ? (
                    <>
                      <span className="text-muted-foreground text-xs">Delete this vault?</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmingDeleteId(null)}
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
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      {!isActive && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenVault(vault.id)}
                          disabled={Boolean(switchingVaultId)}
                        >
                          Open
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onExportVault(vault)}
                        disabled={!canExport}
                        title={canExport ? 'Export this vault' : 'Export is available for browser vaults'}
                      >
                        <Download className="size-4" />
                        Export
                      </Button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(vault.id)}
                        className="text-muted-foreground hover:text-destructive flex size-8 items-center justify-center rounded-md"
                        aria-label={`Remove ${vaultLabel(vault.state)}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                </ItemActions>
              </Item>
            </div>
          )
        })
      ) : (
        <Item variant="muted">
          <ItemContent>
            <ItemTitle>{emptyTitle}</ItemTitle>
            <ItemDescription>{emptyDescription}</ItemDescription>
          </ItemContent>
        </Item>
      )}

      <Separator />
      <div className="flex flex-col gap-2 sm:flex-row">
        {onCreateVault && (
          <Button type="button" onClick={onCreateVault} className="flex-1">
            <Plus className="size-4" />
            {createVaultLabel}
          </Button>
        )}
        <Button type="button" variant={onCreateVault ? 'outline' : 'default'} onClick={onAddExistingVault} className="flex-1">
          <FolderPlus className="size-4" />
          {addExistingVaultLabel}
        </Button>
        {onCloseAllVaults && vaults.length > 0 && (
          <Button type="button" variant="outline" onClick={onCloseAllVaults} className="flex-1">
            <LogOut className="size-4" />
            Close all vaults
          </Button>
        )}
      </div>
    </ItemGroup>
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

function VaultKindIcon({
  state,
  className,
}: {
  state: PersistedVaultState
  className?: string
}) {
  const Icon = state.type === 'github'
    ? Github
    : state.type === 'browser'
      ? Database
      : FolderOpen
  return <Icon className={cn('text-muted-foreground', className)} />
}
