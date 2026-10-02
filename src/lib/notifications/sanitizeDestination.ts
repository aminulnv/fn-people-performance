/**
 * Notification deep links must be a single in-app path (/…) or https
 * without credentials. Everything else is dropped before navigate/render.
 */
export function sanitizeNotificationDestination(
  destination?: string | null,
): string | undefined {
  if (destination == null) return undefined
  let raw = String(destination).trim()
  if (!raw) return undefined

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
    if (raw.includes('\\')) return undefined
    return raw
  }

  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return undefined
    if (url.username || url.password) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}
