import { buildDiffResult } from '../diff'
import { getDesktopApi } from '../desktop'
import type { CommitEntry, DiffResult, FileEntry, VaultProvider } from '../types'

export class ElectronLocalProvider implements VaultProvider {
  readonly type = 'local' as const
  readonly writesAreCommits = false
  private _ready = false

  constructor(
    private rootPath: string,
    private rootName: string
  ) {}

  get folderName(): string {
    return this.rootName
  }

  get directoryPath(): string {
    return this.rootPath
  }

  async init(): Promise<void> {
    await api().vault.init(this.rootPath)
    this._ready = true
  }

  isReady(): boolean {
    return this._ready
  }

  readFile(path: string): Promise<string> {
    return api().vault.readFile(this.rootPath, path)
  }

  writeFile(path: string, content: string): Promise<void> {
    return api().vault.writeFile(this.rootPath, path, content)
  }

  deleteFile(path: string): Promise<void> {
    return api().vault.deleteFile(this.rootPath, path)
  }

  renamePath(from: string, to: string): Promise<void> {
    return api().vault.renamePath(this.rootPath, from, to)
  }

  deletePath(path: string): Promise<void> {
    return api().vault.deletePath(this.rootPath, path)
  }

  listFiles(dir = ''): Promise<FileEntry[]> {
    return api().vault.listFiles(this.rootPath, dir)
  }

  commit(message: string, paths: string[]): Promise<string> {
    return api().vault.commit(this.rootPath, message, paths)
  }

  log(path?: string, limit = 50): Promise<CommitEntry[]> {
    return api().vault.log(this.rootPath, path, limit)
  }

  async diff(oid: string, path: string): Promise<DiffResult> {
    const { oldContent, newContent } = await api().vault.diffContent(
      this.rootPath,
      oid,
      path
    )
    return buildDiffResult(oldContent, newContent, path)
  }

  currentBranch(): Promise<string> {
    return api().vault.currentBranch(this.rootPath)
  }
}

function api() {
  const desktop = getDesktopApi()
  if (!desktop) throw new Error('Desktop vault API is not available.')
  return desktop
}
