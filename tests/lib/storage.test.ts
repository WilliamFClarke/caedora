import { describe, expect, it } from 'vitest'
import { listFilesRecursive } from '@/lib/storage'
import { MemoryProvider } from '../helpers/memory-provider'

describe('listFilesRecursive', () => {
  it('uses a single recursive local-provider listing', async () => {
    const provider = new MemoryProvider('local')
    provider.files.set('root.md', '# Root')
    provider.files.set('projects/atlas.md', '# Atlas')

    await expect(listFilesRecursive(provider)).resolves.toEqual([
      { path: 'projects', name: 'projects', type: 'dir' },
      { path: 'projects/atlas.md', name: 'atlas.md', type: 'file' },
      { path: 'root.md', name: 'root.md', type: 'file' },
    ])
  })

  it('walks nested GitHub directory levels', async () => {
    const provider = new MemoryProvider('github')
    provider.files.set('root.md', '# Root')
    provider.files.set('projects/atlas.md', '# Atlas')
    provider.files.set('projects/archive/old.md', '# Old')

    await expect(listFilesRecursive(provider)).resolves.toEqual([
      { path: 'projects', name: 'projects', type: 'dir' },
      { path: 'root.md', name: 'root.md', type: 'file' },
      { path: 'projects/archive', name: 'archive', type: 'dir' },
      { path: 'projects/atlas.md', name: 'atlas.md', type: 'file' },
      { path: 'projects/archive/old.md', name: 'old.md', type: 'file' },
    ])
  })
})
