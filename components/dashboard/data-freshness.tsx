'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, TriangleAlert } from 'lucide-react'
import type { DashboardData } from '@/lib/dashboard/evaluate'
import { dataFreshness, timeAgo } from '@/lib/dashboard/freshness'
import { cn } from '@/lib/utils'

const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

/**
 * "Data from 2 hours ago", from the oldest generated.at of the Datasets the
 * dashboard reads. Turns into a warning when a Dataset is past stale_after.
 */
export function DataFreshness({ data }: { data: DashboardData }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [data])
  const freshness = useMemo(() => dataFreshness(data, now), [data, now])
  if (!freshness.oldest && freshness.stale.length === 0) return null

  const stale = freshness.stale.length > 0
  const details = freshness.datasets
    .map((dataset) => `${dataset.title}: ${dateTime.format(new Date(dataset.generatedAt))}`)
    .join('\n')
  return (
    <p
      role="status"
      data-slot="dashboard-synced"
      data-stale={stale || undefined}
      title={details || undefined}
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-xs',
        stale ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
      )}
    >
      {stale ? <TriangleAlert className="size-3.5" /> : <Clock className="size-3.5" />}
      <span>
        {[
          freshness.oldest ? `Data from ${timeAgo(freshness.oldest.generatedAt, now)}.` : '',
          stale ? staleText(freshness.stale.map((dataset) => dataset.title)) : '',
        ]
          .filter(Boolean)
          .join(' ')}
      </span>
    </p>
  )
}

function staleText(titles: string[]): string {
  const names =
    titles.length === 1 ? titles[0] : `${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]}`
  return `${names} ${titles.length === 1 ? 'is' : 'are'} out of date.`
}
