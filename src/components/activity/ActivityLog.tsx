import { useMemo } from 'react'
import type { ActivityEvent } from '@/lib/activity/types'
import { useEmployees } from '@/lib/employees/useEmployees'
import { ActivityLogEntry } from './ActivityLogEntry'
import {
  bundleActivityEvents,
  bundleActorKey,
} from './activityLogGrouping'

function dayKey(iso?: string): string {
  if (!iso) return 'Unknown date'
  return iso.slice(0, 10)
}

function dayLabel(key: string): string {
  if (key === 'Unknown date') return key
  const date = new Date(`${key}T00:00:00`)
  if (Number.isNaN(date.getTime())) return key
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ActivityLog({
  events,
  emptyLabel = 'No activity yet.',
  scoped = false,
}: {
  events: ActivityEvent[]
  emptyLabel?: string
  scoped?: boolean
}) {
  const { employees } = useEmployees({ load: false })
  const avatarByEmployeeId = useMemo(() => {
    const map = new Map<number, string>()
    for (const employee of employees) {
      if (employee.avatarUrl) map.set(employee.employeeId, employee.avatarUrl)
    }
    return map
  }, [employees])

  const groups = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>()
    for (const event of events) {
      const key = dayKey(event.occurredAt)
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [events])

  if (events.length === 0) {
    return <p className="pd-activity-log__empty">{emptyLabel}</p>
  }

  return (
    <div className="pd-activity-log">
      {groups.map(([key, items]) => {
        const bundles = bundleActivityEvents(items)
        let previousActorKey = ''

        return (
          <section key={key} className="pd-activity-log__group">
            <h3>{dayLabel(key)}</h3>
            <div className="pd-activity-log__list">
              {bundles.map((bundle) => {
                const event = bundle.events[0]
                const actorKey = bundleActorKey(bundle)
                const showActor = actorKey !== previousActorKey
                previousActorKey = actorKey

                return (
                  <ActivityLogEntry
                    key={bundle.events.map((item) => item.id).join(':')}
                    events={bundle.events}
                    timeOnly
                    hideEntityTag={scoped}
                    showActor={showActor}
                    actorAvatarUrl={
                      event.actorAvatarUrl ||
                      (event.actorEmployeeId != null
                        ? avatarByEmployeeId.get(event.actorEmployeeId)
                        : undefined)
                    }
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
