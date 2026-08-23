import { ChevronRight, Circle, CircleCheck, History } from 'lucide-react'
import { CountBadge, Tooltip } from '@/components/ui'
import { cx } from '@/lib/cx'
import type { ProgressLogEntry } from '@/lib/goals/types'
import {
  formatProgressTimestamp,
  isMilestoneProgressLog,
  numericProgressSummary,
  progressLogStatusLabel,
  progressLogSummary,
} from '@/lib/goals/progressLog'

export type ProgressLogKind = 'metric' | 'milestone'

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
          <th scope="col">Date</th>
          <th scope="col">Change</th>
          <th scope="col">Note</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className="pd-goal-progress-log__row">
            <td className="pd-goal-progress-log__when">
              <time dateTime={entry.recordedAt}>
                {formatProgressTimestamp(entry.recordedAt)}
              </time>
            </td>
            <td className="pd-goal-progress-log__value">
              {showsMilestoneStatus(entry, kind) ? (
                <ProgressLogStatusIcon entry={entry} />
              ) : (
                entry.to
              )}
            </td>
            <td className="pd-goal-progress-log__note">
              {showsMilestoneStatus(entry, kind)
                ? entry.label || progressLogSummary(entry)
                : numericProgressSummary(entry)}
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
  label = 'Progress logs',
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
          Log
          <CountBadge
            count={sorted.length}
            tone="muted"
            className="pd-goals-table__log-add-count"
          />
        </span>
      </summary>
      <div className="pd-goal-progress-log__body">
        <ProgressLogTable entries={sorted} kind={kind} />
      </div>
    </details>
  )
}
