'use client'

export function getDesktopApi() {
  if (typeof window === 'undefined') return null
  return window.personalMdDesktop ?? null
}

export function isDesktopApp(): boolean {
  return getDesktopApi()?.isDesktop === true
}
