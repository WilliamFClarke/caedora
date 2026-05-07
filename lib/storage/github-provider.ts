import { buildDiffResult } from '../diff'
import type { VaultProvider, FileEntry, CommitEntry, DiffResult } from '../types'

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
  patch?: string
}

export class GitHubProvider implements VaultProvider {
  readonly type = 'github' as const
  readonly writesAreCommits = true
  /** SHA cache so writes don't need an extra GET. path → blob SHA */
  private shaCache = new Map<string, string>()

  constructor(
    private token: string,
    public readonly owner: string,
    public readonly repo: string
  ) {}

  isReady(): boolean {
    return true
  }

  private get base() {
    return `${API}/repos/${this.owner}/${this.repo}`
  }

  async readFile(path: string): Promise<string> {
    const res = await fetch(`${this.base}/contents/${path}`, {
      headers: apiHeaders(this.token),
    })
    if (!res.ok) throw new Error(`GitHub: failed to read ${path} (${res.status})`)
    const data = (await res.json()) as GHContent
    this.shaCache.set(path, data.sha)
    // `atob` returns a "binary string" of bytes; re-interpret as UTF-8 so
    // non-ASCII characters (em-dash, emoji, accented letters) round-trip
    // correctly instead of coming back as mojibake.
    const binary = atob(data.content.replace(/\n/g, ''))
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  }

  async writeFile(path: string, content: string): Promise<void> {
    const sha = this.shaCache.get(path)
    const body: Record<string, unknown> = {
      message: `Update ${path}`,
      content: btoa(unescape(encodeURIComponent(content))),
    }
    if (sha) body.sha = sha
    const res = await fetch(`${this.base}/contents/${path}`, {
      method: 'PUT',
      headers: apiHeaders(this.token),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`GitHub: failed to write ${path} (${res.status})`)
    const data = (await res.json()) as { content: GHContent }
    this.shaCache.set(path, data.content.sha)
  }

  async deleteFile(path: string): Promise<void> {
    const sha = this.shaCache.get(path) ?? (await this._fetchSha(path))
    const res = await fetch(`${this.base}/contents/${path}`, {
      method: 'DELETE',
      headers: apiHeaders(this.token),
      body: JSON.stringify({ message: `Delete ${path}`, sha }),
    })
    if (!res.ok) throw new Error(`GitHub: failed to delete ${path} (${res.status})`)
    this.shaCache.delete(path)
  }

  async renamePath(from: string, to: string): Promise<void> {
    const files = await this._listAllDescendantFiles(from)
    if (files.length === 0) {
      const content = await this.readFile(from)
      await this.writeFile(to, content)
      await this.deleteFile(from)
      return
    }
    for (const filePath of files) {
      const content = await this.readFile(filePath)
      const newPath = `${to}${filePath.slice(from.length)}`
      await this.writeFile(newPath, content)
      await this.deleteFile(filePath)
    }
  }

  async deletePath(path: string): Promise<void> {
    const files = await this._listAllDescendantFiles(path)
    if (files.length === 0) {
      await this.deleteFile(path)
      return
    }
    for (const filePath of files) {
      await this.deleteFile(filePath)
    }
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

  private async _fetchSha(path: string): Promise<string> {
    const res = await fetch(`${this.base}/contents/${path}`, {
      headers: apiHeaders(this.token),
    })
    if (!res.ok) throw new Error(`GitHub: failed to get SHA for ${path}`)
    const data = (await res.json()) as GHContent
    this.shaCache.set(path, data.sha)
    return data.sha
  }

  async listFiles(dir = ''): Promise<FileEntry[]> {
    const url = dir
      ? `${this.base}/contents/${dir}`
      : `${this.base}/contents`
    const res = await fetch(url, { headers: apiHeaders(this.token) })
    if (res.status === 404) {
      // Two benign causes both yield 404:
      //  - the folder genuinely doesn't exist yet (user hasn't created it)
      //  - the repo has no commits (`"This repository is empty."`)
      // Either way we return an empty list so the UI shows an empty vault
      // rather than blowing up.
      return []
    }
    if (!res.ok) throw new Error(`GitHub: failed to list ${dir || '/'} (${res.status})`)
    const items = (await res.json()) as GHContent[]
    return (Array.isArray(items) ? items : [items]).map((item) => ({
      path: item.path,
      name: item.name,
      type: (item.type === 'dir' ? 'dir' : 'file') as 'file' | 'dir',
      size: item.size,
    }))
  }

  /** GitHub: each writeFile is already a commit — no-op here. */
  async commit(): Promise<string> {
    return ''
  }

  async log(path?: string, limit = 50): Promise<CommitEntry[]> {
    const url = new URL(`${this.base}/commits`)
    if (path) url.searchParams.set('path', path)
    url.searchParams.set('per_page', String(Math.min(limit, 100)))
    const res = await fetch(url.toString(), { headers: apiHeaders(this.token) })
    if (!res.ok) throw new Error(`GitHub: failed to fetch log (${res.status})`)
    const commits = await res.json() as Array<{
      sha: string
      commit: { message: string; author: { name: string; email: string; date: string } }
      parents: Array<{ sha: string }>
    }>
    return commits.map((c) => ({
      oid: c.sha,
      message: c.commit.message.trim(),
      author: {
        name: c.commit.author.name,
        email: c.commit.author.email,
        timestamp: Math.floor(new Date(c.commit.author.date).getTime() / 1000),
      },
      parents: c.parents.map((p) => p.sha),
    }))
  }

  async diff(oid: string, path: string): Promise<DiffResult> {
    const res = await fetch(`${this.base}/commits/${oid}`, {
      headers: apiHeaders(this.token),
    })
    if (!res.ok) return buildDiffResult('', '', path)
    const commit = await res.json() as { files?: Array<{ filename: string; patch?: string }> }
    const file = commit.files?.find((f) => f.filename === path)
    if (!file?.patch) return buildDiffResult('', '', path)

    // Parse the unified diff patch from GitHub
    const lines = file.patch.split('\n')
    const hunks: DiffResult['hunks'] = []
    let current: DiffResult['hunks'][number] | null = null
    for (const line of lines) {
      if (line.startsWith('@@')) {
        if (current) hunks.push(current)
        current = { header: line, lines: [] }
      } else if (current) {
        current.lines.push({
          type: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'context',
          content: line.slice(1),
        })
      }
    }
    if (current) hunks.push(current)
    return { hunks, oldContent: '', newContent: '' }
  }

  async currentBranch(): Promise<string> {
    const res = await fetch(this.base, { headers: apiHeaders(this.token) })
    if (!res.ok) return 'main'
    const data = await res.json() as { default_branch?: string }
    return data.default_branch ?? 'main'
  }
}
