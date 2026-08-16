import { renderNotificationTemplate } from './catalogue'
import type {
  NotificationFeed,
  NotificationRecord,
  NotificationState,
  NotificationTemplateInput,
} from './types'

const STORAGE_KEY = 'pd-notifications-v2'
const listeners = new Set<() => void>()

type NotificationStateSnapshot = {
  version: 2
  items: NotificationRecord[]
}

export type DuplicateNotificationPolicy = 'ignore' | 'refresh' | 'reopen'

export type EmitNotificationOptions = {
  duplicate?: DuplicateNotificationPolicy
  now?: Date
}

function emptyState(): NotificationStateSnapshot {
  return { version: 2, items: [] }
}

function readState(): NotificationStateSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<NotificationStateSnapshot>
    if (parsed.version !== 2 || !Array.isArray(parsed.items)) {
      return emptyState()
    }
    return { version: 2, items: parsed.items }
  } catch {
    return emptyState()
  }
}

function writeState(state: NotificationStateSnapshot): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  for (const listener of listeners) listener()
}

function newNotificationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `notification-${crypto.randomUUID()}`
  }
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isOpenAction(item: NotificationRecord): boolean {
  return item.kind === 'action' && (item.state === 'unread' || item.state === 'read')
}

function buildFeed(items: NotificationRecord[]): NotificationFeed {
  const visible = items
    .filter((item) => item.state !== 'superseded')
    .sort((left, right) => {
      const actionOrder = Number(isOpenAction(right)) - Number(isOpenAction(left))
      if (actionOrder !== 0) return actionOrder
      const unreadOrder =
        Number(right.state === 'unread') - Number(left.state === 'unread')
      if (unreadOrder !== 0) return unreadOrder
      return right.updatedAt.localeCompare(left.updatedAt)
    })

  return {
    items: visible,
    unreadCount: visible.filter((item) => item.state === 'unread').length,
    openActionCount: visible.filter(isOpenAction).length,
  }
}

export function subscribeNotifications(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getNotificationFeed(recipientId: string): NotificationFeed {
  return buildFeed(
    readState().items.filter((item) => item.recipientId === recipientId),
  )
}

export function emitNotification(
  input: NotificationTemplateInput,
  options: EmitNotificationOptions = {},
): NotificationRecord {
  const state = readState()
  const template = renderNotificationTemplate(input.eventKey, input.variables)
  const now = (options.now ?? new Date()).toISOString()
  const duplicate = state.items.find(
    (item) =>
      item.recipientId === input.recipientId &&
      item.dedupeKey === input.dedupeKey &&
      item.state !== 'superseded',
  )
  const duplicatePolicy =
    options.duplicate ?? 'ignore'

  if (duplicate && duplicatePolicy === 'ignore') return duplicate

  if (duplicate) {
    const contentIsUnchanged =
      duplicate.eventKey === input.eventKey &&
      duplicate.title === template.title &&
      duplicate.body === template.body &&
      duplicate.destination === input.destination &&
      duplicate.dueAt === input.dueAt &&
      JSON.stringify(duplicate.metadata ?? {}) ===
        JSON.stringify(input.metadata ?? {})
    const alreadyOpen =
      duplicate.state === 'unread' || duplicate.state === 'read'
    if (
      contentIsUnchanged &&
      (duplicatePolicy === 'refresh' ||
        (duplicatePolicy === 'reopen' && alreadyOpen))
    ) {
      return duplicate
    }
    const next: NotificationRecord = {
      ...duplicate,
      eventKey: input.eventKey,
      actorId: input.actorId,
      title: template.title,
      body: template.body,
      icon: template.icon,
      kind: template.kind,
      state:
        duplicatePolicy === 'reopen'
          ? 'unread'
          : duplicate.state === 'completed'
            ? 'completed'
            : 'unread',
      destination: input.destination,
      channels: template.channels,
      cycleId: input.cycleId,
      personId: input.personId,
      goalId: input.goalId,
      dueAt: input.dueAt,
      updatedAt: now,
      readAt: undefined,
      completedAt: duplicatePolicy === 'reopen' ? undefined : duplicate.completedAt,
      metadata: input.metadata,
    }
    writeState({
      ...state,
      items: state.items.map((item) => (item.id === duplicate.id ? next : item)),
    })
    return next
  }

  const created: NotificationRecord = {
    id: newNotificationId(),
    eventKey: input.eventKey,
    recipientId: input.recipientId,
    actorId: input.actorId,
    title: template.title,
    body: template.body,
    icon: template.icon,
    kind: template.kind,
    state: 'unread',
    destination: input.destination,
    channels: template.channels,
    dedupeKey: input.dedupeKey,
    cycleId: input.cycleId,
    personId: input.personId,
    goalId: input.goalId,
    dueAt: input.dueAt,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata,
  }
  writeState({ ...state, items: [...state.items, created] })
  return created
}

function updateRecipientItems(
  recipientId: string,
  update: (item: NotificationRecord) => NotificationRecord,
): void {
  const state = readState()
  let changed = false
  const items = state.items.map((item) => {
    if (item.recipientId !== recipientId) return item
    const next = update(item)
    if (next !== item) changed = true
    return next
  })
  if (changed) writeState({ ...state, items })
}

export function markNotificationRead(
  recipientId: string,
  notificationId: string,
  now = new Date(),
): void {
  const readAt = now.toISOString()
  updateRecipientItems(recipientId, (item) =>
    item.id === notificationId && item.state === 'unread'
      ? { ...item, state: 'read', readAt, updatedAt: readAt }
      : item,
  )
}

export function markAllNotificationsRead(
  recipientId: string,
  now = new Date(),
): void {
  const readAt = now.toISOString()
  updateRecipientItems(recipientId, (item) =>
    item.state === 'unread'
      ? { ...item, state: 'read', readAt, updatedAt: readAt }
      : item,
  )
}

function transitionByDedupeKey(
  recipientId: string,
  dedupeKey: string,
  state: Extract<NotificationState, 'completed' | 'superseded'>,
  now = new Date(),
): void {
  const completedAt = now.toISOString()
  updateRecipientItems(recipientId, (item) =>
    item.dedupeKey === dedupeKey &&
    item.state !== 'completed' &&
    item.state !== 'superseded'
      ? {
          ...item,
          state,
          completedAt: state === 'completed' ? completedAt : item.completedAt,
          updatedAt: completedAt,
        }
      : item,
  )
}

export function completeNotificationAction(
  recipientId: string,
  dedupeKey: string,
  now?: Date,
): void {
  transitionByDedupeKey(recipientId, dedupeKey, 'completed', now)
}

export function supersedeNotification(
  recipientId: string,
  dedupeKey: string,
  now?: Date,
): void {
  transitionByDedupeKey(recipientId, dedupeKey, 'superseded', now)
}

export function resetNotificationsForTests(): void {
  localStorage.removeItem(STORAGE_KEY)
  for (const listener of listeners) listener()
}
