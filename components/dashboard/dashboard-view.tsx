'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, Loader2 } from 'lucide-react'
import { DashboardItemView } from './dashboard-items'
import { evaluateItem, type DashboardData } from '@/lib/dashboard/evaluate'
import { loadDashboardData } from '@/lib/dashboard/load'
import { parseDashboard, type DashboardRow } from '@/lib/dashboard/spec'
import type { VaultProvider } from '@/lib/types'
import { cn } from '@/lib/utils'

const GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 @2xl/dashboard:grid-cols-2',
  3: 'grid-cols-1 @2xl/dashboard:grid-cols-2 @5xl/dashboard:grid-cols-3',
  4: 'grid-cols-1 @xl/dashboard:grid-cols-2 @5xl/dashboard:grid-cols-4',
}

export function DashboardView({
  provider,
  path,
  title,
  description,
  body,
  refreshKey,
}: {
  provider: VaultProvider
  path: string
  title: string
  description?: string
  body: string
  /** Changes whenever the vault's files change, so Datasets are re-read. */
  refreshKey?: unknown
}) {
  const spec = useMemo(() => parseDashboard(body), [body])
  const [data, setData] = useState<DashboardData | null>(null)
  const sourcesKey = JSON.stringify(spec.data)

  useEffect(() => {
    let cancelled = false
    loadDashboardData(provider, path, JSON.parse(sourcesKey) as Record<string, string>)
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => {
        if (!cancelled) setData({ sources: {}, byPath: {}, today: new Date() })
      })
    return () => {
      cancelled = true
    }
  }, [provider, path, sourcesKey, refreshKey])

  return (
    <div data-testid="dashboard-view" className="@container/dashboard h-full overflow-y-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </header>
        {spec.issues.length > 0 && (
          <div className="border-destructive/40 text-destructive rounded-lg border p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <CircleAlert className="size-4" />
              Some of this dashboard could not be read
            </p>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5">
              {spec.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        {!data ? (
          <div className="text-muted-foreground flex items-center gap-2 py-12 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading data…
          </div>
        ) : (
          spec.rows.map((row, index) => <DashboardRowView key={index} row={row} data={data} />)
        )}
      </div>
    </div>
  )
}

function DashboardRowView({ row, data }: { row: DashboardRow; data: DashboardData }) {
  const results = useMemo(() => row.items.map((item) => evaluateItem(item, data)), [row, data])
  return (
    <div className={cn('grid gap-4', GRID[row.columns] ?? GRID[1])}>
      {results.map((result, index) => (
        <DashboardItemView key={index} result={result} />
      ))}
    </div>
  )
}
