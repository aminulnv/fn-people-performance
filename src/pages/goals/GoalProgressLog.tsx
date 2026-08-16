import { Check, ChevronRight, Circle } from 'lucide-react'
import type { ProgressLogEntry } from '@/lib/goals/types'
import {
  formatProgressTimestamp,
  isMilestoneProgressLog,
  progressLogStatusLabel,
  progressLogSummary,
} from '@/lib/goals/progressLog'

export function GoalProgressLog({
  entries,
}: {
  entries: ProgressLogEntry[]
}) {
  if (entries.length === 0) return null
  const newestFirst = [...entries].sort((left, right) =>
    left.recordedAt < right.recordedAt ? 1 : -1,
  )
  const countLabel = newestFirst.length === 1 ? '1 update' : `${newestFirst.length} updates`

  return (
    <details className="pd-goal-progress-log" aria-label="Progress updates">
      <summary className="pd-goal-progress-log__toggle">
        <ChevronRight
          size={13}
          strokeWidth={2.25}
          className="pd-goal-progress-log__chevron"
          aria-hidden
        />
        <span className="pd-goal-progress-log__heading">Updates</span>
        <span className="pd-goal-progress-log__count">{countLabel}</span>
      </summary>
      <ol className="pd-goal-progress-log__list">
        {newestFirst.map((entry) => (
          <li key={entry.id} className="pd-goal-progress-log__item">
            <time dateTime={entry.recordedAt}>
              {formatProgressTimestamp(entry.recordedAt)}
            </time>
            <span className="pd-goal-progress-log__summary">
              {isMilestoneProgressLog(entry) ? (
                <>
                  {entry.to ? (
                    <Check
                      size={13}
                      strokeWidth={2.5}
                      className="pd-goal-progress-log__done"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      size={12}
                      strokeWidth={2}
                      className="pd-goal-progress-log__open"
                      aria-hidden
                    />
                  )}
                  <span>
                    {progressLogStatusLabel(entry)}
                    {entry.label ? `: ${entry.label}` : ''}
                  </span>
                </>
              ) : (
                progressLogSummary(entry)
              )}
            </span>
          </li>
        ))}
      </ol>
    </details>
  )
}
