/**
 * Shareable links into a vault.
 *
 *   /vault/<path to note>.md            opens a note, Dataset or dashboard (the .md is optional)
 *   /vault?workout                      opens the workout tracker
 *   /vault?workout=<day>                opens the tracker on one planned workout, e.g. full-body-a
 *
 * The vault itself lives in the browser (IndexedDB), so a link opened where no
 * vault is connected yet goes to the home page first. The link is remembered
 * here and opened once a vault is connected.
 */

const PENDING_KEY = 'caedora:pending-link'
/** A remembered link older than this is dropped, so it never surprises someone later. */
const PENDING_MAX_AGE_MS = 30 * 60 * 1000

export const WORKOUT_PARAM = 'workout'

/** True when a /vault URL points somewhere more specific than the vault's default note. */
export function isDeepLink(pathname: string, search: string): boolean {
  if (!pathname.startsWith('/vault')) return false
  const rest = pathname.slice('/vault'.length).replace(/^\/+/, '')
  return rest.length > 0 || new URLSearchParams(search).has(WORKOUT_PARAM)
}

/** The note path in a /vault URL, decoded, or null for /vault itself. */
export function notePathFromPathname(pathname: string): string | null {
  if (!pathname.startsWith('/vault')) return null
  const rest = pathname.slice('/vault'.length).replace(/^\/+/, '').replace(/\/+$/, '')
  if (!rest) return null
  try {
    return rest
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/')
  } catch {
    return rest
  }
}

/**
 * The workout asked for in a query string: undefined when the tracker is not
 * asked for, null for the tracker with no particular workout, otherwise the
 * workout's name as written in the link.
 */
export function workoutFromSearch(search: string): string | null | undefined {
  const params = new URLSearchParams(search)
  if (!params.has(WORKOUT_PARAM)) return undefined
  const value = params.get(WORKOUT_PARAM)?.trim()
  return value ? value : null
}

/** Lower case words joined by hyphens, so "Full body C upper" and full-body-c-upper match. */
export function linkSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The planned workout a link names, by its programme day value or its label. */
export function matchWorkout<T extends { day: string; label: string }>(templates: T[], wanted: string): T | null {
  const slug = linkSlug(wanted)
  if (!slug) return null
  return templates.find((item) => linkSlug(item.day) === slug || linkSlug(item.label) === slug) ?? null
}

/**
 * The note a link means, given the vault's files: the exact path, else the
 * same path with .md added, compared without regard to case as a last resort.
 */
export function resolveNotePath(wanted: string, filePaths: Iterable<string>): string | null {
  const paths = [...filePaths]
  if (paths.includes(wanted)) return wanted
  const withMd = /\.md$/i.test(wanted) ? wanted : `${wanted}.md`
  if (paths.includes(withMd)) return withMd
  const lower = withMd.toLowerCase()
  return paths.find((path) => path.toLowerCase() === lower) ?? null
}

/** The /vault URL for a note path and optional workout, as the address bar should show it. */
export function vaultUrl(path: string | null, workout?: string | null | undefined): string {
  const base = path ? `/vault/${path.split('/').map(encodeURIComponent).join('/')}` : '/vault'
  if (workout === undefined) return base
  return workout ? `${base}?${WORKOUT_PARAM}=${encodeURIComponent(workout)}` : `${base}?${WORKOUT_PARAM}`
}

interface PendingLink {
  url: string
  at: number
}

/** Keeps a link to open after the vault is connected. */
export function rememberPendingLink(url: string, now = Date.now()) {
  try {
    const value: PendingLink = { url, at: now }
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(value))
  } catch {
    // Storage can be blocked; the link then simply opens the vault's default note.
  }
}

/** The remembered link, if one is fresh, removing it so it opens only once. */
export function takePendingLink(now = Date.now()): string | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    window.localStorage.removeItem(PENDING_KEY)
    const value = JSON.parse(raw) as Partial<PendingLink>
    if (typeof value.url !== 'string' || typeof value.at !== 'number') return null
    if (now - value.at > PENDING_MAX_AGE_MS || now < value.at) return null
    // Only ever a path inside the vault, never another site.
    if (!value.url.startsWith('/vault')) return null
    return value.url
  } catch {
    return null
  }
}
