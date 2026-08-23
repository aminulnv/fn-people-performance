import { getPool } from '../db.mjs'

function isoTimestamp(value) {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function mapNotification(row) {
  return {
    id: `server-${row.id}`,
    source: 'server',
    eventKey: row.event_key,
    recipientId: String(row.recipient_employee_id),
    actorId:
      row.actor_employee_id == null ? undefined : String(row.actor_employee_id),
    title: row.title,
    body: row.body,
    icon: row.icon,
    kind: row.kind,
    state: row.state,
    destination: row.destination ?? undefined,
    channels: row.channels ?? ['in_app'],
    dedupeKey: row.dedupe_key,
    cycleId: row.cycle_id ?? undefined,
    personId:
      row.person_id == null ? undefined : String(row.person_id),
    goalId: row.goal_id ?? undefined,
    dueAt: isoTimestamp(row.due_at),
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    readAt: isoTimestamp(row.read_at),
    completedAt: isoTimestamp(row.completed_at),
    metadata: row.metadata ?? {},
  }
}

function employeeIdOrNull(value) {
  if (value == null || value === '') return null
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function databaseId(notificationId) {
  const normalized = String(notificationId).replace(/^server-/, '')
  const id = Number(normalized)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function createPlatformNotification(client, input) {
  const { rows } = await client.query(
    `INSERT INTO platform.notifications (
       event_key,
       recipient_employee_id,
       actor_employee_id,
       title,
       body,
       icon,
       kind,
       destination,
       dedupe_key,
       cycle_id,
       person_id,
       goal_id,
       due_at,
       metadata
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
     )
     ON CONFLICT (recipient_employee_id, dedupe_key) DO UPDATE SET
       event_key = EXCLUDED.event_key,
       actor_employee_id = EXCLUDED.actor_employee_id,
       title = EXCLUDED.title,
       body = EXCLUDED.body,
       icon = EXCLUDED.icon,
       kind = EXCLUDED.kind,
       state = CASE
         WHEN platform.notifications.kind = 'action' THEN 'unread'
         ELSE platform.notifications.state
       END,
       destination = EXCLUDED.destination,
       cycle_id = EXCLUDED.cycle_id,
       person_id = EXCLUDED.person_id,
       goal_id = EXCLUDED.goal_id,
       due_at = EXCLUDED.due_at,
       metadata = EXCLUDED.metadata,
       read_at = CASE
         WHEN platform.notifications.kind = 'action' THEN NULL
         ELSE platform.notifications.read_at
       END,
       completed_at = CASE
         WHEN platform.notifications.kind = 'action' THEN NULL
         ELSE platform.notifications.completed_at
       END,
       updated_at = now()
     RETURNING *`,
    [
      input.eventKey,
      input.recipientEmployeeId,
      input.actorEmployeeId ?? null,
      input.title,
      input.body,
      input.icon ?? 'target',
      input.kind,
      input.destination ?? null,
      input.dedupeKey,
      input.cycleId ?? null,
      employeeIdOrNull(input.personId),
      input.goalId ?? null,
      input.dueAt ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  )
  const row = rows[0]
  await client.query(
    `INSERT INTO platform.notification_deliveries (
       notification_id, channel, status, attempts, delivered_at
     ) VALUES ($1, 'in_app', 'delivered', 1, now())
     ON CONFLICT (notification_id, channel) DO NOTHING`,
    [row.id],
  )
  return mapNotification({ ...row, channels: ['in_app'] })
}

export async function listPlatformNotifications(recipientEmployeeId) {
  try {
    const { rows } = await getPool().query(
      `SELECT
         n.*,
         COALESCE(
           array_agg(d.channel ORDER BY d.channel)
             FILTER (WHERE d.channel IS NOT NULL),
           ARRAY['in_app']::text[]
         ) AS channels
       FROM platform.notifications n
       LEFT JOIN platform.notification_deliveries d
         ON d.notification_id = n.id
       WHERE n.recipient_employee_id = $1
         AND n.state <> 'superseded'
       GROUP BY n.id
       ORDER BY
         CASE
           WHEN n.kind = 'action' AND n.state IN ('unread', 'read') THEN 0
           ELSE 1
         END,
         CASE WHEN n.state = 'unread' THEN 0 ELSE 1 END,
         n.updated_at DESC
       LIMIT 200`,
      [recipientEmployeeId],
    )
    const items = rows.map(mapNotification)
    return {
      items,
      unreadCount: items.filter((item) => item.state === 'unread').length,
      openActionCount: items.filter(
        (item) =>
          item.kind === 'action' &&
          (item.state === 'unread' || item.state === 'read'),
      ).length,
    }
  } catch (error) {
    if (error?.code === '42P01') {
      return { items: [], unreadCount: 0, openActionCount: 0 }
    }
    throw error
  }
}

export async function markPlatformNotificationRead(
  recipientEmployeeId,
  notificationId,
) {
  const id = databaseId(notificationId)
  if (!id) return false
  const { rowCount } = await getPool().query(
    `UPDATE platform.notifications
     SET
       state = CASE WHEN state = 'unread' THEN 'read' ELSE state END,
       read_at = COALESCE(read_at, now()),
       updated_at = now()
     WHERE id = $1
       AND recipient_employee_id = $2
       AND state <> 'superseded'`,
    [id, recipientEmployeeId],
  )
  return rowCount > 0
}

export async function markAllPlatformNotificationsRead(recipientEmployeeId) {
  await getPool().query(
    `UPDATE platform.notifications
     SET state = 'read', read_at = now(), updated_at = now()
     WHERE recipient_employee_id = $1 AND state = 'unread'`,
    [recipientEmployeeId],
  )
}
