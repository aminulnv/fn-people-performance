import { publicUrl } from '@/lib/publicUrl'

const SHOWN_KEY = 'pd-browser-notifications-shown-v1'
const SW_PATH = 'sw-notifications.js'

export type BrowserNotificationPermission = NotificationPermission | 'unsupported'

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

export function browserNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined'
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!browserNotificationsSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!browserNotificationsSupported()) return 'unsupported'
  if (Notification.permission === 'granted') {
    void ensureNotificationServiceWorker()
    return 'granted'
  }
  if (Notification.permission === 'denied') return 'denied'
  try {
    const next = await Notification.requestPermission()
    if (next === 'granted') void ensureNotificationServiceWorker()
    return next
  } catch {
    return Notification.permission
  }
}

/** Absolute app URL for a notification destination (respects Vite `/platform/` base). */
export function notificationAppUrl(destination?: string): string {
  const origin = window.location.origin
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  if (!destination) return `${origin}${base || ''}/`
  if (/^https?:\/\//i.test(destination)) return destination
  const path = destination.startsWith('/') ? destination : `/${destination}`
  return `${origin}${base}${path}`
}

function readShownIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SHOWN_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id): id is string => typeof id === 'string'))
      : new Set()
  } catch {
    return new Set()
  }
}

function writeShownIds(ids: Set<string>): void {
  const trimmed = [...ids].slice(-200)
  sessionStorage.setItem(SHOWN_KEY, JSON.stringify(trimmed))
}

export function wasBrowserNotificationShown(notificationId: string): boolean {
  return readShownIds().has(notificationId)
}

export function markBrowserNotificationShown(notificationId: string): void {
  const ids = readShownIds()
  ids.add(notificationId)
  writeShownIds(ids)
}

export async function ensureNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register(publicUrl(SW_PATH), {
        scope: publicUrl(''),
      })
      .then((registration) => registration)
      .catch(() => null)
  }
  return registrationPromise
}

/** Focus / open this app when a service-worker notification is clicked. */
export function listenForNotificationNavigation(): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {}
  }
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; url?: string } | null
    if (data?.type !== 'NOTIFICATION_NAVIGATE' || !data.url) return
    window.location.assign(data.url)
  }
  navigator.serviceWorker.addEventListener('message', onMessage)
  return () => navigator.serviceWorker.removeEventListener('message', onMessage)
}

export type ShowBrowserNotificationInput = {
  id: string
  title: string
  body: string
  destination?: string
  /** When true, show even if already shown / tab is focused (admin Test). */
  force?: boolean
}

function shouldShowOsNotification(force?: boolean): boolean {
  if (force) return true
  if (typeof document === 'undefined') return true
  // Only interrupt when the user is in another tab/window.
  if (document.hidden) return true
  if (typeof document.hasFocus === 'function' && !document.hasFocus()) return true
  return false
}

/**
 * Shows an OS/browser notification via the service worker when possible so
 * clicks work while you are in another tab. Requires an open app tab (or PWA)
 * for delivery; closed-tab push needs a future Web Push setup.
 */
export async function showBrowserNotification(
  input: ShowBrowserNotificationInput,
): Promise<boolean> {
  if (!browserNotificationsSupported()) return false
  if (Notification.permission !== 'granted') return false
  if (!input.force && wasBrowserNotificationShown(input.id)) return false
  if (!shouldShowOsNotification(input.force)) return false

  const url = notificationAppUrl(input.destination)
  const icon = new URL(
    publicUrl('images/logo-favicon.svg'),
    window.location.origin,
  ).href

  const options: NotificationOptions = {
    body: input.body,
    tag: input.id,
    icon,
    badge: icon,
    // Keep the banner on screen until dismissed/clicked (ClickUp-style).
    requireInteraction: true,
    silent: false,
    data: { url, destination: input.destination ?? null },
  }

  try {
    const registration = await ensureNotificationServiceWorker()
    if (registration?.showNotification) {
      await registration.showNotification(input.title, options)
      markBrowserNotificationShown(input.id)
      return true
    }

    const notification = new Notification(input.title, options)
    notification.onclick = () => {
      window.focus()
      window.location.assign(url)
      notification.close()
    }
    markBrowserNotificationShown(input.id)
    return true
  } catch {
    return false
  }
}

/** True when this window is unlikely to show real OS corner banners (e.g. IDE preview). */
export function likelyMissingOsBanners(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.self !== window.top) return true
  } catch {
    return true
  }
  const ua = navigator.userAgent
  // Embedded / Electron shells often play the sound but never draw an OS banner.
  if (/Electron/i.test(ua) && !/Edg\//i.test(ua)) return true
  return false
}

export function resetBrowserNotificationsForTests(): void {
  sessionStorage.removeItem(SHOWN_KEY)
  registrationPromise = null
}
