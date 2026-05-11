export type AiProviderKind = 'ollama' | 'local-llama' | 'cloud'
export type CloudProviderKind = 'openai' | 'anthropic' | 'custom-openai'

export type AiAvailabilityState = 'not-configured' | 'downloading' | 'ready' | 'error'

export interface AiSidebarSettings {
  open: boolean
  width: number
}

export interface AiCloudSettings {
  provider: CloudProviderKind
  baseUrl: string
  model: string
  hasApiKey: boolean
}

export interface AiBundledModelSettings {
  modelId: string
  modelUrl?: string
  modelSha256?: string
}

export interface AiSettings {
  selectedProvider: AiProviderKind | 'auto'
  explicitProviderChoice: boolean
  autoApproveSafeOperations: boolean
  toolPermissionLevel: 'require-approval' | 'allow-all-except-delete' | 'allow-all'
  toolPermissionLevelConfigured: boolean
  extraSystemPrompt: string
  sidebar: AiSidebarSettings
  ollamaModel: string
  bundledModel: AiBundledModelSettings
  cloud: AiCloudSettings
}

export interface AiModelInfo {
  id: string
  label: string
  approxBytes?: number
  downloaded?: boolean
}

export interface AiDownloadProgress {
  modelId: string
  percent: number
  downloadedBytes: number
  totalBytes: number | null
  etaSeconds: number | null
  message?: string
}

export interface AiProviderState {
  state: AiAvailabilityState
  selectedProvider: AiProviderKind | null
  providerLabel: string
  modelLabel: string | null
  message: string
  ollamaModels: AiModelInfo[]
  bundledModels: AiModelInfo[]
  bundledModelDownloaded: boolean
  download: AiDownloadProgress | null
}

export interface AiModelDownloadEvent {
  type: 'progress' | 'complete' | 'cancelled' | 'error'
  progress: AiDownloadProgress
  message?: string
}

export interface AiChatTextEvent {
  type: 'text'
  requestId: string
  text: string
}

export interface AiChatToolCallEvent {
  type: 'tool-call'
  requestId: string
  toolCallId: string
  toolName: string
  argsText: string
}

export interface AiChatDoneEvent {
  type: 'done'
  requestId: string
  finishReason: 'stop' | 'tool-calls' | 'cancelled' | 'error'
}

export interface AiChatErrorEvent {
  type: 'error'
  requestId: string
  message: string
}

export type AiChatEvent =
  | AiChatTextEvent
  | AiChatToolCallEvent
  | AiChatDoneEvent
  | AiChatErrorEvent

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

export interface AiChatToolDefinition {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: unknown
  }
}

export interface AiChatRequest {
  requestId: string
  messages: AiChatMessage[]
  tools: AiChatToolDefinition[]
  rootPath: string | null
  currentFilePath?: string | null
}

export interface AiThreadRepository {
  headId?: string | null
  messages: Array<{
    message: unknown
    parentId: string | null
    runConfig?: unknown
  }>
}

export interface AiThreadAppendRequest {
  rootPath: string
  item: AiThreadRepository['messages'][number]
}

export type AiFileToolName =
  | 'list_files'
  | 'read_file'
  | 'write_file'
  | 'edit_file'
  | 'create_file'
  | 'create_folder'
  | 'delete_file'
  | 'search_files'

export interface AiFileToolRequest {
  rootPath: string
  toolName: AiFileToolName
  args: Record<string, unknown>
}

export interface AiFileMutationPreview {
  path: string
  operation: Extract<
    AiFileToolName,
    'write_file' | 'edit_file' | 'create_file' | 'create_folder' | 'delete_file'
  >
  diff: string
  summary: string
}

export interface AiFileToolResult {
  ok: boolean
  message: string
  data?: unknown
  preview?: AiFileMutationPreview
}
