import type { FileEntry } from './types'

export function sameEntries(a: FileEntry[], b: FileEntry[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].path !== b[i].path || a[i].type !== b[i].type) return false
  }
  return true
}

export function pendingEntriesForPaths(paths: string[]): Record<string, FileEntry> {
  const out = entriesForPaths(paths)
  for (const entry of Object.values(out)) {
    entry.pending = true
  }
  return out
}

export function entriesForPaths(paths: string[]): Record<string, FileEntry> {
  const out: Record<string, FileEntry> = {}
  for (const path of paths) {
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join('/')
      out[folderPath] = {
        path: folderPath,
        name: parts[i - 1],
        type: 'dir',
      }
    }
    out[path] = {
      path,
      name: parts.at(-1) ?? path,
      type: 'file',
    }
  }
  return out
}

export function mergeEntries(
  current: FileEntry[],
  incoming: Record<string, FileEntry>
): FileEntry[] {
  const byPath = new Map(current.map((entry) => [entry.path, entry]))
  for (const [path, entry] of Object.entries(incoming)) {
    byPath.set(path, entry)
  }
  return [...byPath.values()]
}

export function pruneVisiblePending(
  pending: Record<string, FileEntry>,
  visibleEntries: FileEntry[]
): Record<string, FileEntry> {
  const visible = new Set(visibleEntries.map((entry) => entry.path))
  const next: Record<string, FileEntry> = {}
  for (const [path, entry] of Object.entries(pending)) {
    if (!visible.has(path)) next[path] = entry
  }
  return next
}

export function renamePendingEntries(
  pending: Record<string, FileEntry>,
  from: string,
  to: string
): Record<string, FileEntry> {
  const next: Record<string, FileEntry> = {}
  for (const [path, entry] of Object.entries(pending)) {
    if (path === from || path.startsWith(`${from}/`)) {
      const newPath = path === from ? to : `${to}${path.slice(from.length)}`
      next[newPath] = {
        ...entry,
        path: newPath,
        name: newPath.split('/').pop() ?? newPath,
      }
    } else {
      next[path] = entry
    }
  }
  return next
}

export function removePendingEntries(
  pending: Record<string, FileEntry>,
  path: string
): Record<string, FileEntry> {
  const next: Record<string, FileEntry> = {}
  for (const [entryPath, entry] of Object.entries(pending)) {
    if (entryPath !== path && !entryPath.startsWith(`${path}/`)) {
      next[entryPath] = entry
    }
  }
  return next
}

export function removeExactPendingEntries(
  pending: Record<string, FileEntry>,
  paths: string[]
): Record<string, FileEntry> {
  const remove = new Set<string>()
  for (const path of paths) {
    remove.add(path)
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) {
      remove.add(parts.slice(0, i).join('/'))
    }
  }
  const next: Record<string, FileEntry> = {}
  for (const [path, entry] of Object.entries(pending)) {
    if (!remove.has(path)) next[path] = entry
  }
  return next
}

export function ancestors(path: string): string[] {
  const parts = path.split('/')
  const out: string[] = []
  for (let i = 1; i < parts.length; i++) {
    out.push(parts.slice(0, i).join('/'))
  }
  return out
}
