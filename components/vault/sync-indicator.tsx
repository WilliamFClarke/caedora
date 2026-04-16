'use client'

import { Check, CloudOff, Loader2 } from 'lucide-react'
import type { SyncStatus } from '@/lib/autosave'

export function SyncIndicator({ status }: { status: SyncStatus }) {
  if (status === 'idle' || status === 'saved') {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <Check className="size-3" />
        Saved
      </span>
    )
  }
  if (status === 'saving') {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    )
  }
  return (
    <span className="text-destructive flex items-center gap-1 text-xs">
      <CloudOff className="size-3" />
      Sync error
    </span>
  )
}
