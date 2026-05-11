import { promises as fs } from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { FileEntry, VaultProvider } from './types.js'

const execFileAsync = promisify(execFile)

/**
 * Node-based VaultProvider that reads and writes an on-disk vault folder.
 * Commits are performed by shelling out to `git` — small, stateless, and
 * avoids pulling in isomorphic-git for Node where real git is already
 * installed.
 *
 * If the folder isn't a git repo, writes still succeed; commits become no-ops
 * (after logging a warning) so the MCP works on folders the user hasn't
 * initialised yet.
 */
export class LocalNodeProvider implements VaultProvider {
  readonly type = 'local' as const
  readonly writesAreCommits = false

  constructor(private readonly root: string) {}

  private abs(rel: string): string {
    if (path.isAbsolute(rel)) {
      throw new Error(`Vault paths must be relative: received ${rel}`)
    }
    const resolved = path.resolve(this.root, rel)
    if (!resolved.startsWith(path.resolve(this.root))) {
      throw new Error(`Path escapes vault root: ${rel}`)
    }
    return resolved
  }

  async readFile(rel: string): Promise<string> {
    return fs.readFile(this.abs(rel), 'utf8')
  }

  async writeFile(rel: string, content: string): Promise<void> {
    const full = this.abs(rel)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, content, 'utf8')
  }

  async listFiles(rel = ''): Promise<FileEntry[]> {
    const dirAbs = this.abs(rel)
    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true })
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw e
    }
    const out: FileEntry[] = []
    for (const dirent of entries) {
      if (dirent.name === '.git') continue
      const p = rel ? `${rel}/${dirent.name}` : dirent.name
      if (dirent.isDirectory()) {
        out.push({ path: p, name: dirent.name, type: 'dir' })
      } else if (dirent.isFile()) {
        const stat = await fs.stat(path.join(dirAbs, dirent.name))
        out.push({
          path: p,
          name: dirent.name,
          type: 'file',
          size: stat.size,
          lastModified: stat.mtimeMs,
        })
      }
    }
    return out
  }

  async renamePath(from: string, to: string): Promise<void> {
    const fromAbs = this.abs(from)
    const toAbs = this.abs(to)
    await fs.mkdir(path.dirname(toAbs), { recursive: true })
    await fs.rename(fromAbs, toAbs)
  }

  async deletePath(rel: string): Promise<void> {
    const full = this.abs(rel)
    await fs.rm(full, { recursive: true, force: true })
  }

  async commit(message: string, paths: string[]): Promise<string> {
    // If the folder isn't a git repo, silently skip — LocalNodeProvider still
    // functions as a plain filesystem backend in that case.
    try {
      await execFileAsync('git', ['rev-parse', '--git-dir'], { cwd: this.root })
    } catch {
      return ''
    }
    if (paths.length > 0) {
      await execFileAsync('git', ['add', '--', ...paths], { cwd: this.root })
    } else {
      await execFileAsync('git', ['add', '-A'], { cwd: this.root })
    }
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['commit', '-m', message, '--author', 'caedora-mcp <mcp@caedora>'],
        { cwd: this.root }
      )
      const match = stdout.match(/\[[^\]]*\s([0-9a-f]{7,})\]/)
      return match ? match[1] : ''
    } catch (e: unknown) {
      const stderr = (e as { stderr?: string }).stderr ?? ''
      // Nothing to commit is not an error for our callers.
      if (/nothing to commit/i.test(stderr)) return ''
      throw e
    }
  }
}
