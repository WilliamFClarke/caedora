import type { FileEntry, VaultProvider } from '../providers/types.js'

/** An in-memory vault for tests. Commits are recorded, not made. */
export class MemoryProvider implements VaultProvider {
  readonly type = 'local' as const
  readonly writesAreCommits = false
  files = new Map<string, string>()
  commits: Array<{ message: string; paths: string[] }> = []

  async readFile(path: string): Promise<string> {
    const value = this.files.get(path)
    if (value === undefined) throw new Error(`ENOENT: ${path}`)
    return value
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content)
  }

  async listFiles(dir = ''): Promise<FileEntry[]> {
    const out: FileEntry[] = []
    const seenDirs = new Set<string>()
    for (const path of this.files.keys()) {
      if (dir && !path.startsWith(`${dir}/`)) continue
      const rest = dir ? path.slice(dir.length + 1) : path
      const slash = rest.indexOf('/')
      if (slash === -1) {
        out.push({ path, name: path.split('/').pop()!, type: 'file' })
      } else {
        const name = rest.slice(0, slash)
        const directoryPath = dir ? `${dir}/${name}` : name
        if (!seenDirs.has(directoryPath)) {
          seenDirs.add(directoryPath)
          out.push({ path: directoryPath, name, type: 'dir' })
        }
      }
    }
    return out
  }

  async renamePath(from: string, to: string): Promise<void> {
    const content = this.files.get(from)
    if (content === undefined) throw new Error(`ENOENT: ${from}`)
    this.files.delete(from)
    this.files.set(to, content)
  }

  async deletePath(path: string): Promise<void> {
    this.files.delete(path)
    for (const key of [...this.files.keys()]) {
      if (key.startsWith(`${path}/`)) this.files.delete(key)
    }
  }

  async commit(message: string, paths: string[]): Promise<string> {
    this.commits.push({ message, paths })
    return 'memory'
  }
}
