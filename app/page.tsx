'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, FolderPlus, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { ConnectDialog } from '@/components/connect-dialog'
import { useVault } from '@/lib/vault-context'

export default function Home() {
  const router = useRouter()
  const { status, grantPermission } = useVault()
  const [dialogMode, setDialogMode] = useState<'create' | 'open' | null>(null)

  // If a vault is already connected, jump straight in. But stay put while the
  // connect dialog is open — dialog-driven flows (create) navigate to a
  // specific note (e.g. /vault/welcome.md) themselves, and we don't want this
  // effect to race them to `/vault`.
  useEffect(() => {
    if (dialogMode !== null) return
    if (status.state === 'ready') router.replace('/vault')
  }, [status.state, router, dialogMode])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>

      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-3">
          <FileText className="size-10" />
          <span className="text-3xl font-semibold tracking-tight">personal-md</span>
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
        )}
      </div>

      <ConnectDialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && setDialogMode(null)}
        mode={dialogMode ?? 'create'}
      />
    </main>
  )
}
