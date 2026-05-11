'use client'

import { getDesktopApi } from './desktop'
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
} from './ai/types'

function desktopAi() {
  const api = getDesktopApi()?.ai
  if (!api) throw new Error('Desktop AI API is not available.')
  return api
}

export function isDesktopAiAvailable(): boolean {
  return Boolean(getDesktopApi()?.ai)
}

export function getAiState(): Promise<AiProviderState> {
  return desktopAi().getState()
}

export function getAiSettings(): Promise<AiSettings> {
  return desktopAi().getSettings()
}

export function updateAiSettings(settings: Partial<AiSettings>): Promise<AiProviderState> {
  return desktopAi().updateSettings(settings)
}

export function saveCloudApiKey(apiKey: string): Promise<AiProviderState> {
  return desktopAi().saveCloudApiKey(apiKey)
}

export function clearCloudApiKey(): Promise<AiProviderState> {
  return desktopAi().clearCloudApiKey()
}

export function startModelDownload(modelId?: string): Promise<AiProviderState> {
  return desktopAi().startModelDownload(modelId)
}

export function cancelModelDownload(modelId?: string): Promise<AiProviderState> {
  return desktopAi().cancelModelDownload(modelId)
}

export function onModelDownloadEvent(
  listener: (event: AiModelDownloadEvent) => void
): () => void {
  return desktopAi().onModelDownloadEvent(listener)
}

export function startAiChat(request: AiChatRequest): Promise<void> {
  return desktopAi().startChat(request)
}

export function cancelAiChat(requestId: string): Promise<void> {
  return desktopAi().cancelChat(requestId)
}

export function onAiChatEvent(listener: (event: AiChatEvent) => void): () => void {
  return desktopAi().onChatEvent(listener)
}

export function loadAiThread(rootPath: string): Promise<AiThreadRepository> {
  return desktopAi().loadThread(rootPath)
}

export function appendAiThread(request: AiThreadAppendRequest): Promise<void> {
  return desktopAi().appendThread(request)
}

export function clearAiThread(rootPath: string): Promise<void> {
  return desktopAi().clearThread(rootPath)
}

export function executeAiFileTool(request: AiFileToolRequest): Promise<AiFileToolResult> {
  return desktopAi().executeFileTool(request)
}

export function previewAiFileMutation(
  request: AiFileToolRequest
): Promise<AiFileMutationPreview> {
  return desktopAi().previewFileMutation(request)
}
