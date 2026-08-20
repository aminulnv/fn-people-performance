import { ChevronRight, Circle, CircleCheck } from 'lucide-react'
import { Tooltip } from '@/components/ui'
import type { ProgressLogEntry } from '@/lib/goals/types'
import {
  formatProgressTimestamp,
  isMilestoneProgressLog,
  progressLogStatusLabel,
  progressLogSummary,
} from '@/lib/goals/progressLog'

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

export function GoalProgressLog({
  entries,
}: {
  entries: ProgressLogEntry[]
}) {
  if (entries.length === 0) return null
  const newestFirst = [...entries].sort((left, right) =>
    left.recordedAt < right.recordedAt ? 1 : -1,
  )
  const countLabel =
    newestFirst.length === 1 ? '1 update' : `${newestFirst.length} updates`

  return (
    <details className="pd-goal-progress-log" aria-label="Progress logs">
      <summary className="pd-goal-progress-log__toggle">
        <ChevronRight
          size={13}
          strokeWidth={2.25}
          className="pd-goal-progress-log__chevron"
          aria-hidden
        />
        <span className="pd-goal-progress-log__heading">Progress logs</span>
        <span className="pd-goal-progress-log__count">{countLabel}</span>
      </summary>
      <div className="pd-goal-progress-log__body">
      <table className="pd-goal-progress-log__table">
        <thead className="pd-sr-only">
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Change</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {newestFirst.map((entry) => (
            <tr key={entry.id} className="pd-goal-progress-log__row">
              <td className="pd-goal-progress-log__when">
                <time dateTime={entry.recordedAt}>
                  {formatProgressTimestamp(entry.recordedAt)}
                </time>
              </td>
              <td className="pd-goal-progress-log__value">
                {isMilestoneProgressLog(entry) ? (
                  <ProgressLogStatusIcon entry={entry} />
                ) : (
                  entry.to
                )}
              </td>
              <td className="pd-goal-progress-log__note">
                {isMilestoneProgressLog(entry)
                  ? entry.label || progressLogSummary(entry)
                  : progressLogSummary(entry)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </details>
  )
}
