import { apiFetch } from '@/lib/apiClient'
import type { DemoPerson } from '@/lib/goals/types'
import { evaluateNotificationReminders } from './notifications/reminders'
import { evaluateReviewNotifications } from './notifications/reviewReminders'
import {
  getNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from './notifications/store'
import type {
  NotificationFeed,
  NotificationIconName,
  NotificationRecord,
} from './notifications/types'

export type {
  NotificationFeed,
  NotificationIconName,
  NotificationRecord,
} from './notifications/types'

/** Tests and local-only sign-in keep the browser list. The app uses the server. */
function useLocalNotifications(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_AUTH_MODE === 'local'
  )
}

export async function fetchNotifications(
  recipient: DemoPerson,
): Promise<NotificationFeed> {
  if (useLocalNotifications()) {
    evaluateNotificationReminders(recipient.id)
    evaluateReviewNotifications(recipient)
    return getNotificationFeed(recipient.id)
  }
  return apiFetch<NotificationFeed>('/api/platform/notifications')
}

export async function readNotification(
  _recipientId: string,
  notificationId: string,
): Promise<void> {
  if (useLocalNotifications()) {
    markNotificationRead(_recipientId, notificationId)
    return
  }
  await apiFetch(`/api/platform/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'POST',
  })
}

export async function readAllNotifications(recipientId: string): Promise<void> {
  if (useLocalNotifications()) {
    markAllNotificationsRead(recipientId)
    return
  }
  await apiFetch('/api/platform/notifications/read-all', { method: 'POST' })
}

export function watchNotifications(onChange: () => void): () => void {
  if (!useLocalNotifications()) return () => {}
  return subscribeNotifications(onChange)
}

/** Compatibility aliases for callers that render a single feed item. */
export type NotificationItem = NotificationRecord
export type NotificationItems = NotificationFeed['items']
export type NotificationItemIcon = NotificationIconName
