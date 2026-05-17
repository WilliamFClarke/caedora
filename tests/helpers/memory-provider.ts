import type { CommitEntry, DiffResult, FileEntry, VaultProvider } from '@/lib/types'

export class MemoryProvider implements VaultProvider {
  readonly type: 'local' | 'github'
  readonly writesAreCommits: boolean
  readonly files = new Map<string, string>()
  readonly commits: Array<{ message: string; paths: string[] }> = []

  constructor(type: 'local' | 'github' = 'local') {
    this.type = type
    this.writesAreCommits = type === 'github'
  }

  isReady(): boolean {
    return true
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path)
    if (content === undefined) throw new Error(`ENOENT: ${path}`)
    return content
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content)
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(path)
  }

  async listFiles(dir = ''): Promise<FileEntry[]> {
    if (this.type === 'local') {
      const out: FileEntry[] = []
      const dirs = new Set<string>()
      for (const path of this.files.keys()) {
        if (dir && !path.startsWith(`${dir}/`)) continue
        const parts = path.split('/')
        for (let i = 1; i < parts.length; i++) {
          const childPath = parts.slice(0, i).join('/')
          if (!dirs.has(childPath)) {
            dirs.add(childPath)
            out.push({ path: childPath, name: parts[i - 1], type: 'dir' })
          }
        }
        out.push({ path, name: parts.at(-1) ?? path, type: 'file' })
      }
      return out.sort((a, b) => a.path.localeCompare(b.path))
    }

    const out: FileEntry[] = []
    const dirs = new Set<string>()
    for (const path of this.files.keys()) {
      if (dir && !path.startsWith(`${dir}/`)) continue
      const rest = dir ? path.slice(dir.length + 1) : path
      const slash = rest.indexOf('/')
      if (slash === -1) {
        out.push({ path, name: path.split('/').pop() ?? path, type: 'file' })
      } else {
        const name = rest.slice(0, slash)
        const childPath = dir ? `${dir}/${name}` : name
        if (!dirs.has(childPath)) {
          dirs.add(childPath)
          out.push({ path: childPath, name, type: 'dir' })
        }
      }
    }
    return out.sort((a, b) => a.path.localeCompare(b.path))
  }

  async renamePath(from: string, to: string): Promise<void> {
    for (const [path, content] of [...this.files.entries()]) {
      if (path === from || path.startsWith(`${from}/`)) {
        this.files.delete(path)
        this.files.set(`${to}${path.slice(from.length)}`, content)
      }
    }
  }

  async deletePath(path: string): Promise<void> {
    for (const key of [...this.files.keys()]) {
      if (key === path || key.startsWith(`${path}/`)) this.files.delete(key)
    }
  }

  async commit(message: string, paths: string[]): Promise<string> {
    this.commits.push({ message, paths })
    return 'memory'
  }

  async log(): Promise<CommitEntry[]> {
    return []
  }

  async diff(): Promise<DiffResult> {
    return { hunks: [], oldContent: '', newContent: '' }
  }

  async currentBranch(): Promise<string> {
    return 'main'
  }
}
