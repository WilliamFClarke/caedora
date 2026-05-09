export type SyncMode = 'auto' | 'manual'
export type LocalLlmPreset = 'ollama' | 'lm-studio' | 'custom'

export interface LocalLlmSettings {
  enabled: boolean
  preset: LocalLlmPreset
  baseUrl: string
  model: string
  apiKey: string
}

export interface AppSettings {
  syncMode: SyncMode
  /**
   * Controls how often the app commits changes:
   *   - GitHub: how often writeFile (= a commit) is called while you type
   *   - Local: how often a git commit is batched (disk writes still happen at ~1 s)
   */
  syncIntervalMs: number
  localLlm: LocalLlmSettings
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
  localLlm: {
    enabled: false,
    preset: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    apiKey: '',
  },
}

export const LOCAL_LLM_PRESETS: Array<{
  id: LocalLlmPreset
  label: string
  baseUrl: string
  model: string
}> = [
  {
    id: 'ollama',
    label: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
  },
  {
    id: 'lm-studio',
    label: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
  },
  {
    id: 'custom',
    label: 'Custom',
    baseUrl: 'http://localhost:11434/v1',
    model: 'local-model',
  },
]
