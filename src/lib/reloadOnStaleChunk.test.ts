import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  installStaleChunkReload,
  isStaleChunkError,
} from './reloadOnStaleChunk'

describe('isStaleChunkError', () => {
  it('matches dynamic import fetch failures', () => {
    expect(
      isStaleChunkError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://example/a.js',
        ),
      ),
    ).toBe(true)
  })

  it('matches module script import failures', () => {
    expect(
      isStaleChunkError(new Error('Importing a module script failed.')),
    ).toBe(true)
  })

  it('ignores unrelated errors', () => {
    expect(isStaleChunkError(new Error('Network request failed'))).toBe(false)
    expect(isStaleChunkError(null)).toBe(false)
  })
})

describe('installStaleChunkReload', () => {
  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('reloads once on vite:preloadError then disarms', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })

    installStaleChunkReload()
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(sessionStorage.getItem('pd-stale-chunk-reload')).toBe('1')
    expect(reload).toHaveBeenCalledOnce()

    reload.mockClear()
    // Simulate post-reload boot with flag still set.
    installStaleChunkReload()
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(reload).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('pd-stale-chunk-reload')).toBeNull()
  })

  it('reloads on unhandledrejection for stale chunk errors', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })

    installStaleChunkReload()
    const event = new Event('unhandledrejection') as PromiseRejectionEvent
    Object.defineProperty(event, 'reason', {
      value: new TypeError(
        'Failed to fetch dynamically imported module: /assets/x.js',
      ),
    })
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
    window.dispatchEvent(event)

    expect(reload).toHaveBeenCalledOnce()
  })
})
