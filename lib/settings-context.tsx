'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { loadSettings, saveSettings } from '@/lib/storage/idb'
import { DEFAULT_SETTINGS, type AppSettings, type AppearancePalette } from '@/lib/settings'
import { getDesktopApi } from '@/lib/desktop'

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle(
        'desktop-transparency-enabled',
        settings.desktopTransparencyEnabled
      )
    }
    void getDesktopApi()?.window.setTransparency(settings.desktopTransparencyEnabled)
  }, [settings.desktopTransparencyEnabled])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const palettes: AppearancePalette[] = ['default', 'gray', 'oled', 'nocturne', 'custom']
    for (const palette of palettes) {
      root.classList.toggle(`palette-${palette}`, settings.appearancePalette === palette)
    }
    root.style.setProperty('--custom-palette-color', normalizeHex(settings.customPaletteHex))
  }, [settings.appearancePalette, settings.customPaletteHex])

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      const next = { ...settings, ...updates }
      setSettings(next)
      await saveSettings(next)
    },
    [settings]
  )

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext)
}

function normalizeHex(value: string): string {
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed}`
  return DEFAULT_SETTINGS.customPaletteHex
}
