import { buildDiffResult } from '../diff'
import { assertValidOkfDocument, isMarkdownPath } from '../okf'
import type { VaultProvider, FileEntry, CommitEntry, DiffResult, ReadFileOptions, WriteFileOptions } from '../types'
import { WriteConflictError } from './conflict'

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

  async readFile(path: string, options?: ReadFileOptions): Promise<string> {
    const res = await fetch(`${this.base}/contents/${path}`, {
      headers: apiHeaders(this.token),
      // GitHub lets browsers cache contents for a minute, which would hide a
      // commit the file listing has already shown us.
      ...(options?.fresh ? { cache: 'no-store' as const } : {}),
    })
    if (!res.ok) throw new Error(`GitHub: failed to read ${path} (${res.status})`)
    const data = (await res.json()) as GHContent
    this.shaCache.set(path, data.sha)
    return decodeContent(data.content)
  }

  async writeFile(path: string, content: string, options?: WriteFileOptions): Promise<void> {
    if (isMarkdownPath(path)) assertValidOkfDocument(path, content)
    // Other reads (the catalogue, dashboards) refresh the SHA cache, so when
    // the caller says which text it edited, send that text's own blob SHA.
    // GitHub then refuses the write if anyone has committed since.
    let sha =
      options?.baseContent !== undefined
        ? await gitBlobSha(options.baseContent)
        : this.shaCache.get(path)
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this._put(path, content, sha, options?.message)
      // 409: the SHA is no longer the file's head, because another writer
      // committed since. 422: the file exists but we sent no SHA.
      if (res.status === 409 || res.status === 422) {
        const remote = await this._readFresh(path)
        if (remote === null) throw new Error(`GitHub: failed to write ${path} (${res.status})`)
        // Same text under another SHA (a byte order mark, say): not a conflict.
        if (options?.baseContent !== undefined && remote === options.baseContent && attempt === 0) {
          sha = this.shaCache.get(path)
          continue
        }
        throw new WriteConflictError(path, 'GitHub', remote)
      }
      if (!res.ok) throw new Error(`GitHub: failed to write ${path} (${res.status})`)
      const data = (await res.json()) as { content: GHContent }
      this.shaCache.set(path, data.content.sha)
      return
    }
  }

  private _put(
    path: string,
    content: string,
    sha: string | undefined,
    message = `Update ${path}`
  ): Promise<Response> {
    const body: Record<string, unknown> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
    }
    if (sha) body.sha = sha
    return fetch(`${this.base}/contents/${path}`, {
      method: 'PUT',
      headers: apiHeaders(this.token),
      body: JSON.stringify(body),
    })
  }

  private async _readFresh(path: string): Promise<string | null> {
    try {
      return await this.readFile(path, { fresh: true })
    } catch {
      return null
    }
  }

  async deleteFile(path: string): Promise<void> {
    for (let attempt = 0; attempt < 4; attempt++) {
      let sha: string
      try {
        sha = attempt === 0
          ? this.shaCache.get(path) ?? (await this._fetchSha(path))
          : await this._fetchSha(path)
      } catch (err) {
        if (err instanceof Error && err.message.includes('(404)')) {
          this.shaCache.delete(path)
          return
        }
        throw err
      }
      const res = await fetch(`${this.base}/contents/${path}`, {
        method: 'DELETE',
        headers: apiHeaders(this.token),
        body: JSON.stringify({ message: `Delete ${path}`, sha }),
      })
      if (res.ok) {
        this.shaCache.delete(path)
        return
      }
      if (res.status === 404) {
        this.shaCache.delete(path)
        return
      }
      this.shaCache.delete(path)
      if (res.status !== 409 && res.status !== 422) {
        throw new Error(`GitHub: failed to delete ${path} (${res.status})`)
      }
      await delay(350 * (attempt + 1))
    }
    throw new Error(`GitHub: failed to delete ${path} after retrying`)
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
    for (const filePath of files.sort((a, b) => b.localeCompare(a))) {
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
    if (!res.ok) throw new Error(`GitHub: failed to get SHA for ${path} (${res.status})`)
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
      version: item.sha,
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

/** Git's id for a file's content: SHA-1 of "blob <bytes>\0" and the bytes. */
export async function gitBlobSha(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`)
  const data = new Uint8Array(header.length + bytes.length)
  data.set(header)
  data.set(bytes, header.length)
  const digest = await crypto.subtle.digest('SHA-1', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function decodeContent(base64: string): string {
  // `atob` returns a "binary string" of bytes; re-interpret as UTF-8 so
  // non-ASCII characters (em-dash, emoji, accented letters) round-trip
  // correctly instead of coming back as mojibake.
  const binary = atob(base64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
