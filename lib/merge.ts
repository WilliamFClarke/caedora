import { diffArrays } from 'diff'

/** A run of base lines, [start, end), that one side replaced with `lines`. */
interface Hunk {
  start: number
  end: number
  lines: string[]
}

function hunksBetween(base: string[], other: string[]): Hunk[] {
  const hunks: Hunk[] = []
  let index = 0
  let current: Hunk | null = null
  for (const part of diffArrays(base, other)) {
    if (!part.added && !part.removed) {
      if (current) hunks.push(current)
      current = null
      index += part.value.length
      continue
    }
    current ??= { start: index, end: index, lines: [] }
    if (part.removed) {
      index += part.value.length
      current.end = index
    } else {
      current.lines.push(...part.value)
    }
  }
  if (current) hunks.push(current)
  return hunks
}

function sameHunk(a: Hunk, b: Hunk): boolean {
  return (
    a.start === b.start &&
    a.end === b.end &&
    a.lines.length === b.lines.length &&
    a.lines.every((line, i) => line === b.lines[i])
  )
}

/**
 * Line based three way merge. Returns the merged text when the two sides
 * changed separate parts of `base`, or null when their changes overlap or
 * touch the same spot. Touching counts as a conflict, as Git does, so an edit
 * to the last row of a table and a row added after it are never guessed at.
 */
export function mergeText(base: string, mine: string, theirs: string): string | null {
  if (mine === theirs) return mine
  if (mine === base) return theirs
  if (theirs === base) return mine

  const baseLines = base.split('\n')
  const ours = hunksBetween(baseLines, mine.split('\n'))
  const others = hunksBetween(baseLines, theirs.split('\n'))
  const all = [
    ...ours.map((hunk) => ({ hunk, side: 'mine' as const })),
    ...others.map((hunk) => ({ hunk, side: 'theirs' as const })),
  ].sort((a, b) => a.hunk.start - b.hunk.start || a.hunk.end - b.hunk.end)

  const out: string[] = []
  let index = 0
  let previous: { hunk: Hunk; side: 'mine' | 'theirs' } | null = null
  for (const entry of all) {
    const { hunk } = entry
    if (previous && hunk.start <= previous.hunk.end) {
      // Both sides making the identical change is not a conflict.
      if (previous.side !== entry.side && sameHunk(previous.hunk, hunk)) continue
      return null
    }
    out.push(...baseLines.slice(index, hunk.start), ...hunk.lines)
    index = hunk.end
    previous = entry
  }
  out.push(...baseLines.slice(index))
  return out.join('\n')
}

const GENERATED_PLACEHOLDER = '\u0000generated\u0000'

/** Pulls the top level `generated` field out of a document's frontmatter. */
function takeGenerated(text: string): { text: string; generated: string | null } {
  const lines = text.split('\n')
  if (lines[0]?.trim() !== '---') return { text, generated: null }
  const close = lines.findIndex((line, i) => i > 0 && line.trim() === '---')
  if (close < 0) return { text, generated: null }
  const start = lines.findIndex((line, i) => i > 0 && i < close && /^generated\s*:/.test(line))
  if (start < 0) return { text, generated: null }
  let end = start + 1
  while (end < close && /^(\s|$)/.test(lines[end]) && lines[end] !== '') end++
  const generated = lines.slice(start, end).join('\n')
  lines.splice(start, end - start, GENERATED_PLACEHOLDER)
  return { text: lines.join('\n'), generated }
}

/**
 * Merges an OKF document. Every writer stamps `generated` with its own actor
 * and time, so that field alone would make every concurrent edit conflict.
 * It is set aside before merging and the local stamp wins, because the merged
 * result is what this writer commits.
 */
export function mergeDocument(base: string, mine: string, theirs: string): string | null {
  const b = takeGenerated(base)
  const m = takeGenerated(mine)
  const t = takeGenerated(theirs)
  if ([b, m, t].some((part) => part.generated === null)) {
    return mergeText(base, mine, theirs)
  }
  const merged = mergeText(b.text, m.text, t.text)
  if (merged === null) return null
  return merged.replace(GENERATED_PLACEHOLDER, m.generated!)
}
