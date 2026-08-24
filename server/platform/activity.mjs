/**
 * Append-only Activity Log writer and reader.
 * Callers must pass the same DB client used for the domain mutation.
 */

import { getPool } from '../db.mjs'
import { HttpError } from '../errors.mjs'
import {
  canViewActivityRow,
  loadActivityViewerContext,
} from './activityPolicy.mjs'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function isoTimestamp(value) {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function mapActivityEvent(row) {
  return {
    id: String(row.id),
    eventKey: row.event_key,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorEmployeeId:
      row.actor_employee_id == null ? undefined : Number(row.actor_employee_id),
    actorEmail: row.actor_email || undefined,
    actorName: row.actor_name || undefined,
    actorAvatarUrl: row.actor_avatar_url || undefined,
    actorType: row.actor_type,
    subjectEmployeeId:
      row.subject_employee_id == null
        ? undefined
        : Number(row.subject_employee_id),
    cycleId: row.cycle_id ?? undefined,
    goalId: row.goal_id ?? undefined,
    correlationId: row.correlation_id ?? undefined,
    requestId: row.request_id ?? undefined,
    source: row.source,
    summary: row.summary || '',
    changes: Array.isArray(row.changes) ? row.changes : [],
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    occurredAt: isoTimestamp(row.occurred_at),
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{
 *   eventKey: string
 *   entityType: string
 *   entityId: string
 *   actorEmployeeId?: number | null
 *   actorEmail?: string
 *   actorName?: string
 *   actorType?: 'user' | 'system' | 'import'
 *   subjectEmployeeId?: number | null
 *   cycleId?: string | null
 *   goalId?: string | null
 *   correlationId?: string | null
 *   requestId?: string | null
 *   source?: 'api' | 'web' | 'scheduler' | 'migration' | 'import'
 *   summary?: string
 *   changes?: Array<{ field: string, from?: unknown, to?: unknown }>
 *   metadata?: Record<string, unknown>
 * }} input
 */
export async function appendActivityEvent(client, input) {
  if (!input?.eventKey || !input?.entityType || !input?.entityId) {
    throw new HttpError(500, 'Activity event is missing required fields')
  }

  const { rows } = await client.query(
    `INSERT INTO platform.activity_events (
       event_key,
       entity_type,
       entity_id,
       actor_employee_id,
       actor_email,
       actor_name,
       actor_type,
       subject_employee_id,
       cycle_id,
       goal_id,
       correlation_id,
       request_id,
       source,
       summary,
       changes,
       metadata
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb
     )
     RETURNING *`,
    [
      input.eventKey,
      input.entityType,
      String(input.entityId),
      input.actorEmployeeId ?? null,
      input.actorEmail ?? '',
      input.actorName ?? '',
      input.actorType ?? 'user',
      input.subjectEmployeeId ?? null,
      input.cycleId ?? null,
      input.goalId ?? null,
      input.correlationId ?? null,
      input.requestId ?? null,
      input.source ?? 'api',
      input.summary ?? '',
      JSON.stringify(input.changes ?? []),
      JSON.stringify(input.metadata ?? {}),
    ],
  )
  return mapActivityEvent(rows[0])
}

function encodeCursor(occurredAt, id) {
  return Buffer.from(JSON.stringify({ occurredAt, id }), 'utf8').toString(
    'base64url',
  )
}

function decodeCursor(cursor) {
  if (!cursor) return null
  try {
    const parsed = JSON.parse(
      Buffer.from(String(cursor), 'base64url').toString('utf8'),
    )
    if (!parsed?.occurredAt || parsed.id == null) return null
    return {
      occurredAt: String(parsed.occurredAt),
      id: Number(parsed.id),
    }
  } catch {
    return null
  }
}

/**
 * @param {object} platformUser
 * @param {{
 *   limit?: number
 *   cursor?: string
 *   eventKey?: string
 *   entityType?: string
 *   entityId?: string
 *   actorEmployeeId?: number
 *   subjectEmployeeId?: number
 *   cycleId?: string
 *   goalId?: string
 *   from?: string
 *   to?: string
 * }} filters
 */
export async function listActivityEvents(platformUser, filters = {}) {
  const viewer = await loadActivityViewerContext(platformUser)
  const limit = Math.min(
    Math.max(Number(filters.limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  )
  const cursor = decodeCursor(filters.cursor)
  if (filters.cursor && !cursor) {
    throw new HttpError(400, 'Invalid activity cursor')
  }

  const params = []
  const where = ['TRUE']

  if (filters.eventKey) {
    params.push(String(filters.eventKey))
    where.push(`event.event_key = $${params.length}`)
  }
  if (filters.entityType) {
    params.push(String(filters.entityType))
    where.push(`event.entity_type = $${params.length}`)
  }
  if (filters.entityId) {
    params.push(String(filters.entityId))
    where.push(`event.entity_id = $${params.length}`)
  }
  if (filters.actorEmployeeId != null) {
    params.push(Number(filters.actorEmployeeId))
    where.push(`event.actor_employee_id = $${params.length}`)
  }
  if (filters.subjectEmployeeId != null) {
    params.push(Number(filters.subjectEmployeeId))
    where.push(`event.subject_employee_id = $${params.length}`)
  }
  if (filters.cycleId) {
    params.push(String(filters.cycleId))
    where.push(`event.cycle_id = $${params.length}`)
  }
  if (filters.goalId) {
    params.push(String(filters.goalId))
    where.push(`event.goal_id = $${params.length}`)
  }
  if (filters.from) {
    params.push(String(filters.from))
    where.push(`event.occurred_at >= $${params.length}::timestamptz`)
  }
  if (filters.to) {
    params.push(String(filters.to))
    where.push(`event.occurred_at <= $${params.length}::timestamptz`)
  }
  if (cursor) {
    params.push(cursor.occurredAt, cursor.id)
    where.push(
      `(event.occurred_at, event.id) < ($${params.length - 1}::timestamptz, $${params.length}::bigint)`,
    )
  }

  // Over-fetch so post-authorization filtering can still fill a page.
  params.push(limit * 4)
  const { rows } = await getPool().query(
    `SELECT event.*, actor.avatar_url AS actor_avatar_url
     FROM platform.activity_events event
     LEFT JOIN platform.employees actor
       ON actor.employee_id = event.actor_employee_id
     WHERE ${where.join(' AND ')}
     ORDER BY event.occurred_at DESC, event.id DESC
     LIMIT $${params.length}`,
    params,
  )

  const visible = []
  for (const row of rows) {
    const mapped = mapActivityEvent(row)
    if (!canViewActivityRow(viewer, mapped)) continue
    visible.push(mapped)
    if (visible.length >= limit) break
  }
  const items = await withDelegatingMetadata(visible)

  const last = items[items.length - 1]
  return {
    items,
    nextCursor:
      items.length === limit && last
        ? encodeCursor(last.occurredAt, Number(last.id))
        : null,
  }
}

async function withDelegatingMetadata(events) {
  const pending = events.filter(
    (event) =>
      event.actorEmployeeId != null &&
      event.subjectEmployeeId != null &&
      event.actorEmployeeId !== event.subjectEmployeeId &&
      !event.metadata?.delegatingForName &&
      !event.metadata?.coveringForName,
  )
  if (pending.length === 0) return events
  const { rows } = await getPool().query(
    `SELECT
       event.id,
       manager.full_name,
       manager.avatar_url
     FROM platform.activity_events event
     JOIN platform.employees subject
       ON subject.employee_id = event.subject_employee_id
     JOIN platform.employees manager
       ON manager.employee_id = subject.reports_to_employee_id
     JOIN platform.manager_delegations delegation
       ON delegation.absent_employee_id = subject.reports_to_employee_id
      AND delegation.delegate_employee_id = event.actor_employee_id
      AND delegation.starts_at <= event.occurred_at
      AND delegation.ends_at >= event.occurred_at
      AND (
        delegation.revoked_at IS NULL
        OR delegation.revoked_at > event.occurred_at
      )
     WHERE event.id = ANY($1::bigint[])`,
    [pending.map((event) => Number(event.id))],
  )
  const byId = new Map(
    rows.map((row) => [
      String(row.id),
      {
        delegatingForName: row.full_name,
        delegatingForAvatarUrl: row.avatar_url || '',
        coveringForName: row.full_name,
        coveringForAvatarUrl: row.avatar_url || '',
      },
    ]),
  )
  return events.map((event) => {
    const delegating = byId.get(String(event.id))
    if (!delegating) return event
    return {
      ...event,
      metadata: { ...event.metadata, ...delegating },
    }
  })
}

export { mapActivityEvent }
