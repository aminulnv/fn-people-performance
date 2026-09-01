import {
  Building2,
  CalendarRange,
  ChevronRight,
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
  activityDisplaySummary,
  activityGoalTitle,
  activityHeadline,
  formatActivityChanges,
} from '@/lib/activity/formatChanges'
import {
  DelegatingOnBehalfHover,
  delegatingFromActivityMetadata,
} from '@/lib/delegations/DelegatingOnBehalfTip'
import {
  formatActivityTime,
  shouldShowActivityHeadline,
} from './activityLogDisplay'

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

function ChangeList({
  rows,
  primary = false,
}: {
  rows: ReturnType<typeof formatActivityChanges>
  primary?: boolean
}) {
  return (
    <ul
      className={
        primary
          ? 'pd-activity-entry__diff pd-activity-entry__diff--primary'
          : 'pd-activity-entry__diff'
      }
    >
      {rows.map((change, index) => (
        <li key={`${change.field}-${change.from}-${change.to}-${index}`}>
          <span className="pd-activity-entry__diff-field" title={change.field}>
            {change.field}
          </span>
          <span className="pd-activity-entry__diff-values">
            <span className="pd-activity-entry__diff-from" title={change.from}>
              {change.from}
            </span>
            <span aria-hidden className="pd-activity-entry__diff-arrow">
              →
            </span>
            <span className="pd-activity-entry__diff-to" title={change.to}>
              {change.to}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ActivityLogEntry({
  events,
  actorAvatarUrl,
  timeOnly = false,
  hideEntityTag = false,
  showActor = true,
}: {
  events: ActivityEvent[]
  actorAvatarUrl?: string
  timeOnly?: boolean
  hideEntityTag?: boolean
  showActor?: boolean
}) {
  const event = events[0]
  const changes = events.flatMap((item) =>
    formatActivityChanges(item.changes, {
      goalTitle: activityGoalTitle(item),
    }),
  )
  const Icon = ENTITY_ICONS[event.entityType] ?? History
  const actorName = event.actorName || 'System'
  const covering = delegatingFromActivityMetadata(event.metadata)
  const showInline = changes.length > 0 && changes.length <= INLINE_CHANGE_LIMIT
  const photoUrl = actorAvatarUrl || event.actorAvatarUrl
  const summary = activityDisplaySummary(event)
  const headline = activityHeadline(event)
  const showHeadline = shouldShowActivityHeadline(event, changes)
  const editCount = events.length
  const when = formatActivityTime(event.occurredAt, timeOnly)

  return (
    <article className="pd-activity-entry">
      <span className="pd-activity-entry__rail" aria-hidden>
        <span className="pd-activity-entry__dot">
          <Icon size={11} strokeWidth={2.25} />
        </span>
      </span>
      <div className="pd-activity-entry__body">
        {showHeadline ? (
          <p className="pd-activity-entry__headline">{headline}</p>
        ) : null}
        {summary && changes.length === 0 && !showHeadline ? (
          <p className="pd-activity-entry__summary">{summary}</p>
        ) : null}
        {showInline ? <ChangeList rows={changes} primary /> : null}
        {changes.length > INLINE_CHANGE_LIMIT ? (
          <details className="pd-activity-entry__changes">
            <summary>
              <ChevronRight
                className="pd-activity-entry__changes-chevron"
                size={12}
                strokeWidth={2.5}
                aria-hidden
              />
              Show {changes.length} changes
            </summary>
            <ChangeList rows={changes} primary />
          </details>
        ) : null}
        <footer className="pd-activity-entry__foot">
          {showActor ? (
            <DelegatingOnBehalfHover
              name={covering?.name}
              avatarUrl={covering?.avatarUrl}
            >
              <span className="pd-activity-entry__who">
                <Avatar name={actorName} src={photoUrl} size="sm" />
                <span className="pd-activity-entry__who-copy">
                  <span className="pd-activity-entry__who-name">{actorName}</span>
                  {editCount > 1 ? (
                    <span className="pd-activity-entry__edit-count">
                      {editCount} edits
                    </span>
                  ) : null}
                </span>
              </span>
            </DelegatingOnBehalfHover>
          ) : editCount > 1 ? (
            <span className="pd-activity-entry__edit-count">
              {editCount} edits
            </span>
          ) : (
            <span className="pd-activity-entry__foot-spacer" aria-hidden />
          )}
          <div className="pd-activity-entry__meta">
            {!hideEntityTag ? (
              <span className="pd-activity-entry__area">
                {activityEntityLabel(event.entityType)}
              </span>
            ) : null}
            <time dateTime={event.occurredAt}>{when}</time>
          </div>
        </footer>
      </div>
    </article>
  )
}
