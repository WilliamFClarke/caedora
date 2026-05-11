/**
 * Trimmed VaultProvider interface for the MCP server. Mirrors
 * `lib/types.ts` in the web app but only declares the subset the MCP
 * actually needs (no diff/log helpers).
 */

export interface FileEntry {
  path: string
  name: string
  type: 'file' | 'dir'
  size?: number
  lastModified?: number
}

export interface VaultProvider {
  readonly type: 'local' | 'github'
  readonly writesAreCommits: boolean

  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  listFiles(dir?: string): Promise<FileEntry[]>
  renamePath(from: string, to: string): Promise<void>
  deletePath(path: string): Promise<void>
  commit(message: string, paths: string[]): Promise<string>
}

/** Walks a provider and returns every file/dir underneath root. */
export async function listFilesRecursive(provider: VaultProvider): Promise<FileEntry[]> {
  const out: FileEntry[] = []
  const queue: string[] = ['']
  while (queue.length) {
    const dir = queue.shift()!
    const entries = await provider.listFiles(dir)
    for (const e of entries) {
      out.push(e)
      if (e.type === 'dir') queue.push(e.path)
    }
  }
  return out
}
