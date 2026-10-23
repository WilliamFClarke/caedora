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
    <header className="flex flex-wrap items-start gap-x-3 gap-y-3 sm:flex-nowrap">
      {canCollapse && <SidebarTrigger className="mt-0.5 size-8 shrink-0" />}
      <div className="min-w-0 flex-1 basis-[calc(100%-2.75rem)] space-y-1 sm:basis-0">
        <h1 className="text-2xl font-semibold tracking-tight break-words">{title}</h1>
        {description && <p className="text-muted-foreground text-sm break-words">{description}</p>}
        {meta}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div>}
    </header>
  )
}
