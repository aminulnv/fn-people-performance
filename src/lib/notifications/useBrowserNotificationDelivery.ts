import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiClient'
import { queryKeys } from '@/lib/queryClient'
import { useCurrentPerson } from '@/lib/useCurrentPerson'
import { fetchNotifications } from '@/lib/notificationsApi'
import {
  ensureNotificationServiceWorker,
  getBrowserNotificationPermission,
  listenForNotificationNavigation,
  showBrowserNotification,
} from './browserNotifications'

function useLocalNotifications(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_AUTH_MODE === 'local'
  )
}

async function confirmBrowserDelivered(notificationId: string): Promise<void> {
  if (useLocalNotifications()) return
  try {
    await apiFetch(
      `/api/platform/notifications/${encodeURIComponent(notificationId)}/browser-delivered`,
      { method: 'POST', body: {} },
    )
  } catch {
    // Best-effort outbox update; the OS notification already showed.
  }
}

/**
 * When the feed gains items that include the browser channel, show an OS
 * notification if the tab is in the background and permission is granted.
 * Clicking it focuses this app and opens the notification destination.
 */
export function useBrowserNotificationDelivery(): void {
  const person = useCurrentPerson()
  const recipientId = person?.id ?? ''
  const seenIdsRef = useRef<Set<string> | null>(null)

  const { data: feed } = useQuery({
    queryKey: queryKeys.notifications(recipientId),
    queryFn: () => fetchNotifications(person!),
    enabled: Boolean(person),
  })

  useEffect(() => {
    if (getBrowserNotificationPermission() === 'granted') {
      void ensureNotificationServiceWorker()
    }
    return listenForNotificationNavigation()
  }, [])

  useEffect(() => {
    if (!feed?.items) return
    if (getBrowserNotificationPermission() !== 'granted') {
      seenIdsRef.current = new Set(feed.items.map((item) => item.id))
      return
    }

    if (seenIdsRef.current == null) {
      // First paint: remember existing items so we don't notify for history.
      seenIdsRef.current = new Set(feed.items.map((item) => item.id))
      return
    }

    for (const item of feed.items) {
      if (seenIdsRef.current.has(item.id)) continue
      seenIdsRef.current.add(item.id)
      if (!item.channels.includes('browser')) continue
      if (item.state === 'superseded') continue
      void showBrowserNotification({
        id: item.id,
        title: item.title,
        body: item.body,
        destination: item.destination,
      }).then((shown) => {
        if (shown) void confirmBrowserDelivered(item.id)
      })
    }
  }, [feed])
}
