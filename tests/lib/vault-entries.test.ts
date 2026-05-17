import { describe, expect, it } from 'vitest'
import {
  ancestors,
  entriesForPaths,
  mergeEntries,
  pendingEntriesForPaths,
  pruneVisiblePending,
  removeExactPendingEntries,
  removePendingEntries,
  renamePendingEntries,
  sameEntries,
} from '@/lib/vault-entries'

describe('vault entry helpers', () => {
  it('creates folder ancestors for incoming paths', () => {
    expect(entriesForPaths(['projects/atlas/brief.md'])).toEqual({
      projects: { path: 'projects', name: 'projects', type: 'dir' },
      'projects/atlas': { path: 'projects/atlas', name: 'atlas', type: 'dir' },
      'projects/atlas/brief.md': {
        path: 'projects/atlas/brief.md',
        name: 'brief.md',
        type: 'file',
      },
    })
  })

  it('tracks, renames, prunes, and removes pending entries', () => {
    const pending = pendingEntriesForPaths(['projects/atlas.md'])
    expect(Object.values(pending).every((entry) => entry.pending)).toBe(true)
    expect(renamePendingEntries(pending, 'projects', 'work')).toHaveProperty('work/atlas.md')
    expect(removePendingEntries(pending, 'projects')).toEqual({})
    expect(removeExactPendingEntries(pending, ['projects/atlas.md'])).toEqual({})
    expect(pruneVisiblePending(pending, [{ path: 'projects', name: 'projects', type: 'dir' }]))
      .toEqual({
        'projects/atlas.md': {
          path: 'projects/atlas.md',
          name: 'atlas.md',
          type: 'file',
          pending: true,
        },
      })
  })

  it('merges entries and compares stable trees', () => {
    const current = [{ path: 'a.md', name: 'a.md', type: 'file' as const }]
    const merged = mergeEntries(current, entriesForPaths(['b.md']))
    expect(merged).toHaveLength(2)
    expect(sameEntries(current, [...current])).toBe(true)
    expect(sameEntries(current, merged)).toBe(false)
    expect(ancestors('a/b/c.md')).toEqual(['a', 'a/b'])
  })
})
