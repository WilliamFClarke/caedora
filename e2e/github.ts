import { createHash } from 'node:crypto'
import { expect, type Page, type Route } from '@playwright/test'

export interface FakeCommit {
  path: string
  message: string
  content: string
}

/**
 * An in-memory stand in for the parts of the GitHub REST API the GitHub
 * provider uses. Writes check the blob SHA as GitHub does, so a write based
 * on an old read gets a 409. `commit` changes a file as another writer would.
 */
export class FakeGitHub {
  readonly files = new Map<string, string>()
  readonly commits: FakeCommit[] = []

  constructor(
    readonly owner: string,
    readonly repo: string,
    files: Record<string, string>
  ) {
    for (const [path, content] of Object.entries(files)) this.files.set(path, content)
  }

  /** Someone else, such as the sync workflow, commits a new version of a file. */
  commit(path: string, content: string, message = `Update ${path}`) {
    this.files.set(path, content)
    this.commits.push({ path, message, content })
  }

  read(path: string): string {
    const content = this.files.get(path)
    if (content === undefined) throw new Error(`${path} is not in the fake repository`)
    return content
  }

  async install(page: Page) {
    await page.route('https://api.github.com/**', (route) => this.handle(route))
  }

  private handle(route: Route) {
    const request = route.request()
    const url = new URL(request.url())
    const base = `/repos/${this.owner}/${this.repo}`
    if (url.pathname === base) {
      return route.fulfill({ json: { default_branch: 'main' } })
    }
    if (url.pathname === `${base}/commits`) return route.fulfill({ json: [] })
    if (url.pathname === `${base}/contents` || url.pathname.startsWith(`${base}/contents/`)) {
      const path = decodeURIComponent(url.pathname.slice(`${base}/contents`.length).replace(/^\//, ''))
      const method = request.method()
      if (method === 'GET') return this.get(route, path)
      if (method === 'PUT') return this.put(route, path, request.postDataJSON())
      if (method === 'DELETE') return this.delete(route, path, request.postDataJSON())
    }
    return route.fulfill({ status: 404, json: { message: 'Not Found' } })
  }

  private get(route: Route, path: string) {
    const content = this.files.get(path)
    if (content !== undefined) {
      return route.fulfill({
        json: {
          name: path.split('/').pop(),
          path,
          type: 'file',
          size: Buffer.byteLength(content),
          sha: sha(content),
          content: Buffer.from(content).toString('base64'),
        },
      })
    }
    const prefix = path ? `${path}/` : ''
    const children = new Map<string, { name: string; path: string; type: string; size: number; sha: string }>()
    for (const [file, text] of this.files) {
      if (!file.startsWith(prefix)) continue
      const [name, ...rest] = file.slice(prefix.length).split('/')
      const childPath = `${prefix}${name}`
      if (rest.length > 0) {
        children.set(childPath, { name, path: childPath, type: 'dir', size: 0, sha: sha(childPath) })
      } else {
        children.set(childPath, { name, path: childPath, type: 'file', size: Buffer.byteLength(text), sha: sha(text) })
      }
    }
    if (children.size === 0) return route.fulfill({ status: 404, json: { message: 'Not Found' } })
    return route.fulfill({ json: [...children.values()] })
  }

  private put(route: Route, path: string, body: { message: string; content: string; sha?: string }) {
    const current = this.files.get(path)
    if (current !== undefined && !body.sha) {
      return route.fulfill({ status: 422, json: { message: '"sha" wasn\'t supplied.' } })
    }
    if (current !== undefined && body.sha !== sha(current)) {
      return route.fulfill({ status: 409, json: { message: `${path} does not match ${body.sha}` } })
    }
    const content = Buffer.from(body.content, 'base64').toString('utf8')
    this.commit(path, content, body.message)
    return route.fulfill({
      status: current === undefined ? 201 : 200,
      json: { content: { name: path.split('/').pop(), path, sha: sha(content), size: Buffer.byteLength(content) } },
    })
  }

  private delete(route: Route, path: string, body: { sha?: string }) {
    const current = this.files.get(path)
    if (current === undefined) return route.fulfill({ status: 404, json: { message: 'Not Found' } })
    if (body.sha !== sha(current)) return route.fulfill({ status: 409, json: { message: 'Conflict' } })
    this.files.delete(path)
    return route.fulfill({ json: { commit: {} } })
  }
}

function sha(text: string): string {
  return createHash('sha1').update(text).digest('hex')
}

/**
 * Opens `path` from a GitHub vault served by `github`. The vault is stored in
 * IndexedDB the way the connect flow leaves it, with autosave every second.
 */
export async function openGitHubVault(page: Page, github: FakeGitHub, path: string) {
  await github.install(page)
  await page.goto('/')
  await page.evaluate(
    async ({ owner, repo }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open('caedora', 4)
        open.onupgradeneeded = () => {
          for (const store of ['vault-state', 'pinned', 'vaults', 'vault-meta', 'app-settings']) {
            if (!open.result.objectStoreNames.contains(store)) open.result.createObjectStore(store)
          }
        }
        open.onsuccess = () => resolve(open.result)
        open.onerror = () => reject(open.error)
      })
      const id = `github:${owner}/${repo}`
      const tx = db.transaction(['vaults', 'vault-meta', 'app-settings'], 'readwrite')
      tx.objectStore('vaults').put(
        { type: 'github', githubAuth: 'pat', githubPat: 'test-token', githubOwner: owner, githubRepo: repo, lastOpenedAt: Date.now() },
        id
      )
      tx.objectStore('vault-meta').put(id, 'activeVaultId')
      tx.objectStore('app-settings').put({ syncIntervalMs: 1_000 }, 'current')
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },
    { owner: github.owner, repo: github.repo }
  )
  await page.goto(`/vault/${path}`)
  await expect(page.getByRole('main')).toBeVisible({ timeout: 30_000 })
}

/** Makes the vault poll now, as it does when the tab becomes visible again. */
export async function pollVault(page: Page) {
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
}
