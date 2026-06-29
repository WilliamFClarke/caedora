'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import { LogIn, UserRound } from 'lucide-react'
import { SettingsDialog } from '@/components/settings-dialog'
import { isDesktopApp } from '@/lib/desktop'
import { cn } from '@/lib/utils'

export function AccountLink({ className }: { className?: string }) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [open, setOpen] = useState(false)
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

  useEffect(() => {
    setIsDesktop(isDesktopApp())
  }, [])

  if (isDesktop) {
    return (
      <>
        <AccountButton
          className={className}
          icon={<UserRound className="size-4" />}
          label="Manage account"
          onClick={() => setOpen(true)}
        />
        <SettingsDialog open={open} onOpenChange={setOpen} initialSection="account" />
      </>
    )
  }

  if (!clerkConfigured) {
    return (
      <>
        <AccountButton
          className={className}
          icon={<UserRound className="size-4" />}
          label="Account setup"
          onClick={() => setOpen(true)}
        />
        <SettingsDialog open={open} onOpenChange={setOpen} initialSection="account" />
      </>
    )
  }

  return <ConfiguredAccountLink className={className} open={open} setOpen={setOpen} />
}

function ConfiguredAccountLink({
  className,
  open,
  setOpen,
}: {
  className?: string
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return (
      <span
        className={cn(
          'text-muted-foreground inline-flex size-9 items-center justify-center rounded-md',
          className
        )}
      >
        <UserRound className="size-4 opacity-60" />
      </span>
    )
  }

  return (
    <>
      <AccountButton
        className={className}
        icon={isSignedIn ? <UserRound className="size-4" /> : <LogIn className="size-4" />}
        label={isSignedIn ? 'My account' : 'Sign in'}
        onClick={() => setOpen(true)}
      />
      <SettingsDialog open={open} onOpenChange={setOpen} initialSection="account" />
    </>
  )
}

function AccountButton({
  className,
  icon,
  label,
  onClick,
}: {
  className?: string
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-md transition',
        className
      )}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}
