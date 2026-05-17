import { afterEach, describe, expect, it, vi } from 'vitest'
import { rebuildVaultIndex } from '@/lib/vault-index'
import { MemoryProvider } from '../helpers/memory-provider'

describe('rebuildVaultIndex', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('indexes markdown files, folders, and tags while excluding system files', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-17T12:00:00Z'))
    const provider = new MemoryProvider()
    provider.files.set('Projects/atlas.md', '---\ntags: [project, active]\n---\n# Atlas\n')
    provider.files.set('Daily/2026-05-17.md', '# Daily\n')
    provider.files.set('AGENTS.md', '# system\n')
    provider.files.set('index.md', '# old index\n')
    provider.files.set('.hidden.md', '# hidden\n')

    await rebuildVaultIndex(provider, [
      { path: 'Projects', name: 'Projects', type: 'dir' },
      { path: 'Projects/atlas.md', name: 'atlas.md', type: 'file' },
      { path: 'Daily', name: 'Daily', type: 'dir' },
      { path: 'Daily/2026-05-17.md', name: '2026-05-17.md', type: 'file' },
      { path: 'AGENTS.md', name: 'AGENTS.md', type: 'file' },
      { path: 'index.md', name: 'index.md', type: 'file' },
      { path: '.hidden.md', name: '.hidden.md', type: 'file' },
    ])

    const index = provider.files.get('index.md')
    expect(index).toContain('_Last updated: 2026-05-17_')
    expect(index).toContain('- **Daily/**')
    expect(index).toContain('- [2026-05-17](Daily/2026-05-17.md)')
    expect(index).toContain('- **Projects/**')
    expect(index).toContain('- [atlas](Projects/atlas.md) _[project, active]_')
    expect(index).not.toContain('AGENTS.md')
    expect(index).not.toContain('.hidden.md')
    expect(provider.commits).toEqual([{ message: 'Update vault index', paths: ['index.md'] }])
  })

  it('does not commit when writes already create commits', async () => {
    const provider = new MemoryProvider('github')
    provider.files.set('note.md', '# Note\n')

    await rebuildVaultIndex(provider, [{ path: 'note.md', name: 'note.md', type: 'file' }])

    expect(provider.files.get('index.md')).toContain('[note](note.md)')
    expect(provider.commits).toEqual([])
  })
})
