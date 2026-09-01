import type { ActivityEvent } from '@/lib/activity/types'

export type ActivityLogBundle = {
  events: ActivityEvent[]
}

const BUNDLEABLE_EVENT_KEYS = new Set([
  'goal.updated',
  'goal.manager_modified',
  'goal.metric_progress_updated',
])

function actorKey(event: ActivityEvent): string {
  if (event.actorEmployeeId != null) return `id:${event.actorEmployeeId}`
  return `name:${event.actorName || 'system'}`
}

function minuteKey(iso?: string): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

function canBundle(previous: ActivityEvent, next: ActivityEvent): boolean {
  if (!BUNDLEABLE_EVENT_KEYS.has(previous.eventKey)) return false
  if (previous.eventKey !== next.eventKey) return false
  if (actorKey(previous) !== actorKey(next)) return false
  if (minuteKey(previous.occurredAt) !== minuteKey(next.occurredAt)) return false
  return true
}

/** Collapse rapid, same-actor edit bursts into one row. */
export function bundleActivityEvents(events: ActivityEvent[]): ActivityLogBundle[] {
  const bundles: ActivityLogBundle[] = []
  for (const event of events) {
    const last = bundles[bundles.length - 1]
    const previous = last?.events[last.events.length - 1]
    if (previous && canBundle(previous, event)) {
      last.events.push(event)
      continue
    }
    bundles.push({ events: [event] })
  }
  return bundles
}

export function bundleActorKey(bundle: ActivityLogBundle): string {
  return actorKey(bundle.events[0])
}
