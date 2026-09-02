/**
 * Public origin helpers for OAuth redirects.
 * Platform auth only needs getAppUrl - not dashboard Google / pd.sid.
 */

function isLocalhostUrl(value) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(String(value || ''))
}

export function getAppUrl(req) {
  const explicit = process.env.APP_URL?.trim().replace(/\/$/, '')
  if (explicit && !isLocalhostUrl(explicit)) {
    return explicit
  }
  if (req) {
    const host = (req.get('x-forwarded-host') || req.get('host') || '')
      .split(',')[0]
      .trim()
    const proto = (
      req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http')
    )
      .split(',')[0]
      .trim()
    if (host && !isLocalhostUrl(host)) {
      return `${proto}://${host}`.replace(/\/$/, '')
    }
  }
  return (process.env.APP_URL || 'http://localhost:8001').replace(/\/$/, '')
}
