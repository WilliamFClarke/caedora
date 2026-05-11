import type { CommitEntry, FileEntry } from '@/lib/types'
import type { LocalLlmSettings } from '@/lib/settings'
import type {
  AiChatEvent,
  AiChatRequest,
  AiFileMutationPreview,
  AiFileToolRequest,
  AiFileToolResult,
  AiModelDownloadEvent,
  AiProviderState,
  AiSettings,
  AiThreadAppendRequest,
  AiThreadRepository,
} from '@/lib/ai/types'

export interface DesktopVaultRoot {
  path: string
  name: string
}

export interface DesktopDiffContent {
  oldContent: string
  newContent: string
}

export interface LocalLlmConnectionResult {
  ok: boolean
  message: string
  models: string[]
}

export interface PersonalMdDesktopApi {
  isDesktop: true
  platform: NodeJS.Platform
  versions: {
    chrome?: string
    electron?: string
    node?: string
  }
  vault: {
    selectDirectory(options?: { title?: string }): Promise<DesktopVaultRoot | null>
    createChildDirectory(rootPath: string, name: string): Promise<DesktopVaultRoot>
    init(rootPath: string): Promise<DesktopVaultRoot>
    listFiles(rootPath: string, dir?: string): Promise<FileEntry[]>
    readFile(rootPath: string, filePath: string): Promise<string>
    writeFile(rootPath: string, filePath: string, content: string): Promise<void>
    deleteFile(rootPath: string, filePath: string): Promise<void>
    renamePath(rootPath: string, from: string, to: string): Promise<void>
    deletePath(rootPath: string, entryPath: string): Promise<void>
    commit(rootPath: string, message: string, paths: string[]): Promise<string>
    log(rootPath: string, filePath?: string, limit?: number): Promise<CommitEntry[]>
    diffContent(rootPath: string, oid: string, filePath: string): Promise<DesktopDiffContent>
    currentBranch(rootPath: string): Promise<string>
  }
  localLlm: {
    testConnection(config: LocalLlmSettings): Promise<LocalLlmConnectionResult>
    chatCompletion(
      config: LocalLlmSettings,
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    ): Promise<unknown>
  }
  ai: {
    getState(): Promise<AiProviderState>
    getSettings(): Promise<AiSettings>
    updateSettings(settings: Partial<AiSettings>): Promise<AiProviderState>
    saveCloudApiKey(apiKey: string): Promise<AiProviderState>
    clearCloudApiKey(): Promise<AiProviderState>
    startModelDownload(modelId?: string): Promise<AiProviderState>
    cancelModelDownload(modelId?: string): Promise<AiProviderState>
    deleteBundledModel(modelId?: string): Promise<AiProviderState>
    onModelDownloadEvent(listener: (event: AiModelDownloadEvent) => void): () => void
    startChat(request: AiChatRequest): Promise<void>
    cancelChat(requestId: string): Promise<void>
    onChatEvent(listener: (event: AiChatEvent) => void): () => void
    loadThread(rootPath: string): Promise<AiThreadRepository>
    appendThread(request: AiThreadAppendRequest): Promise<void>
    clearThread(rootPath: string): Promise<void>
    executeFileTool(request: AiFileToolRequest): Promise<AiFileToolResult>
    previewFileMutation(request: AiFileToolRequest): Promise<AiFileMutationPreview>
  }
  window: {
    setTransparency(enabled: boolean): Promise<void>
  }
}

declare global {
  interface Window {
    personalMdDesktop?: PersonalMdDesktopApi
  }
}

export {}
