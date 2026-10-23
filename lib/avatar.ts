const AVATAR_COLOURS = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#dc2626',
  '#ea580c',
  '#0d9488',
  '#16a34a',
  '#4f46e5',
]

/** First letter of the best available name, upper-cased, or "?" when none. */
export function avatarInitial(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const first = candidate?.trim().charAt(0)
    if (first) return first.toUpperCase()
  }
  return '?'
}

/** Stable colour for a seed (usually the user id or email), so it never changes between visits. */
export function avatarColour(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length]
}
