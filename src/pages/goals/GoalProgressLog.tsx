import { ChevronRight, Circle, CircleCheck, History } from 'lucide-react'
import { CountBadge, Tooltip } from '@/components/ui'
import { cx } from '@/lib/cx'
import type { ProgressLogEntry } from '@/lib/goals/types'
import {
  formatProgressTimestamp,
  isMilestoneProgressLog,
  progressLogStatusLabel,
  progressLogSummary,
} from '@/lib/goals/progressLog'

export type ProgressLogKind = 'metric' | 'milestone'

export function progressLogCountLabel(count: number) {
  return count === 0
    ? 'None yet'
    : count === 1
      ? '1 update'
      : `${count} updates`
}

export function ProgressLogHeading({
  count,
  headingId,
}: {
  count: number
  headingId?: string
}) {
  return (
    <h3 className="pd-goal-progress-log__heading" id={headingId}>
      Progress Updates{' '}
      <span className="pd-goal-progress-log__heading-count">
        {progressLogCountLabel(count)}
      </span>
    </h3>
  )
}

function showsMilestoneStatus(
  entry: ProgressLogEntry,
  kind?: ProgressLogKind,
) {
  if (kind === 'metric') return false
  if (kind === 'milestone') return true
  return isMilestoneProgressLog(entry)
}

function ProgressLogStatusIcon({ entry }: { entry: ProgressLogEntry }) {
  const label = progressLogStatusLabel(entry)
  const Icon = entry.to ? CircleCheck : Circle

  return (
    <Tooltip content={label} side="top" portal delayMs={80}>
      <span
        className={
          entry.to
            ? 'pd-goal-progress-log__status pd-goal-progress-log__done'
            : 'pd-goal-progress-log__status pd-goal-progress-log__open'
        }
        role="img"
        aria-label={label}
        tabIndex={0}
      >
        <Icon size={16} strokeWidth={2.25} aria-hidden />
      </span>
    </Tooltip>
  )
}

function keepRowClickFromOpening(event: { stopPropagation(): void }) {
  event.stopPropagation()
}

function newestFirst(entries: ProgressLogEntry[]) {
  return [...entries].sort((left, right) =>
    left.recordedAt < right.recordedAt ? 1 : -1,
  )
}

function NumericChange({ entry }: { entry: ProgressLogEntry }) {
  const from = entry.from == null ? '-' : String(entry.from)
  return (
    <span className="pd-goal-progress-log__change">
      {from}
      {' → '}
      <strong>{entry.to}</strong>
    </span>
  )
}

function ProgressLogTable({
  entries,
  kind,
}: {
  entries: ProgressLogEntry[]
  kind?: ProgressLogKind
}) {
  return (
    <table className="pd-goal-progress-log__table">
      <thead className="pd-sr-only">
        <tr>
          <th scope="col">Change</th>
          <th scope="col">Date</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className="pd-goal-progress-log__row">
            <td className="pd-goal-progress-log__value">
              {showsMilestoneStatus(entry, kind) ? (
                <span className="pd-goal-progress-log__summary">
                  <ProgressLogStatusIcon entry={entry} />
                  {entry.label || progressLogSummary(entry)}
                </span>
              ) : (
                <NumericChange entry={entry} />
              )}
            </td>
            <td className="pd-goal-progress-log__when">
              <time dateTime={entry.recordedAt}>
                {formatProgressTimestamp(entry.recordedAt)}
              </time>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function GoalProgressLog({
  entries,
  kind,
  label = 'Progress Updates',
  className,
  variant = 'fold',
}: {
  entries: ProgressLogEntry[]
  kind?: ProgressLogKind
  label?: string
  className?: string
  variant?: 'fold' | 'list'
}) {
  if (entries.length === 0) return null
  const sorted = newestFirst(entries)

  if (variant === 'list') {
    return (
      <div className={cx('pd-goal-progress-log', className)} aria-label={label}>
        <ProgressLogTable entries={sorted} kind={kind} />
      </div>
    )
  }

  return (
    <details
      className={cx('pd-goal-progress-log', className)}
      aria-label={label}
      onClick={keepRowClickFromOpening}
      onKeyDown={keepRowClickFromOpening}
    >
      <summary className="pd-goal-progress-log__toggle">
        <ChevronRight
          size={13}
          strokeWidth={2.25}
          className="pd-goal-progress-log__chevron"
          aria-hidden
        />
        <span className="pd-goals-table__log-add">
          <History size={11} strokeWidth={2} aria-hidden />
          Progress
          <CountBadge
            count={sorted.length}
            tone="muted"
            className="pd-goals-table__log-add-count"
          />
        </span>
      </summary>
      <div className="pd-goal-progress-log__body">
        <ProgressLogHeading count={sorted.length} />
        <ProgressLogTable entries={sorted} kind={kind} />
      </div>
    </details>
  )
}
