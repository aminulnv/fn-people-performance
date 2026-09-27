import { getPool } from '../../db.mjs'
import { createPlatformNotification } from '../notifications.mjs'
import {
  ALLOWED_CHANNELS,
  NOTIFICATION_RULE_DEFAULTS,
  NOTIFICATION_RULE_DEFAULTS_BY_KEY,
} from './defaults.mjs'

const TEST_VARIABLES = {
  cycle: 'H2 2026',
  deadline: '15 Oct',
  days: '5',
  employee: 'Sara Khan',
  manager: 'Alex Rivera',
  count: '3',
  reason: 'Please tighten the success metric',
  approver: 'Alex Rivera',
  skipLevelManager: 'Jordan Lee',
  actor: 'Alex Rivera',
  comment: 'Can you take a look at this?',
  goal: 'Improve onboarding completion',
  reviewType: 'Manager review',
  scope: 'Engineering',
  date: '1 Nov',
  administrator: 'Aminul Islam',
  stage: 'Self-review',
  oldDate: '1 Oct',
  newDate: '8 Oct',
  newManager: 'Alex Rivera',
  accessProfile: 'Read + write',
  message: 'Please submit your goals this week',
  thresholdDate: '1 Sep',
  grade: 'Exceeds',
}

function renderTemplate(template, variables) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = variables[key]
    return value == null || value === '' ? '…' : String(value)
  })
}

function mapRule(row) {
  return {
    eventKey: row.event_key,
    name: row.name,
    category: row.category,
    audienceKey: row.audience_key,
    audienceLabel: row.audience_label,
    whenLabel: row.when_label,
    timingKind: row.timing_kind,
    enabled: Boolean(row.enabled),
    channels: Array.isArray(row.channels) ? [...row.channels] : ['in_app'],
    titleTemplate: row.title_template,
    bodyTemplate: row.body_template,
    sortOrder: Number(row.sort_order) || 100,
    updatedAt: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : undefined,
    updatedByEmployeeId:
      row.updated_by_employee_id == null
        ? null
        : Number(row.updated_by_employee_id),
  }
}

function defaultAsRow(definition) {
  return {
    event_key: definition.eventKey,
    name: definition.name,
    category: definition.category,
    audience_key: definition.audienceKey,
    audience_label: definition.audienceLabel,
    when_label: definition.whenLabel,
    timing_kind: definition.timingKind,
    enabled: definition.enabled,
    channels: definition.channels,
    title_template: definition.titleTemplate,
    body_template: definition.bodyTemplate,
    sort_order: definition.sortOrder,
    updated_at: null,
    updated_by_employee_id: null,
  }
}

let seedPromise = null

async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const pool = getPool()
      for (const definition of NOTIFICATION_RULE_DEFAULTS) {
        await pool.query(
          `INSERT INTO platform.notification_rules (
             event_key,
             name,
             category,
             audience_key,
             audience_label,
             when_label,
             timing_kind,
             enabled,
             channels,
             title_template,
             body_template,
             sort_order
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12
           )
           ON CONFLICT (event_key) DO NOTHING`,
          [
            definition.eventKey,
            definition.name,
            definition.category,
            definition.audienceKey,
            definition.audienceLabel,
            definition.whenLabel,
            definition.timingKind,
            definition.enabled,
            definition.channels,
            definition.titleTemplate,
            definition.bodyTemplate,
            definition.sortOrder,
          ],
        )
      }
    })().catch((error) => {
      seedPromise = null
      throw error
    })
  }
  await seedPromise
}

export async function getNotificationRule(eventKey, client) {
  const executor = client ?? getPool()
  try {
    if (!client) await ensureSeeded()
    const { rows } = await executor.query(
      `SELECT *
       FROM platform.notification_rules
       WHERE event_key = $1`,
      [eventKey],
    )
    if (rows[0]) return mapRule(rows[0])
    const fallback = NOTIFICATION_RULE_DEFAULTS_BY_KEY.get(eventKey)
    return fallback ? mapRule(defaultAsRow(fallback)) : null
  } catch (error) {
    if (error?.code === '42P01') {
      const fallback = NOTIFICATION_RULE_DEFAULTS_BY_KEY.get(eventKey)
      return fallback ? mapRule(defaultAsRow(fallback)) : null
    }
    throw error
  }
}

export async function listNotificationRules() {
  try {
    await ensureSeeded()
    const { rows } = await getPool().query(
      `SELECT *
       FROM platform.notification_rules
       ORDER BY sort_order ASC, name ASC`,
    )
    const byKey = new Map(rows.map((row) => [row.event_key, mapRule(row)]))
    for (const definition of NOTIFICATION_RULE_DEFAULTS) {
      if (!byKey.has(definition.eventKey)) {
        byKey.set(definition.eventKey, mapRule(defaultAsRow(definition)))
      }
    }
    return [...byKey.values()].sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    )
  } catch (error) {
    if (error?.code === '42P01') {
      return NOTIFICATION_RULE_DEFAULTS.map((definition) =>
        mapRule(defaultAsRow(definition)),
      )
    }
    throw error
  }
}

function normalizeChannels(value, fallback) {
  if (!Array.isArray(value)) return fallback
  const next = [
    ...new Set(
      value
        .map((item) => String(item))
        .filter((item) => ALLOWED_CHANNELS.has(item)),
    ),
  ]
  return next.length > 0 ? next : fallback
}

export async function updateNotificationRule(eventKey, patch, actor) {
  const existing = await getNotificationRule(eventKey)
  if (!existing) {
    const error = new Error('Unknown notification rule')
    error.statusCode = 404
    throw error
  }

  const enabled =
    typeof patch.enabled === 'boolean' ? patch.enabled : existing.enabled
  const channels = normalizeChannels(patch.channels, existing.channels)
  const titleTemplate =
    typeof patch.titleTemplate === 'string'
      ? patch.titleTemplate.trim()
      : existing.titleTemplate
  const bodyTemplate =
    typeof patch.bodyTemplate === 'string'
      ? patch.bodyTemplate.trim()
      : existing.bodyTemplate

  if (!titleTemplate) {
    const error = new Error('Title is required')
    error.statusCode = 400
    throw error
  }
  if (!bodyTemplate) {
    const error = new Error('Body is required')
    error.statusCode = 400
    throw error
  }

  const actorId = Number(actor?.employeeId)
  const updatedBy =
    Number.isInteger(actorId) && actorId > 0 ? actorId : null

  const { rows } = await getPool().query(
    `INSERT INTO platform.notification_rules (
       event_key,
       name,
       category,
       audience_key,
       audience_label,
       when_label,
       timing_kind,
       enabled,
       channels,
       title_template,
       body_template,
       sort_order,
       updated_at,
       updated_by_employee_id
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12, now(), $13
     )
     ON CONFLICT (event_key) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       channels = EXCLUDED.channels,
       title_template = EXCLUDED.title_template,
       body_template = EXCLUDED.body_template,
       updated_at = now(),
       updated_by_employee_id = EXCLUDED.updated_by_employee_id
     RETURNING *`,
    [
      existing.eventKey,
      existing.name,
      existing.category,
      existing.audienceKey,
      existing.audienceLabel,
      existing.whenLabel,
      existing.timingKind,
      enabled,
      channels,
      titleTemplate,
      bodyTemplate,
      existing.sortOrder,
      updatedBy,
    ],
  )
  return mapRule(rows[0])
}

export async function resetNotificationRule(eventKey, actor) {
  const definition = NOTIFICATION_RULE_DEFAULTS_BY_KEY.get(eventKey)
  if (!definition) {
    const error = new Error('Unknown notification rule')
    error.statusCode = 404
    throw error
  }
  return updateNotificationRule(
    eventKey,
    {
      enabled: definition.enabled,
      channels: definition.channels,
      titleTemplate: definition.titleTemplate,
      bodyTemplate: definition.bodyTemplate,
    },
    actor,
  )
}

/**
 * Sends a one-off in-app notification to the signed-in admin so they can
 * preview copy + delivery without waiting for a real domain event.
 */
export async function sendTestNotificationRule(eventKey, actor) {
  const rule = await getNotificationRule(eventKey)
  if (!rule) {
    const error = new Error('Unknown notification rule')
    error.statusCode = 404
    throw error
  }

  const recipientEmployeeId = Number(actor?.employeeId)
  if (!Number.isInteger(recipientEmployeeId) || recipientEmployeeId <= 0) {
    const error = new Error(
      'Your account must be linked to an employee to receive a test notification.',
    )
    error.statusCode = 400
    throw error
  }

  const title = `Test · ${renderTemplate(rule.titleTemplate, TEST_VARIABLES)}`
  const body = renderTemplate(rule.bodyTemplate, TEST_VARIABLES)
  const kind =
    rule.category === 'access'
      ? 'security'
      : rule.timingKind === 'reminder'
        ? 'reminder'
        : 'info'
  const icon =
    rule.category === 'access'
      ? 'shield'
      : rule.timingKind === 'reminder'
        ? 'clock'
        : rule.category === 'organisation'
          ? 'users'
          : rule.category === 'reviews'
            ? 'clipboard-check'
            : 'target'

  const channels = ['in_app']
  if (rule.channels.includes('browser')) channels.push('browser')

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const notification = await createPlatformNotification(client, {
      eventKey: rule.eventKey,
      recipientEmployeeId,
      actorEmployeeId: recipientEmployeeId,
      title,
      body,
      icon,
      kind,
      destination: '/settings#notifications',
      dedupeKey: `test:${rule.eventKey}:${Date.now()}`,
      metadata: { test: true, ruleName: rule.name },
      channels,
      bypassRuleGate: true,
    })
    await client.query('COMMIT')
    return { notification, rule }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
