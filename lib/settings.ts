export type SyncMode = 'auto' | 'manual'

export interface AppSettings {
  syncMode: SyncMode
  /**
   * Controls how often the app commits changes:
   *   - GitHub: how often writeFile (= a commit) is called while you type
   *   - Local: how often a git commit is batched (disk writes still happen at ~1 s)
   */
  syncIntervalMs: number
}

export const SYNC_INTERVAL_OPTIONS = [
  { label: '30 seconds', ms: 30_000 },
  { label: '2 minutes', ms: 120_000 },
  { label: '5 minutes', ms: 300_000 },
  { label: '10 minutes', ms: 600_000 },
] as const

export const DEFAULT_SETTINGS: AppSettings = {
  syncMode: 'auto',
  syncIntervalMs: 30_000,
}
