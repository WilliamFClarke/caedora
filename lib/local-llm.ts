'use client'

import { getDesktopApi } from './desktop'
import type { LocalLlmSettings } from './settings'

export interface LocalLlmTestResult {
  ok: boolean
  message: string
  models: string[]
}

export async function testLocalLlmConnection(
  settings: LocalLlmSettings
): Promise<LocalLlmTestResult> {
  const desktop = getDesktopApi()
  if (desktop) {
    return desktop.localLlm.testConnection(settings)
  }

  try {
    const response = await fetch(`${settings.baseUrl.replace(/\/+$/, '')}/models`, {
      headers: settings.apiKey
        ? { Authorization: `Bearer ${settings.apiKey}` }
        : undefined,
    })
    if (!response.ok) {
      return {
        ok: false,
        message: `Local LLM server returned ${response.status}.`,
        models: [],
      }
    }
    const body = await response.json()
    const models = Array.isArray(body?.data)
      ? body.data.map((model: { id?: string; name?: string }) => model.id ?? model.name).filter(Boolean)
      : []
    return {
      ok: true,
      message: `Connected. Found ${models.length} model${models.length === 1 ? '' : 's'}.`,
      models,
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Could not connect to local LLM server.',
      models: [],
    }
  }
}
