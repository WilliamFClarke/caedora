'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { CircleUserRound, UserRoundPlus } from 'lucide-react'
import { isDesktopApp } from '@/lib/desktop'
import { cn } from '@/lib/utils'

export function AccountLink({ className }: { className?: string }) {
  const [isDesktop, setIsDesktop] = useState(false)
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

  useEffect(() => {
    setIsDesktop(isDesktopApp())
  }, [])

  if (isDesktop) {
    return (
      <AccountButton
        className={className}
        icon={<CircleUserRound className="size-4" />}
        label="Manage account"
      />
    )
  }

  if (!clerkConfigured) {
    return (
      <AccountButton
        className={className}
        icon={<CircleUserRound className="size-4" />}
        label="Account setup"
      />
    )
  }

  return <ConfiguredAccountLink className={className} />
}

function ConfiguredAccountLink({
  className,
}: {
  className?: string
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
        <CircleUserRound className="size-4 opacity-60" />
      </span>
    )
  }

  return (
    <AccountButton
      className={className}
      icon={isSignedIn ? <CircleUserRound className="size-4" /> : <UserRoundPlus className="size-4" />}
      label={isSignedIn ? 'My account' : 'Sign in'}
    />
  )
}

function AccountButton({
  className,
  icon,
  label,
}: {
  className?: string
  icon: ReactNode
  label: string
}) {
  return (
    <Link
      href="/account"
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-md transition',
        className
      )}
      aria-label={label}
      title={label}
    >
      {icon}
    </Link>
  )
}
