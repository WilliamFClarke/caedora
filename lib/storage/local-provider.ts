import * as git from 'isomorphic-git'
import { createFsAdapter } from './fs-adapter'
import { buildDiffResult } from '../diff'
import type { VaultProvider, FileEntry, CommitEntry, DiffResult } from '../types'

const GIT_AUTHOR = { name: 'personal-md', email: 'local@personal-md' }
const DIR = '/'

export class LocalGitProvider implements VaultProvider {
  readonly type = 'local' as const
  readonly writesAreCommits = false
  private fs: ReturnType<typeof createFsAdapter>
  private _ready = false

  constructor(private handle: FileSystemDirectoryHandle) {
    this.fs = createFsAdapter(handle)
  }

  /** The folder name the user selected (File System Access doesn't expose path). */
  get folderName(): string {
    return this.handle.name
  }

  /** Call after construction to ensure the directory is a git repo. */
  async init(): Promise<void> {
    try {
      // Check if .git exists already
      await this.fs.promises.stat('/.git')
    } catch {
      // Not a git repo yet — initialise one
      await git.init({ fs: this.fs, dir: DIR })
    }
    this._ready = true
  }

  isReady(): boolean {
    return this._ready
  }

  async readFile(path: string): Promise<string> {
    return this.fs.promises.readFile(`/${path}`, { encoding: 'utf8' }) as Promise<string>
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.fs.promises.writeFile(`/${path}`, content)
  }

  async deleteFile(path: string): Promise<void> {
    await this.fs.promises.unlink(`/${path}`)
  }

  async renamePath(from: string, to: string): Promise<void> {
    const stat = await this.fs.promises.stat(`/${from}`)
    if (stat.isDirectory()) {
      const files: FileEntry[] = []
      await this._walk(from, files)
      for (const entry of files.filter((e) => e.type === 'file')) {
        const newPath = `${to}${entry.path.slice(from.length)}`
        const content = await this.fs.promises.readFile(`/${entry.path}`, { encoding: 'utf8' }) as string
        await this.fs.promises.writeFile(`/${newPath}`, content)
        await git.add({ fs: this.fs, dir: DIR, filepath: newPath })
        await this.fs.promises.unlink(`/${entry.path}`)
        await git.remove({ fs: this.fs, dir: DIR, filepath: entry.path })
      }
      try {
        await this.fs.promises.rmdir(`/${from}`, { recursive: true })
      } catch {
        // folder may already be gone
      }
    } else {
      await this.fs.promises.rename(`/${from}`, `/${to}`)
      await git.add({ fs: this.fs, dir: DIR, filepath: to })
      await git.remove({ fs: this.fs, dir: DIR, filepath: from })
    }
  }

  async deletePath(path: string): Promise<void> {
    let isDir = false
    try {
      const stat = await this.fs.promises.stat(`/${path}`)
      isDir = stat.isDirectory()
    } catch {
      return
    }
    if (isDir) {
      const files: FileEntry[] = []
      await this._walk(path, files)
      for (const entry of files.filter((e) => e.type === 'file')) {
        await this.fs.promises.unlink(`/${entry.path}`)
        await git.remove({ fs: this.fs, dir: DIR, filepath: entry.path })
      }
      try {
        await this.fs.promises.rmdir(`/${path}`, { recursive: true })
      } catch {
        // already gone
      }
    } else {
      await this.deleteFile(path)
    }
  }

  async listFiles(dir = ''): Promise<FileEntry[]> {
    const entries: FileEntry[] = []
    await this._walk(dir, entries)
    return entries
  }

  private async _walk(dirPath: string, out: FileEntry[]): Promise<void> {
    const fsPath = dirPath ? `/${dirPath}` : '/'
    let names: string[]
    try {
      names = await this.fs.promises.readdir(fsPath)
    } catch {
      return
    }
    for (const name of names) {
      if (name === '.git') continue  // never expose git internals
      const childPath = dirPath ? `${dirPath}/${name}` : name
      try {
        const s = await this.fs.promises.stat(`/${childPath}`)
        if (s.isDirectory()) {
          out.push({ path: childPath, name, type: 'dir' })
          await this._walk(childPath, out)
        } else {
          out.push({
            path: childPath,
            name,
            type: 'file',
            size: s.size,
            lastModified: s.mtimeMs,
          })
        }
      } catch {
        // skip inaccessible entries
      }
    }
  }

  async commit(message: string, paths: string[]): Promise<string> {
    for (const p of paths) {
      await git.add({ fs: this.fs, dir: DIR, filepath: p })
    }
    return git.commit({ fs: this.fs, dir: DIR, message, author: GIT_AUTHOR })
  }

  async log(path?: string, limit = 50): Promise<CommitEntry[]> {
    const entries = await git.log({
      fs: this.fs,
      dir: DIR,
      filepath: path,
      depth: limit,
    })
    return entries.map((e) => ({
      oid: e.oid,
      message: e.commit.message.trim(),
      author: {
        name: e.commit.author.name,
        email: e.commit.author.email,
        timestamp: e.commit.author.timestamp,
      },
      parents: e.commit.parent,
    }))
  }

  async diff(oid: string, path: string): Promise<DiffResult> {
    let newContent = ''
    let oldContent = ''

    try {
      const { blob } = await git.readBlob({ fs: this.fs, dir: DIR, oid, filepath: path })
      newContent = new TextDecoder().decode(blob)
    } catch {
      // file didn't exist at this commit
    }

    // Find parent commit to diff against
    try {
      const commits = await git.log({ fs: this.fs, dir: DIR, depth: 2, ref: oid })
      if (commits.length > 1) {
        const parentOid = commits[1].oid
        const { blob } = await git.readBlob({
          fs: this.fs,
          dir: DIR,
          oid: parentOid,
          filepath: path,
        })
        oldContent = new TextDecoder().decode(blob)
      }
    } catch {
      // no parent or file didn't exist in parent — oldContent stays ''
    }

    return buildDiffResult(oldContent, newContent, path)
  }

  async currentBranch(): Promise<string> {
    const branch = await git.currentBranch({ fs: this.fs, dir: DIR })
    return branch ?? 'HEAD'
  }
}
