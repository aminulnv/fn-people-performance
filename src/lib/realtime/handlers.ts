import { queryClient, queryKeys } from '@/lib/queryClient'
import { hydrateManagerDelegations } from '@/lib/delegations/store'
import { loadEmployees } from '@/lib/employees/store'
import { refreshRemoteGoals } from '@/lib/goalsApi'
import { reloadReviewCycles } from '@/lib/reviews/store'
import type { PlatformEvent, PlatformTopic } from './event'
import { emitPlatformEvent } from './invalidation'

const COALESCE_MS = 150
const pending = new Map<string, number>()

function eventKey(event: PlatformEvent): string {
  return `${event.topic}:${event.cycleId ?? ''}:${event.employeeId ?? ''}`
}

async function applyTopic(event: PlatformEvent): Promise<void> {
  switch (event.topic) {
    case 'goals':
      await refreshRemoteGoals({
        cycleId: event.cycleId,
        employeeId: event.employeeId,
      })
      break
    case 'reviews':
      await reloadReviewCycles()
      break
    case 'employees':
      await loadEmployees({ reload: true })
      break
    case 'delegations':
      await hydrateManagerDelegations()
      break
    case 'notifications':
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      break
    case 'activity':
      void queryClient.invalidateQueries({
        queryKey: queryKeys.activity({}).slice(0, 1),
      })
      break
    case 'access':
      await loadEmployees({ reload: true })
      break
    case 'packets':
      break
    default:
      break
  }
  emitPlatformEvent(event)
}

export function schedulePlatformEvent(event: PlatformEvent): void {
  const key = eventKey(event)
  const existing = pending.get(key)
  if (existing) window.clearTimeout(existing)
  pending.set(
    key,
    window.setTimeout(() => {
      pending.delete(key)
      void applyTopic(event).catch(() => {
        /* Next event or REST fallback will retry. */
      })
    }, COALESCE_MS),
  )
}

export function refreshAllPlatformStores(): void {
  const topics: PlatformTopic[] = [
    'goals',
    'reviews',
    'packets',
    'employees',
    'delegations',
    'notifications',
    'activity',
    'access',
  ]
  for (const topic of topics) {
    schedulePlatformEvent({
      id: `fallback-${topic}`,
      v: 1,
      topic,
      action: 'updated',
      at: new Date().toISOString(),
    })
  }
}

export function resetPlatformHandlerTimersForTests(): void {
  for (const timer of pending.values()) window.clearTimeout(timer)
  pending.clear()
}
