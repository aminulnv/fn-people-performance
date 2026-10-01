import { createPlatformNotification } from '../notifications.mjs'
import { getNotificationRule } from '../notificationRules/store.mjs'

export function renderNotificationTemplate(template, variables = {}) {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = variables[key]
    return value == null || value === '' ? '…' : String(value)
  })
}

function kindForRule(rule) {
  if (rule.category === 'access') return 'security'
  if (rule.timingKind === 'reminder') return 'reminder'
  if (
    rule.eventKey.includes('submitted') ||
    rule.eventKey.includes('approval') ||
    rule.eventKey.includes('sent_back') ||
    rule.eventKey.includes('pending')
  ) {
    return 'action'
  }
  return 'info'
}

function iconForRule(rule) {
  if (rule.category === 'access') return 'shield'
  if (rule.timingKind === 'reminder') return 'clock'
  if (rule.category === 'organisation') return 'users'
  if (rule.category === 'reviews') return 'clipboard-check'
  return 'target'
}

/**
 * Emit one notification from an admin rule template into the outbox.
 * Returns null when the rule is disabled or channels empty.
 */
export async function emitRuleNotification(client, input) {
  const recipientEmployeeId = Number(input.recipientEmployeeId)
  if (!Number.isInteger(recipientEmployeeId) || recipientEmployeeId <= 0) {
    return null
  }

  const rule = await getNotificationRule(input.eventKey, client)
  if (!rule) return null
  if (!input.bypassRuleGate && !rule.enabled) return null

  const variables = input.variables ?? {}
  const title =
    input.title ??
    renderNotificationTemplate(rule.titleTemplate, variables)
  const body =
    input.body ?? renderNotificationTemplate(rule.bodyTemplate, variables)

  return createPlatformNotification(client, {
    eventKey: input.eventKey,
    recipientEmployeeId,
    actorEmployeeId: input.actorEmployeeId ?? null,
    title,
    body,
    icon: input.icon ?? iconForRule(rule),
    kind: input.kind ?? kindForRule(rule),
    destination: input.destination ?? null,
    dedupeKey: input.dedupeKey,
    cycleId: input.cycleId ?? null,
    personId: input.personId ?? null,
    goalId: input.goalId ?? null,
    dueAt: input.dueAt ?? null,
    metadata: input.metadata ?? {},
    channels: input.channels,
    bypassRuleGate: input.bypassRuleGate,
  })
}

export async function completeNotificationAction(
  client,
  recipientEmployeeId,
  dedupeKey,
) {
  const id = Number(recipientEmployeeId)
  if (!Number.isInteger(id) || id <= 0 || !dedupeKey) return
  await client.query(
    `UPDATE platform.notifications
     SET
       state = 'completed',
       completed_at = COALESCE(completed_at, now()),
       updated_at = now()
     WHERE recipient_employee_id = $1
       AND dedupe_key = $2
       AND state IN ('unread', 'read')`,
    [id, dedupeKey],
  )
}

export async function supersedeNotification(
  client,
  recipientEmployeeId,
  dedupeKey,
) {
  const id = Number(recipientEmployeeId)
  if (!Number.isInteger(id) || id <= 0 || !dedupeKey) return
  await client.query(
    `UPDATE platform.notifications
     SET state = 'superseded', updated_at = now()
     WHERE recipient_employee_id = $1
       AND dedupe_key = $2
       AND state <> 'superseded'`,
    [id, dedupeKey],
  )
}
