import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getBrowserNotificationPermission,
  markBrowserNotificationShown,
  notificationAppUrl,
  resetBrowserNotificationsForTests,
  showBrowserNotification,
  wasBrowserNotificationShown,
} from './browserNotifications'

describe('browserNotifications', () => {
  afterEach(() => {
    resetBrowserNotificationsForTests()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reports unsupported when Notification is missing', () => {
    vi.stubGlobal('Notification', undefined)
    expect(getBrowserNotificationPermission()).toBe('unsupported')
  })

  it('builds app URLs with the Vite base path', () => {
    expect(notificationAppUrl('/goals')).toMatch(/\/goals$/)
    expect(notificationAppUrl('settings#notifications')).toContain(
      '/settings#notifications',
    )
  })

  it('shows once per id unless forced, and skips when the tab is focused', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('Notification', {
      permission: 'granted',
    })
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    })
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    vi.stubGlobal('navigator', {
      serviceWorker: {
        register: vi.fn().mockResolvedValue({ showNotification }),
      },
    })

    expect(
      await showBrowserNotification({
        id: 'n1',
        title: 'Hello',
        body: 'World',
        destination: '/goals',
      }),
    ).toBe(false)

    expect(
      await showBrowserNotification({
        id: 'n1',
        title: 'Hello',
        body: 'World',
        destination: '/goals',
        force: true,
      }),
    ).toBe(true)
    expect(showNotification).toHaveBeenCalledTimes(1)
    expect(wasBrowserNotificationShown('n1')).toBe(true)

    expect(
      await showBrowserNotification({
        id: 'n1',
        title: 'Hello',
        body: 'World',
        force: true,
      }),
    ).toBe(true)
    expect(showNotification).toHaveBeenCalledTimes(2)
  })

  it('tracks shown ids in session storage', () => {
    markBrowserNotificationShown('abc')
    expect(wasBrowserNotificationShown('abc')).toBe(true)
  })
})
