'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConnectDialog } from '@/components/connect-dialog'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { useVault } from '@/lib/vault-context'
import {
  exportBrowserBundle,
  getActiveVaultId,
  listVaults,
  removeVault,
} from '@/lib/storage'
import { SavedVaultList, type StoredVault } from '@/components/vault/saved-vault-list'

export function VaultManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { connectToVault, disconnect } = useVault()
  const [vaults, setVaults] = useState<StoredVault[]>([])
  const [activeVaultId, setActiveVaultIdState] = useState<string | null>(null)
  const [switchingVaultId, setSwitchingVaultId] = useState<string | null>(null)
  const [connectMode, setConnectMode] = useState<'create' | 'open' | null>(null)

  async function refreshVaults() {
    const [stored, active] = await Promise.all([listVaults(), getActiveVaultId()])
    setVaults(stored)
    setActiveVaultIdState(active)
  }

  useEffect(() => {
    if (open) void refreshVaults()
  }, [open])

  async function switchVault(id: string) {
    if (id === activeVaultId || switchingVaultId) return
    setSwitchingVaultId(id)
    try {
      await connectToVault(id)
      router.push('/vault')
      await refreshVaults()
    } finally {
      setSwitchingVaultId(null)
    }
  }

  async function deleteVault(id: string) {
    await removeVault(id)
    if (id === activeVaultId) {
      disconnect()
      onOpenChange(false)
      router.push('/')
      return
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
    onOpenChange(false)
    router.push('/')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-hidden gap-0 p-0 sm:max-w-5xl [&>button]:top-3 [&>button]:right-3">
          <DialogTitle className="sr-only">Manage vaults</DialogTitle>
          <SavedVaultList
            className="h-[min(720px,calc(100dvh-1rem))] min-h-0 rounded-none border-0"
            vaults={vaults}
            activeVaultId={activeVaultId}
            switchingVaultId={switchingVaultId}
            onOpenVault={(id) => void switchVault(id)}
            onDeleteVault={(id) => void deleteVault(id)}
            onExportVault={(vault) => void exportVault(vault)}
            onCreateVault={() => setConnectMode('create')}
            onAddExistingVault={() => setConnectMode('open')}
            onCloseAllVaults={() => void closeAllVaults()}
          />
        </DialogContent>
      </Dialog>
      <ConnectDialog
        open={connectMode !== null}
        mode={connectMode ?? 'create'}
        showSavedVaults={false}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setConnectMode(null)
            void refreshVaults()
          }
        }}
      />
    </>
  )
}

function slugForDownload(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'caedora-vault'
}
