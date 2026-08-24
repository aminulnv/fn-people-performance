import {
  Building2,
  CalendarRange,
  ClipboardCheck,
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
  type ActivityEvent,
} from '@/lib/activity/types'
import {
  activityHeadline,
  formatActivityChanges,
} from '@/lib/activity/formatChanges'
import {
  DelegatingOnBehalfHover,
  delegatingFromActivityMetadata,
} from '@/lib/delegations/DelegatingOnBehalfTip'

const ENTITY_ICONS: Record<string, LucideIcon> = {
  goal: Target,
  goal_submission: Send,
  review_cycle: CalendarRange,
  review_packet: ClipboardCheck,
  employee: User,
  department: Building2,
  team: Building2,
  access: ShieldCheck,
  manager_delegation: ShieldCheck,
  manager_cover: ShieldCheck,
}

const INLINE_CHANGE_LIMIT = 4

function formatWhen(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function ChangeList({
  rows,
}: {
  rows: ReturnType<typeof formatActivityChanges>
}) {
  return (
    <ul className="pd-activity-entry__diff">
      {rows.map((change) => (
        <li key={`${change.field}-${change.from}-${change.to}`}>
          <span className="pd-activity-entry__diff-field">{change.field}</span>
          <span className="pd-activity-entry__diff-value">{change.from}</span>
          <span aria-hidden className="pd-activity-entry__diff-arrow">
            →
          </span>
          <span className="pd-activity-entry__diff-value">{change.to}</span>
        </li>
      ))}
    </ul>
  )
}

export function ActivityLogEntry({
  event,
  actorAvatarUrl,
}: {
  event: ActivityEvent
  actorAvatarUrl?: string
}) {
  const changes = formatActivityChanges(event.changes)
  const Icon = ENTITY_ICONS[event.entityType] ?? History
  const actorName = event.actorName || 'System'
  const covering = delegatingFromActivityMetadata(event.metadata)
  const showInline = changes.length > 0 && changes.length <= INLINE_CHANGE_LIMIT
  const photoUrl = actorAvatarUrl || event.actorAvatarUrl

  return (
    <article className="pd-activity-entry">
      <span className="pd-activity-entry__icon" aria-hidden>
        <Icon size={14} strokeWidth={2.25} />
      </span>
      <div className="pd-activity-entry__body">
        <header className="pd-activity-entry__head">
          <DelegatingOnBehalfHover
            name={covering?.name}
            avatarUrl={covering?.avatarUrl}
          >
            <span className="pd-activity-entry__who">
              <Avatar name={actorName} src={photoUrl} size="sm" />
              <span className="pd-activity-entry__who-copy">
                <strong>{actorName}</strong>
                <span>{activityHeadline(event)}</span>
              </span>
            </span>
          </DelegatingOnBehalfHover>
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
        {showInline ? <ChangeList rows={changes} /> : null}
        {changes.length > INLINE_CHANGE_LIMIT ? (
          <details className="pd-activity-entry__changes">
            <summary>Show {changes.length} changes</summary>
            <ChangeList rows={changes} />
          </details>
        ) : null}
      </div>
    </article>
  )
}
