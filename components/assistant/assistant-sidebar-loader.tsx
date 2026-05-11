'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { isDesktopApp } from '@/lib/desktop'
import type { VaultProvider } from '@/lib/types'

const DesktopAssistantSidebar = dynamic(
  () => import('./assistant-sidebar').then((mod) => mod.AssistantSidebar),
  { ssr: false, loading: () => null }
)

export function AssistantSidebarLoader({
  provider,
  currentFilePath,
  onOpenSettings,
}: {
  provider: VaultProvider
  currentFilePath: string | null
  onOpenSettings: () => void
}) {
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    setDesktop(isDesktopApp())
  }, [])

  if (!desktop) return null

  return (
    <DesktopAssistantSidebar
      provider={provider}
      currentFilePath={currentFilePath}
      onOpenSettings={onOpenSettings}
    />
  )
}
