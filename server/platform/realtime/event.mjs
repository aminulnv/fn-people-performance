/** Shared event contract for platform live updates. Keep in sync with src/lib/realtime/event.ts */

export const PLATFORM_EVENT_CHANNEL = 'platform_events'

export const PLATFORM_TOPICS = [
  'goals',
  'reviews',
  'packets',
  'employees',
  'delegations',
  'notifications',
  'activity',
  'access',
]

export function isPlatformTopic(value) {
  return PLATFORM_TOPICS.includes(value)
}

export function normalizePlatformEvent(input) {
  if (!input || typeof input !== 'object') return null
  const topic = String(input.topic ?? '')
  if (!isPlatformTopic(topic)) return null
  const employeeId =
    input.employeeId == null || input.employeeId === ''
      ? undefined
      : String(input.employeeId)
  const actorEmployeeId =
    input.actorEmployeeId == null || input.actorEmployeeId === ''
      ? undefined
      : String(input.actorEmployeeId)
  const cycleId =
    typeof input.cycleId === 'string' && input.cycleId.trim()
      ? input.cycleId
      : undefined
  return {
    id:
      typeof input.id === 'string' && input.id.trim()
        ? input.id
        : crypto.randomUUID(),
    v: 1,
    topic,
    action:
      typeof input.action === 'string' && input.action.trim()
        ? input.action
        : 'updated',
    cycleId,
    employeeId,
    actorEmployeeId,
    at:
      typeof input.at === 'string' && input.at
        ? input.at
        : new Date().toISOString(),
  }
}

export function parsePlatformEventPayload(payload) {
  if (!payload) return null
  try {
    return normalizePlatformEvent(JSON.parse(payload))
  } catch {
    return null
  }
}
