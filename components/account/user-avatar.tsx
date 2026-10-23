'use client'

import type { ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import { avatarColour, avatarInitial } from '@/lib/avatar'
import { cn } from '@/lib/utils'

/** Photo when the account has one (for example from Google), otherwise a coloured circle with an initial. */
export function UserAvatar({
  name,
  seed,
  imageUrl,
  className,
}: {
  name: string
  seed: string
  imageUrl?: string | null
  className?: string
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        referrerPolicy="no-referrer"
        data-testid="user-avatar"
        className={cn('size-6 rounded-full object-cover', className)}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      data-testid="user-avatar"
      style={{ backgroundColor: avatarColour(seed) }}
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-full text-xs font-medium text-white',
        className
      )}
    >
      {avatarInitial(name)}
    </span>
  )
}

/** Avatar for the signed in Clerk user, or the fallback when signed out. Only render when Clerk is configured. */
export function SignedInAvatar({
  className,
  fallback = null,
}: {
  className?: string
  fallback?: ReactNode
}) {
  const { isLoaded, isSignedIn, user } = useUser()
  if (!isLoaded || !isSignedIn || !user) return <>{fallback}</>
  const email = user.primaryEmailAddress?.emailAddress
  return (
    <UserAvatar
      name={user.fullName || user.firstName || user.username || email || ''}
      seed={user.id}
      imageUrl={user.hasImage ? user.imageUrl : null}
      className={className}
    />
  )
}
