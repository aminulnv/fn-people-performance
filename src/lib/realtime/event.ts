export const PLATFORM_TOPICS = [
  'goals',
  'reviews',
  'packets',
  'employees',
  'delegations',
  'notifications',
  'activity',
  'access',
] as const

export type PlatformTopic = (typeof PLATFORM_TOPICS)[number]

export type PlatformEvent = {
  id: string
  v: 1
  topic: PlatformTopic
  action: string
  cycleId?: string
  employeeId?: string
  actorEmployeeId?: string
  at: string
}

export function isPlatformTopic(value: string): value is PlatformTopic {
  return (PLATFORM_TOPICS as readonly string[]).includes(value)
}

export function parsePlatformEvent(input: unknown): PlatformEvent | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Record<string, unknown>
  const topic = String(value.topic ?? '')
  if (!isPlatformTopic(topic)) return null
  const employeeId =
    value.employeeId == null || value.employeeId === ''
      ? undefined
      : String(value.employeeId)
  const actorEmployeeId =
    value.actorEmployeeId == null || value.actorEmployeeId === ''
      ? undefined
      : String(value.actorEmployeeId)
  const cycleId =
    typeof value.cycleId === 'string' && value.cycleId.trim()
      ? value.cycleId
      : undefined
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : '',
    v: 1,
    topic,
    action:
      typeof value.action === 'string' && value.action.trim()
        ? value.action
        : 'updated',
    cycleId,
    employeeId,
    actorEmployeeId,
    at: typeof value.at === 'string' && value.at ? value.at : '',
  }
}
