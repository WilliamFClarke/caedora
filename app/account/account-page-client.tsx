'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SettingsDialog } from '@/components/settings-dialog'

export function AccountPageClient() {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  return (
    <main className="bg-background min-h-screen">
      <SettingsDialog
        open={open}
        initialSection="account"
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) router.push('/')
        }}
      />
    </main>
  )
}
