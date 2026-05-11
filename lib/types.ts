// ─── File System ─────────────────────────────────────────────────────────────

export interface FileEntry {
  path: string        // relative to vault root, e.g. "health/overview.md"
  name: string        // "overview.md"
  type: 'file' | 'dir'
  size?: number
  lastModified?: number  // Unix ms timestamp
  pending?: boolean
}

// ─── Git ─────────────────────────────────────────────────────────────────────

export interface CommitEntry {
  oid: string
  message: string
  author: {
    name: string
    email: string
    timestamp: number  // Unix seconds
  }
  parents: string[]
}

export interface DiffHunk {
  header: string
  lines: Array<{
    type: 'context' | 'add' | 'remove'
    content: string
  }>
}

export interface DiffResult {
  hunks: DiffHunk[]
  oldContent: string
  newContent: string
}

// ─── Vault Provider Interface ─────────────────────────────────────────────────
// Both LocalGitProvider and GitHubProvider implement this.
// The UI never needs to know which backend is active.

export interface VaultProvider {
  readonly type: 'local' | 'github'
  /** True when writeFile is already a commit (e.g. GitHub contents API). */
  readonly writesAreCommits: boolean
  isReady(): boolean

  // File operations
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  listFiles(dir?: string): Promise<FileEntry[]>

  // Path operations (work on files or folders; folders recurse over descendants)
  renamePath(from: string, to: string): Promise<void>
  deletePath(path: string): Promise<void>

  // Git operations
  commit(message: string, paths: string[]): Promise<string>  // returns commit oid
  log(path?: string, limit?: number): Promise<CommitEntry[]>
  diff(oid: string, path: string): Promise<DiffResult>
  currentBranch(): Promise<string>
}

// ─── Vault Status ─────────────────────────────────────────────────────────────

export type VaultStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'connecting' }
  | { state: 'permission-required'; folderName: string }  // handle in IDB, permission revoked
  | { state: 'ready'; providerType: 'local' | 'github' }
  | { state: 'error'; error: string }

// ─── Persisted State (IndexedDB) ──────────────────────────────────────────────

export interface PersistedVaultState {
  type: 'local' | 'github'
  directoryHandle?: FileSystemDirectoryHandle  // browser local vault
  directoryPath?: string  // desktop local vault
  directoryName?: string
  /** GitHub PAT — stored in IndexedDB only, never on our servers. */
  githubPat?: string
  githubOwner?: string
  githubRepo?: string
  lastOpenedAt: number
}

// ─── Vault Context ─────────────────────────────────────────────────────────────

export interface VaultContextValue {
  provider: VaultProvider | null
  status: VaultStatus
  connectLocal: (preselected?: FileSystemDirectoryHandle) => Promise<FileSystemDirectoryHandle | null>
  connectDesktopLocal: (root: { path: string; name: string }) => Promise<boolean>
  connectGitHub: (pat: string, owner: string, repo: string) => Promise<boolean>
  connectToVault: (id: string) => Promise<void>
  grantPermission: () => Promise<void>
  disconnect: () => void
}
