import { openDB, type IDBPDatabase } from 'idb'
import { buildDiffResult } from '../diff'
import { assertValidOkfDocument, isMarkdownPath } from '../okf'
import type { CommitEntry, DiffResult, FileEntry, VaultProvider } from '../types'

const DB_NAME = 'caedora-browser-bundles'
const DB_VERSION = 2
const BUNDLES_STORE = 'bundles'
const FILES_STORE = 'files'
const COMMITS_STORE = 'commits'

export interface BrowserBundleRecord {
  bundleId: string
  name: string
  updatedAt: number
}

interface BrowserFileRecord {
  key: string
  bundleId: string
  path: string
  content: string
  size: number
  lastModified: number
}

interface BrowserCommitRecord {
  key: string
  bundleId: string
  oid: string
  message: string
  paths: string[]
  timestamp: number
}

export class BrowserBundleProvider implements VaultProvider {
  readonly type = 'browser' as const
  readonly writesAreCommits = false
  private db: IDBPDatabase | null = null

  constructor(
    public readonly bundleId: string,
    public readonly bundleName: string
  ) {}

  async init(): Promise<void> {
    this.db = await openBrowserBundleDB()
    await this.database.put(BUNDLES_STORE, {
      bundleId: this.bundleId,
      name: this.bundleName,
      updatedAt: Date.now(),
    } satisfies BrowserBundleRecord)
  }

  isReady(): boolean {
    return this.db !== null
  }

  async readFile(path: string): Promise<string> {
    const record = await this.database.get(FILES_STORE, this.fileKey(path)) as BrowserFileRecord | undefined
    if (!record) throw new Error(`Browser vault: missing ${path}`)
    return record.content
  }

  async writeFile(path: string, content: string): Promise<void> {
    const clean = cleanPath(path)
    if (isMarkdownPath(clean)) assertValidOkfDocument(clean, content)
    const now = Date.now()
    await this.database.put(FILES_STORE, {
      key: this.fileKey(clean),
      bundleId: this.bundleId,
      path: clean,
      content,
      size: new Blob([content]).size,
      lastModified: now,
    } satisfies BrowserFileRecord)
  }

  async deleteFile(path: string): Promise<void> {
    await this.database.delete(FILES_STORE, this.fileKey(path))
  }

  async listFiles(dir = ''): Promise<FileEntry[]> {
    const prefix = cleanPath(dir)
    const files = await this.allFiles()
    const out = new Map<string, FileEntry>()

    for (const file of files) {
      if (prefix && file.path !== prefix && !file.path.startsWith(`${prefix}/`)) continue
      const relative = prefix ? file.path.slice(prefix.length).replace(/^\/+/, '') : file.path
      if (!relative) {
        out.set(file.path, fileEntry(file))
        continue
      }

      const parts = relative.split('/')
      let current = prefix
      for (let index = 0; index < parts.length - 1; index++) {
        current = current ? `${current}/${parts[index]}` : parts[index]
        out.set(current, {
          path: current,
          name: parts[index],
          type: 'dir',
        })
      }
      out.set(file.path, fileEntry(file))
    }

    return [...out.values()].sort((a, b) => a.path.localeCompare(b.path))
  }

  async renamePath(from: string, to: string): Promise<void> {
    const cleanFrom = cleanPath(from)
    const cleanTo = cleanPath(to)
    const files = await this.allFiles()
    const affected = files.filter(
      (file) => file.path === cleanFrom || file.path.startsWith(`${cleanFrom}/`)
    )
    if (affected.length === 0) return

    const tx = this.database.transaction(FILES_STORE, 'readwrite')
    for (const file of affected) {
      const nextPath = file.path === cleanFrom
        ? cleanTo
        : `${cleanTo}${file.path.slice(cleanFrom.length)}`
      await tx.store.delete(file.key)
      await tx.store.put({
        ...file,
        key: this.fileKey(nextPath),
        path: nextPath,
        lastModified: Date.now(),
      } satisfies BrowserFileRecord)
    }
    await tx.done
  }

  async deletePath(path: string): Promise<void> {
    const clean = cleanPath(path)
    const files = await this.allFiles()
    const tx = this.database.transaction(FILES_STORE, 'readwrite')
    for (const file of files) {
      if (file.path === clean || file.path.startsWith(`${clean}/`)) {
        await tx.store.delete(file.key)
      }
    }
    await tx.done
  }

  async commit(message: string, paths: string[]): Promise<string> {
    const oid = `browser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const timestamp = Math.floor(Date.now() / 1000)
    await this.database.put(COMMITS_STORE, {
      key: this.commitKey(oid),
      bundleId: this.bundleId,
      oid,
      message,
      paths,
      timestamp,
    } satisfies BrowserCommitRecord)
    return oid
  }

  async log(path?: string, limit = 50): Promise<CommitEntry[]> {
    const records = (await this.database.getAll(COMMITS_STORE) as BrowserCommitRecord[])
      .filter((record) => record.bundleId === this.bundleId)
      .filter((record) => !path || record.paths.includes(path))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)

    return records.map((record) => ({
      oid: record.oid,
      message: record.message,
      author: {
        name: 'caedora',
        email: 'browser@caedora',
        timestamp: record.timestamp,
      },
      parents: [],
    }))
  }

  async diff(_oid: string, path: string): Promise<DiffResult> {
    const current = await this.readFile(path).catch(() => '')
    return buildDiffResult('', current, path)
  }

  async currentBranch(): Promise<string> {
    return 'browser'
  }

  private get database(): IDBPDatabase {
    if (!this.db) throw new Error('Browser vault provider has not been initialized.')
    return this.db
  }

  private fileKey(path: string): string {
    return `${this.bundleId}:${cleanPath(path)}`
  }

  private commitKey(oid: string): string {
    return `${this.bundleId}:${oid}`
  }

  private async allFiles(): Promise<BrowserFileRecord[]> {
    return (await this.database.getAll(FILES_STORE) as BrowserFileRecord[])
      .filter((file) => file.bundleId === this.bundleId)
  }
}

export function createBrowserBundleId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `browser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function browserStoragePersistence(): Promise<{
  supported: boolean
  persisted: boolean
}> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return { supported: false, persisted: false }
  }
  const persisted = await navigator.storage.persist().catch(() => false)
  return { supported: true, persisted }
}

export async function exportBrowserBundle(bundleId: string, bundleName: string): Promise<Blob> {
  const db = await openBrowserBundleDB()
  const files = (await db.getAll(FILES_STORE) as BrowserFileRecord[])
    .filter((file) => file.bundleId === bundleId)
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => ({
      path: file.path,
      content: file.content,
      lastModified: file.lastModified,
    }))

  return new Blob([
    JSON.stringify({
      type: 'caedora-browser-bundle',
      version: 1,
      name: bundleName,
      exportedAt: new Date().toISOString(),
      files,
    }, null, 2),
  ], { type: 'application/json' })
}

export async function listBrowserBundles(): Promise<BrowserBundleRecord[]> {
  const db = await openBrowserBundleDB()
  const saved = (await db.getAll(BUNDLES_STORE) as BrowserBundleRecord[])
    .filter((bundle) => bundle.bundleId)
  const byId = new Map(saved.map((bundle) => [bundle.bundleId, bundle]))

  const files = await db.getAll(FILES_STORE) as BrowserFileRecord[]
  for (const file of files) {
    if (byId.has(file.bundleId)) continue
    byId.set(file.bundleId, {
      bundleId: file.bundleId,
      name: `Recovered browser vault ${file.bundleId.slice(0, 8)}`,
      updatedAt: file.lastModified,
    })
  }

  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteBrowserBundle(bundleId: string): Promise<void> {
  const db = await openBrowserBundleDB()
  await db.delete(BUNDLES_STORE, bundleId)

  const files = await db.getAll(FILES_STORE) as BrowserFileRecord[]
  const fileTx = db.transaction(FILES_STORE, 'readwrite')
  for (const file of files) {
    if (file.bundleId === bundleId) await fileTx.store.delete(file.key)
  }
  await fileTx.done

  const commits = await db.getAll(COMMITS_STORE) as BrowserCommitRecord[]
  const commitTx = db.transaction(COMMITS_STORE, 'readwrite')
  for (const commit of commits) {
    if (commit.bundleId === bundleId) await commitTx.store.delete(commit.key)
  }
  await commitTx.done
}

async function openBrowserBundleDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(BUNDLES_STORE)) {
        db.createObjectStore(BUNDLES_STORE, { keyPath: 'bundleId' })
      }
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(COMMITS_STORE)) {
        db.createObjectStore(COMMITS_STORE, { keyPath: 'key' })
      }
    },
  })
}

function fileEntry(file: BrowserFileRecord): FileEntry {
  return {
    path: file.path,
    name: file.path.split('/').pop() ?? file.path,
    type: 'file',
    size: file.size,
    lastModified: file.lastModified,
  }
}

function cleanPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}
