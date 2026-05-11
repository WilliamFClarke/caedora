/**
 * GitHub Contents API-backed provider. Functionally equivalent to the web
 * app's `lib/storage/github-provider.ts`, trimmed to the surface the MCP
 * needs (no diff/log helpers).
 */
import type { FileEntry, VaultProvider } from './types.js'

const API = 'https://api.github.com'

function apiHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

interface GHContent {
  name: string
  path: string
  type: string
  size: number
  sha: string
  content: string
}

export class GitHubNodeProvider implements VaultProvider {
  readonly type = 'github' as const
  readonly writesAreCommits = true
  private shaCache = new Map<string, string>()

  constructor(
    private token: string,
    public readonly owner: string,
    public readonly repo: string
  ) {}

  private get base() {
    return `${API}/repos/${this.owner}/${this.repo}`
  }

  async readFile(path: string): Promise<string> {
    const res = await fetch(`${this.base}/contents/${encodeURI(path)}`, {
      headers: apiHeaders(this.token),
    })
    if (!res.ok) throw new Error(`GitHub: failed to read ${path} (${res.status})`)
    const data = (await res.json()) as GHContent
    this.shaCache.set(path, data.sha)
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')
  }

  async writeFile(path: string, content: string): Promise<void> {
    const sha = this.shaCache.get(path)
    const body: Record<string, unknown> = {
      message: `Update ${path}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
    }
    if (sha) body.sha = sha
    const res = await fetch(`${this.base}/contents/${encodeURI(path)}`, {
      method: 'PUT',
      headers: apiHeaders(this.token),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`GitHub: failed to write ${path} (${res.status})`)
    const data = (await res.json()) as { content: GHContent }
    this.shaCache.set(path, data.content.sha)
  }

  async listFiles(dir = ''): Promise<FileEntry[]> {
    const url = dir
      ? `${this.base}/contents/${encodeURI(dir)}`
      : `${this.base}/contents`
    const res = await fetch(url, { headers: apiHeaders(this.token) })
    if (res.status === 404) {
      // Empty folder, or an empty repo ("This repository is empty."). Treat
      // both as no entries rather than erroring.
      return []
    }
    if (!res.ok) throw new Error(`GitHub: failed to list ${dir || '/'} (${res.status})`)
    const items = (await res.json()) as GHContent[]
    return (Array.isArray(items) ? items : [items]).map((item) => ({
      path: item.path,
      name: item.name,
      type: item.type === 'dir' ? 'dir' : 'file',
      size: item.size,
    }))
  }

  async renamePath(from: string, to: string): Promise<void> {
    const files = await this._listAllDescendantFiles(from)
    if (files.length === 0) {
      const content = await this.readFile(from)
      await this.writeFile(to, content)
      await this._deleteFile(from)
      return
    }
    for (const filePath of files) {
      const content = await this.readFile(filePath)
      const newPath = `${to}${filePath.slice(from.length)}`
      await this.writeFile(newPath, content)
      await this._deleteFile(filePath)
    }
  }

  async deletePath(path: string): Promise<void> {
    const files = await this._listAllDescendantFiles(path)
    if (files.length === 0) {
      await this._deleteFile(path)
      return
    }
    for (const filePath of files) {
      await this._deleteFile(filePath)
    }
  }

  async commit(): Promise<string> {
    return ''
  }

  private async _deleteFile(path: string): Promise<void> {
    const sha = this.shaCache.get(path) ?? (await this._fetchSha(path))
    const res = await fetch(`${this.base}/contents/${encodeURI(path)}`, {
      method: 'DELETE',
      headers: apiHeaders(this.token),
      body: JSON.stringify({ message: `Delete ${path}`, sha }),
    })
    if (!res.ok) throw new Error(`GitHub: failed to delete ${path} (${res.status})`)
    this.shaCache.delete(path)
  }

  private async _fetchSha(path: string): Promise<string> {
    const res = await fetch(`${this.base}/contents/${encodeURI(path)}`, {
      headers: apiHeaders(this.token),
    })
    if (!res.ok) throw new Error(`GitHub: failed to get SHA for ${path}`)
    const data = (await res.json()) as GHContent
    this.shaCache.set(path, data.sha)
    return data.sha
  }

  private async _listAllDescendantFiles(path: string): Promise<string[]> {
    const out: string[] = []
    const queue = [path]
    while (queue.length > 0) {
      const current = queue.shift()!
      let entries: FileEntry[]
      try {
        entries = await this.listFiles(current)
      } catch {
        return out
      }
      for (const e of entries) {
        if (e.type === 'dir') queue.push(e.path)
        else out.push(e.path)
      }
    }
    return out
  }
}
