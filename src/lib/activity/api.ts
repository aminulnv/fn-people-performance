import { apiFetch } from '@/lib/apiClient'
import type {
  ActivityEvent,
  ActivityListFilters,
  ActivityListResponse,
} from './types'

const LOCAL_KEY = 'pd-activity-events-v1'

function useLocalActivity(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_ACTIVITY_BACKEND === 'local' ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === 'local'
  )
}

function readLocal(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as ActivityEvent[]) : []
  } catch {
    return []
  }
}

function writeLocal(events: ActivityEvent[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(events))
  } catch {
    /* ignore quota */
  }
}

/** Test/demo helper - append-only local facade, not authoritative. */
export function appendLocalActivityEvent(
  input: Omit<ActivityEvent, 'id' | 'occurredAt'> & {
    id?: string
    occurredAt?: string
  },
): ActivityEvent {
  const event: ActivityEvent = {
    ...input,
    id: input.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    changes: input.changes ?? [],
    metadata: input.metadata ?? {},
    actorType: input.actorType ?? 'user',
    source: input.source ?? 'web',
    summary: input.summary ?? '',
  }
  writeLocal([event, ...readLocal()])
  return event
}

export function resetLocalActivityForTests(): void {
  try {
    localStorage.removeItem(LOCAL_KEY)
  } catch {
    /* ignore */
  }
}

function matchesFilters(
  event: ActivityEvent,
  filters: ActivityListFilters,
): boolean {
  if (filters.eventKey && event.eventKey !== filters.eventKey) return false
  if (filters.entityType && event.entityType !== filters.entityType) return false
  if (filters.entityId && event.entityId !== filters.entityId) return false
  if (
    filters.actorEmployeeId != null &&
    event.actorEmployeeId !== filters.actorEmployeeId
  ) {
    return false
  }
  if (
    filters.subjectEmployeeId != null &&
    event.subjectEmployeeId !== filters.subjectEmployeeId
  ) {
    return false
  }
  if (filters.cycleId && event.cycleId !== filters.cycleId) return false
  if (filters.goalId && event.goalId !== filters.goalId) return false
  if (filters.from && (event.occurredAt ?? '') < filters.from) return false
  if (filters.to && (event.occurredAt ?? '') > filters.to) return false
  return true
}

function listLocalActivity(
  filters: ActivityListFilters = {},
): ActivityListResponse {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const filtered = readLocal().filter((event) => matchesFilters(event, filters))
  let start = 0
  if (filters.cursor) {
    const index = filtered.findIndex((event) => event.id === filters.cursor)
    start = index >= 0 ? index + 1 : 0
  }
  const items = filtered.slice(start, start + limit)
  const last = items[items.length - 1]
  return {
    items,
    nextCursor:
      items.length === limit && last && start + limit < filtered.length
        ? last.id
        : null,
  }
}

export async function fetchActivity(
  filters: ActivityListFilters = {},
): Promise<ActivityListResponse> {
  if (useLocalActivity()) return listLocalActivity(filters)

  const params = new URLSearchParams()
  if (filters.limit != null) params.set('limit', String(filters.limit))
  if (filters.cursor) params.set('cursor', filters.cursor)
  if (filters.eventKey) params.set('eventKey', filters.eventKey)
  if (filters.entityType) params.set('entityType', filters.entityType)
  if (filters.entityId) params.set('entityId', filters.entityId)
  if (filters.actorEmployeeId != null) {
    params.set('actorEmployeeId', String(filters.actorEmployeeId))
  }
  if (filters.subjectEmployeeId != null) {
    params.set('subjectEmployeeId', String(filters.subjectEmployeeId))
  }
  if (filters.cycleId) params.set('cycleId', filters.cycleId)
  if (filters.goalId) params.set('goalId', filters.goalId)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)

  const query = params.toString()
  return apiFetch<ActivityListResponse>(
    `/api/platform/activity${query ? `?${query}` : ''}`,
  )
}
