import type { Dataset } from '../dataset.js'
import type { DashboardData } from './evaluate.js'

/**
 * How current a dashboard's data is. The dashboard is only as fresh as the
 * oldest Dataset it reads, so that is the time shown. A Dataset whose
 * stale_after has passed is called out, since its producer has not caught up.
 */

export interface DatasetFreshness {
  path: string
  title: string
  generatedAt: string
  stale: boolean
}

export interface Freshness {
  /** The oldest generated.at among the Datasets read, or null when none has one. */
  oldest: DatasetFreshness | null
  /** Every Dataset with a generated.at, oldest first. */
  datasets: DatasetFreshness[]
  /** Datasets past their stale_after time. */
  stale: Array<{ path: string; title: string; staleAfter: string }>
}

export function dataFreshness(data: DashboardData, now = new Date()): Freshness {
  const datasets: DatasetFreshness[] = []
  const stale: Freshness['stale'] = []
  for (const dataset of Object.values(data.byPath)) {
    const isStale = pastStaleAfter(dataset, now)
    if (isStale) stale.push({ path: dataset.path, title: dataset.title, staleAfter: dataset.staleAfter! })
    const at = dataset.generatedAt ? Date.parse(dataset.generatedAt) : NaN
    if (Number.isNaN(at)) continue
    datasets.push({ path: dataset.path, title: dataset.title, generatedAt: dataset.generatedAt!, stale: isStale })
  }
  datasets.sort((a, b) => Date.parse(a.generatedAt) - Date.parse(b.generatedAt) || a.path.localeCompare(b.path))
  stale.sort((a, b) => a.title.localeCompare(b.title))
  return { oldest: datasets[0] ?? null, datasets, stale }
}

function pastStaleAfter(dataset: Dataset, now: Date): boolean {
  const staleAfter = dataset.staleAfter ? Date.parse(dataset.staleAfter) : NaN
  return !Number.isNaN(staleAfter) && now.getTime() >= staleAfter
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "2 hours ago", "yesterday" or "just now", in British English. */
export function timeAgo(at: string | number, now = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(at).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const format = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return format.format(-Math.floor(seconds / size), unit)
  }
  return 'just now'
}
