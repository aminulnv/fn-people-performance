/**
 * Notification deep links must be a single in-app path (/…) or https
 * without credentials. Everything else is dropped before store/render/send.
 */

export function sanitizeNotificationDestination(destination) {
  if (destination == null) return null
  let raw = String(destination).trim()
  if (!raw) return null

  // Relative in-app path without leading slash (e.g. settings#notifications).
  if (
    !raw.includes('://') &&
    !raw.startsWith('//') &&
    !raw.startsWith('/') &&
    !/^[a-z][a-z0-9+.-]*:/i.test(raw)
  ) {
    raw = `/${raw}`
  }

  if (raw.startsWith('/') && !raw.startsWith('//')) {
    if (raw.includes('\\')) return null
    return raw
  }

  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

/** Absolute app URL for email / ClickUp, from a sanitized destination. */
export function absoluteNotificationUrl(destination, appBaseUrl) {
  const safe = sanitizeNotificationDestination(destination)
  if (!safe) return String(appBaseUrl || '').replace(/\/$/, '')
  if (/^https:\/\//i.test(safe)) return safe
  const base = String(appBaseUrl || '').replace(/\/$/, '')
  return `${base}${safe.startsWith('/') ? '' : '/'}${safe}`
}
