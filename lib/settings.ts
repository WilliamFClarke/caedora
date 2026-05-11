import type { AiSettings } from '@/lib/ai/types'

export type SyncMode = 'auto' | 'manual'
export type LocalLlmPreset = 'ollama' | 'lm-studio' | 'custom'
export type AppearancePalette = 'default' | 'gray' | 'oled' | 'nocturne' | 'custom'

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
  ai: AiSettings
  desktopTransparencyEnabled: boolean
  appearancePalette: AppearancePalette
  customPaletteHex: string
}

export const APPEARANCE_PALETTES: Array<{
  id: AppearancePalette
  label: string
  description: string
  swatches: string[]
}> = [
  {
    id: 'default',
    label: 'Default',
    description: 'Cool blue neutral',
    swatches: ['#f7f8fb', '#e5e7ef', '#4f72d8', '#172033'],
  },
  {
    id: 'gray',
    label: 'Graphite',
    description: 'Charcoal and soft gray',
    swatches: ['#f7f7f7', '#a8a8a8', '#808080', '#181818'],
  },
  {
    id: 'oled',
    label: 'True Black',
    description: 'OLED black surfaces',
    swatches: ['#000000', '#080808', '#1a1a1a', '#f5f5f5'],
  },
  {
    id: 'nocturne',
    label: 'Nocturne',
    description: 'Purple night palette',
    swatches: ['#282a36', '#44475a', '#bd93f9', '#ff79c6'],
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Use your own hex color',
    swatches: ['#f7f7f7', '#5b8cff', '#3558c9', '#141820'],
  },
]

export const SYNC_INTERVAL_OPTIONS = [
  { label: '30 seconds', ms: 30_000 },
  { label: '2 minutes', ms: 120_000 },
  { label: '5 minutes', ms: 300_000 },
  { label: '10 minutes', ms: 600_000 },
] as const

export const DEFAULT_SETTINGS: AppSettings = {
  syncMode: 'auto',
  syncIntervalMs: 30_000,
  desktopTransparencyEnabled: true,
  appearancePalette: 'default',
  customPaletteHex: '#5b8cff',
  localLlm: {
    enabled: false,
    preset: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    apiKey: '',
  },
  ai: {
    selectedProvider: 'auto',
    explicitProviderChoice: false,
    autoApproveSafeOperations: true,
    toolPermissionLevel: 'allow-all',
    toolPermissionLevelConfigured: false,
    extraSystemPrompt: '',
    sidebar: {
      open: false,
      width: 400,
    },
    ollamaModel: '',
    bundledModel: {
      modelId: 'qwen2.5-7b-instruct-q4_k_m',
      modelUrl: 'https://huggingface.co/second-state/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf',
      modelSha256: 'a30c3c08ca3284a7b59fa35cd835ec50b4a54e211379692b0e48a34bdb72c2fb',
    },
    cloud: {
      provider: 'openai',
      baseUrl: '',
      model: 'gpt-4o-mini',
      hasApiKey: false,
    },
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
