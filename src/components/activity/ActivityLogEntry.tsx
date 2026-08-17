import { activityEventLabel, type ActivityEvent } from '@/lib/activity/types'

function formatWhen(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function ActivityLogEntry({ event }: { event: ActivityEvent }) {
  const hasChanges = event.changes.length > 0

  return (
    <article className="pd-activity-entry">
      <header className="pd-activity-entry__head">
        <div className="pd-activity-entry__who">
          <strong>{event.actorName || 'System'}</strong>
          <span>{activityEventLabel(event.eventKey)}</span>
        </div>
        <time dateTime={event.occurredAt}>{formatWhen(event.occurredAt)}</time>
      </header>
      {event.summary ? (
        <p className="pd-activity-entry__summary">{event.summary}</p>
      ) : null}
      {hasChanges ? (
        <details className="pd-activity-entry__changes">
          <summary>Show changes</summary>
          <ul>
            {event.changes.map((change) => (
              <li key={`${event.id}-${change.field}`}>
                <span>{change.field}</span>
                <code>{formatValue(change.from)}</code>
                <span aria-hidden>→</span>
                <code>{formatValue(change.to)}</code>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  )
}

function formatValue(value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
