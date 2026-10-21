// ─── File System ─────────────────────────────────────────────────────────────

export interface FileEntry {
  path: string        // relative to vault root, e.g. "health/overview.md"
  name: string        // "overview.md"
  type: 'file' | 'dir'
  size?: number
  lastModified?: number  // Unix ms timestamp
  /** Changes whenever the file's content does, e.g. the Git blob SHA on GitHub. */
  version?: string
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

export interface ReadFileOptions {
  /** Skip any HTTP cache, because the caller knows the file has just changed. */
  fresh?: boolean
}

export interface WriteFileOptions {
  /**
   * The text this edit started from. A provider that can tell whether the
   * file still holds it throws WriteConflictError when someone else changed
   * it in the meantime, rather than writing over their change.
   */
  baseContent?: string
  /** Commit message, for providers where a write is a commit. */
  message?: string
}

// ─── Vault Provider Interface ─────────────────────────────────────────────────
// Both LocalGitProvider and GitHubProvider implement this.
// The UI never needs to know which backend is active.

export interface VaultProvider {
  readonly type: 'local' | 'github' | 'browser'
  /** True when writeFile is already a commit (e.g. GitHub contents API). */
  readonly writesAreCommits: boolean
  isReady(): boolean

  // File operations
  readFile(path: string, options?: ReadFileOptions): Promise<string>
  writeFile(path: string, content: string, options?: WriteFileOptions): Promise<void>
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
  | { state: 'ready'; providerType: 'local' | 'github' | 'browser' }
  | { state: 'error'; error: string }

// ─── Persisted State (IndexedDB) ──────────────────────────────────────────────

export interface PersistedVaultState {
  type: 'local' | 'github' | 'browser'
  directoryHandle?: FileSystemDirectoryHandle  // browser local vault
  directoryPath?: string  // desktop local vault
  directoryName?: string
  /** GitHub PAT — stored in IndexedDB only, never on our servers. */
  githubPat?: string
  githubAuth?: 'pat' | 'app'
  githubRefreshToken?: string
  githubTokenExpiresAt?: number
  githubOwner?: string
  githubRepo?: string
  browserBundleId?: string
  browserBundleName?: string
  lastOpenedAt: number
}

// ─── Vault Context ─────────────────────────────────────────────────────────────

export interface VaultContextValue {
  provider: VaultProvider | null
  status: VaultStatus
  connectLocal: (preselected?: FileSystemDirectoryHandle) => Promise<FileSystemDirectoryHandle | null>
  connectDesktopLocal: (root: { path: string; name: string }) => Promise<boolean>
  connectGitHub: (pat: string, owner: string, repo: string) => Promise<boolean>
  connectGitHubApp: (connection: {
    accessToken: string
    refreshToken?: string
    expiresAt?: number
    owner: string
    repo: string
  }) => Promise<boolean>
  connectBrowserBundle: (bundle: { id: string; name: string }) => Promise<boolean>
  connectToVault: (id: string) => Promise<void>
  grantPermission: () => Promise<void>
  disconnect: () => void
}
