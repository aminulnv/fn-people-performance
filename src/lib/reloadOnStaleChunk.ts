/**
 * After a deploy, open tabs still hold the old index.html and request removed
 * hashed chunks. Nginx SPA fallback then returns HTML → MIME / dynamic-import
 * errors. Reload once so the browser picks up the new index.
 */

const RELOAD_FLAG = 'pd-stale-chunk-reload'

export function isStaleChunkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error ?? '')
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Unable to preload CSS/i.test(message)
  )
}

export function installStaleChunkReload(): void {
  if (typeof window === 'undefined') return

  const justReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'
  if (justReloaded) {
    sessionStorage.removeItem(RELOAD_FLAG)
  }

  // Disarm for this page load after a recovery reload so a still-broken
  // chunk cannot loop forever.
  let canReload = !justReloaded

  const reloadOnce = () => {
    if (!canReload) return
    canReload = false
    try {
      sessionStorage.setItem(RELOAD_FLAG, '1')
    } catch {
      return
    }
    window.location.reload()
  }

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadOnce()
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (!isStaleChunkError(event.reason)) return
    event.preventDefault()
    reloadOnce()
  })
}
