export type NotificationKind =
  | 'action'
  | 'info'
  | 'reminder'
  | 'summary'
  | 'security'

export type NotificationChannel = 'in_app' | 'email' | 'clickup'

export type NotificationIconName =
  | 'target'
  | 'clipboard-check'
  | 'users'
  | 'clock'
  | 'shield'

export type NotificationState = 'unread' | 'read' | 'completed' | 'superseded'

/**
 * Stable event keys live in the catalogue. Keep persisted records generic so
 * new event definitions do not require a storage migration.
 */
export type NotificationEventKey = string

export type NotificationRecord = {
  id: string
  eventKey: NotificationEventKey
  recipientId: string
  actorId?: string
  title: string
  body: string
  icon: NotificationIconName
  kind: NotificationKind
  state: NotificationState
  destination?: string
  channels: NotificationChannel[]
  dedupeKey: string
  cycleId?: string
  personId?: string
  goalId?: string
  dueAt?: string
  createdAt: string
  updatedAt: string
  readAt?: string
  completedAt?: string
  metadata?: Record<string, string | number | boolean | null>
}

export type NotificationTemplateInput = {
  eventKey: NotificationEventKey
  recipientId: string
  actorId?: string
  dedupeKey: string
  destination?: string
  cycleId?: string
  personId?: string
  goalId?: string
  dueAt?: string
  variables: Record<string, string | number | undefined>
  metadata?: NotificationRecord['metadata']
}

export type NotificationTemplate = {
  kind: NotificationKind
  icon: NotificationIconName
  channels: NotificationChannel[]
  title: string
  body: string
}

export type NotificationCatalogueEntry = {
  key: NotificationEventKey
  kind: NotificationKind
  icon: NotificationIconName
  channels: NotificationChannel[]
  title: string
  body: string
}

export type NotificationFeed = {
  items: NotificationRecord[]
  unreadCount: number
  openActionCount: number
}
