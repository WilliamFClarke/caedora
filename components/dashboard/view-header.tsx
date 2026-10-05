'use client'

import type { ReactNode } from 'react'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'

/** Title row shared by the Dashboard and Dataset views, with actions in the top corner. */
export function ViewHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string
  description?: string
  meta?: ReactNode
  actions?: ReactNode
}) {
  const { canCollapse } = useSidebar()
  return (
    <header className="flex items-start gap-3">
      {canCollapse && <SidebarTrigger className="mt-0.5 size-8 shrink-0" />}
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
        {meta}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </header>
  )
}
