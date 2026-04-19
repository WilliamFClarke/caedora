'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { loadSettings, saveSettings } from '@/lib/storage/idb'
import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/settings'

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
