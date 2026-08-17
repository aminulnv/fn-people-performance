import { useMemo } from 'react'
import type { ActivityEvent } from '@/lib/activity/types'
import { ActivityLogEntry } from './ActivityLogEntry'

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
}: {
  events: ActivityEvent[]
  emptyLabel?: string
}) {
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
      {groups.map(([key, items]) => (
        <section key={key} className="pd-activity-log__group">
          <h3>{dayLabel(key)}</h3>
          <div className="pd-activity-log__list">
            {items.map((event) => (
              <ActivityLogEntry key={event.id} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
