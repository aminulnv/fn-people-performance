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

/**
 * Frontend adapter for the current local workflow stores. The catalogue and
 * feed contract stay unchanged when persistence moves to `/api/platform`.
 */
export async function fetchNotifications(
  recipient: DemoPerson,
): Promise<NotificationFeed> {
  evaluateNotificationReminders(recipient.id)
  evaluateReviewNotifications(recipient)
  return getNotificationFeed(recipient.id)
}

export async function readNotification(
  recipientId: string,
  notificationId: string,
): Promise<void> {
  markNotificationRead(recipientId, notificationId)
}

export async function readAllNotifications(
  recipientId: string,
): Promise<void> {
  markAllNotificationsRead(recipientId)
}

export function watchNotifications(onChange: () => void): () => void {
  return subscribeNotifications(onChange)
}

/** Compatibility aliases for callers that render a single feed item. */
export type NotificationItem = NotificationRecord
export type NotificationItems = NotificationFeed['items']
export type NotificationItemIcon = NotificationIconName
