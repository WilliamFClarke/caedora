/**
 * Rest alerts: a phone notification when the workout rest timer ends while the tracker is
 * in the background. A small service worker (public/rest-alerts-sw.js) keeps the timer, so
 * nothing about the workout leaves the device and there is no push server.
 */

const WORKER_URL = '/rest-alerts-sw.js'
const SETTING_KEY = 'caedora.restAlerts'

export type RestAlertSupport =
  /** Notifications and service workers are available. */
  | 'supported'
  /** iPhone or iPad in Safari: notifications need Caedora added to the Home Screen first. */
  | 'install-ios'
  /** This browser cannot show notifications from a web app. */
  | 'unsupported'

export type RestAlertState = 'on' | 'off' | 'denied' | RestAlertSupport

function isIos(): boolean {
  const { userAgent, maxTouchPoints } = navigator
  // iPadOS reports itself as a Mac, so check for touch as well.
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}

function isInstalled(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true
}

export function restAlertSupport(): RestAlertSupport {
  if (typeof window === 'undefined') return 'unsupported'
  const available = 'Notification' in window && 'serviceWorker' in navigator && window.isSecureContext
  if (available) return 'supported'
  return isIos() && !isInstalled() ? 'install-ios' : 'unsupported'
}

function readSetting(): boolean {
  try {
    return window.localStorage.getItem(SETTING_KEY) === 'on'
  } catch {
    return false
  }
}

function writeSetting(on: boolean) {
  try {
    if (on) window.localStorage.setItem(SETTING_KEY, 'on')
    else window.localStorage.removeItem(SETTING_KEY)
  } catch {
    // Without storage the choice lasts until the page closes.
  }
}

/**
 * The notification permission, asking the Permissions API first. Some Chromium builds, such as
 * headless ones, report Notification.permission as denied even after permission was granted.
 */
async function notificationPermission(): Promise<NotificationPermission> {
  try {
    const status = await navigator.permissions?.query({ name: 'notifications' })
    if (status) return status.state === 'prompt' ? 'default' : status.state
  } catch {
    // Older Safari has no Permissions API for notifications.
  }
  return Notification.permission
}

/** Whether rest alerts are on, off, blocked or not possible on this device. */
export async function currentRestAlertState(): Promise<RestAlertState> {
  const support = restAlertSupport()
  if (support !== 'supported') return support
  const permission = await notificationPermission()
  if (permission === 'denied') return 'denied'
  return readSetting() && permission === 'granted' ? 'on' : 'off'
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(WORKER_URL)
  if (existing?.active?.scriptURL.endsWith(WORKER_URL)) return existing
  await navigator.serviceWorker.register(WORKER_URL)
  return navigator.serviceWorker.ready
}

/** Asks for permission (call it from a tap) and starts the worker. */
export async function enableRestAlerts(): Promise<RestAlertState> {
  const support = restAlertSupport()
  if (support !== 'supported') return support
  const current = await notificationPermission()
  const permission = current === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') {
    writeSetting(false)
    return permission === 'denied' ? 'denied' : 'off'
  }
  await registration()
  writeSetting(true)
  return 'on'
}

export async function disableRestAlerts(): Promise<RestAlertState> {
  // Cancel while still on, so the worker hears about it.
  await cancelRestAlert()
  writeSetting(false)
  return currentRestAlertState()
}

async function post(message: Record<string, unknown>) {
  if (!readSetting() || restAlertSupport() !== 'supported') return
  try {
    const worker = (await registration()).active
    worker?.postMessage(message)
  } catch {
    // The in-app beep still plays when the tracker is open.
  }
}

/** Shows a notification at endsAt unless the tracker is on screen by then. */
export function scheduleRestAlert(endsAt: number, exercise: string): Promise<void> {
  return post({ type: 'rest-start', endsAt, exercise, url: window.location.pathname })
}

export function cancelRestAlert(): Promise<void> {
  return post({ type: 'rest-cancel' })
}
