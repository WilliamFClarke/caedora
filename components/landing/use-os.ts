'use client'

import { useEffect, useState } from 'react'

export type Os = 'macos' | 'windows' | 'linux' | 'mobile' | 'unknown'

export const OS_LABELS: Record<Os, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  mobile: 'Mobile',
  unknown: 'your device',
}

function detect(): Os {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return 'mobile'
  if (/Mac/i.test(ua)) return 'macos'
  if (/Win/i.test(ua)) return 'windows'
  if (/Linux|X11/i.test(ua)) return 'linux'
  return 'unknown'
}

export function useOs(): Os {
  const [os, setOs] = useState<Os>('unknown')
  useEffect(() => {
    setOs(detect())
  }, [])
  return os
}
