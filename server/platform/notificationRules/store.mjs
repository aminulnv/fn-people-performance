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

function testVariablesForEvent(eventKey) {
  const key = String(eventKey)
  const dayMatch = /\.day_(\d+)$/.exec(key)
  if (dayMatch) return { ...TEST_VARIABLES, days: dayMatch[1] }
  if (key === 'review.due_soon' || key === 'review.calibration.due_soon') {
    return { ...TEST_VARIABLES, days: '3' }
  }
  if (key === 'goal.results_reminder' || key === 'goal.team.stale_summary') {
    return { ...TEST_VARIABLES, days: '14' }
  }
  return TEST_VARIABLES
}

function mapRule(row) {
  const definition = NOTIFICATION_RULE_DEFAULTS_BY_KEY.get(row.event_key)
  const required = Boolean(
    row.required ?? definition?.required ?? false,
  )
  return {
    eventKey: row.event_key,
    name: row.name,
    category: row.category,
    audienceKey: row.audience_key,
    audienceLabel: row.audience_label,
    whenLabel: row.when_label,
    timingKind: row.timing_kind,
    enabled: required ? true : Boolean(row.enabled),
    required,
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
    required: Boolean(definition.required),
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
             required,
             channels,
             title_template,
             body_template,
             sort_order
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[], $11, $12, $13
           )
           ON CONFLICT (event_key) DO UPDATE SET
             required = EXCLUDED.required,
             name = EXCLUDED.name,
             audience_label = EXCLUDED.audience_label,
             when_label = EXCLUDED.when_label,
             timing_kind = EXCLUDED.timing_kind,
             sort_order = EXCLUDED.sort_order,
             enabled = CASE
               WHEN EXCLUDED.required THEN TRUE
               ELSE platform.notification_rules.enabled
             END`,
          [
            definition.eventKey,
            definition.name,
            definition.category,
            definition.audienceKey,
            definition.audienceLabel,
            definition.whenLabel,
            definition.timingKind,
            definition.enabled,
            Boolean(definition.required),
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

  if (
    existing.required &&
    typeof patch.enabled === 'boolean' &&
    patch.enabled === false
  ) {
    const error = new Error(
      'This notification is required by the platform and cannot be turned off.',
    )
    error.statusCode = 400
    throw error
  }

  const enabled = existing.required
    ? true
    : typeof patch.enabled === 'boolean'
      ? patch.enabled
      : existing.enabled
  let channels = normalizeChannels(patch.channels, existing.channels)
  // Required workflow alerts always keep in-app so the product cannot go dark.
  if (existing.required && !channels.includes('in_app')) {
    channels = ['in_app', ...channels]
  }
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
       required,
       channels,
       title_template,
       body_template,
       sort_order,
       updated_at,
       updated_by_employee_id
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[], $11, $12, $13, now(), $14
     )
     ON CONFLICT (event_key) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       required = EXCLUDED.required,
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
      Boolean(existing.required),
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
 * Sends a one-off in-app (+ browser) notification to the signed-in admin so
 * they can preview copy without email/ClickUp spam during testing.
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

  const variables = testVariablesForEvent(eventKey)
  const title = `Test · ${renderTemplate(rule.titleTemplate, variables)}`
  const body = renderTemplate(rule.bodyTemplate, variables)
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
