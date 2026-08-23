import {
  Building2,
  CalendarRange,
  History,
  Send,
  ShieldCheck,
  Target,
  User,
  type LucideIcon,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import {
  activityEntityLabel,
  activityEventLabel,
  type ActivityEvent,
} from '@/lib/activity/types'

const ENTITY_ICONS: Record<string, LucideIcon> = {
  goal: Target,
  goal_submission: Send,
  review_cycle: CalendarRange,
  employee: User,
  department: Building2,
  access: ShieldCheck,
}

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
  const Icon = ENTITY_ICONS[event.entityType] ?? History
  const actorName = event.actorName || 'System'

  return (
    <article className="pd-activity-entry">
      <span className="pd-activity-entry__icon" aria-hidden>
        <Icon size={14} strokeWidth={2.25} />
      </span>
      <div className="pd-activity-entry__body">
        <header className="pd-activity-entry__head">
          <div className="pd-activity-entry__who">
            <Avatar name={actorName} size="sm" />
            <div className="pd-activity-entry__who-copy">
              <strong>{actorName}</strong>
              <span>{activityEventLabel(event.eventKey)}</span>
            </div>
          </div>
          <div className="pd-activity-entry__meta">
            <span className="pd-activity-entry__area">
              {activityEntityLabel(event.entityType)}
            </span>
            <time dateTime={event.occurredAt}>{formatWhen(event.occurredAt)}</time>
          </div>
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
      </div>
    </article>
  )
}

function formatValue(value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    const text = JSON.stringify(value)
    return text.length > 96 ? `${text.slice(0, 93)}…` : text
  } catch {
    return String(value)
  }
}
