import { ChevronRight } from 'lucide-react'
import type { Metric } from '@/lib/goals/types'
import { GoalMetricReadout, GoalWeightReadout } from './GoalMeasurementReadout'
import { GoalProgressLog } from './GoalProgressLog'
import { MeasureKindIcon } from './MeasureKindIcon'
import { MetricProgressUpdate } from './MetricProgressUpdate'

export function NumberMeasureViewCard({
  metric,
  goalTitle,
  cycleLabel,
  highlighted = false,
  onLogProgress,
}: {
  metric: Metric
  goalTitle?: string
  cycleLabel?: string
  highlighted?: boolean
  onLogProgress?: (nextValue: number | undefined) => void
}) {
  const name = metric.title.trim()

  return (
    <details
      className={[
        'pd-goal-view__fold',
        'pd-goal-measure-card',
        highlighted ? 'is-highlighted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-measure-panel={metric.id}
      aria-label={name || 'Metric'}
      open
    >
      <summary className="pd-goal-view__fold-head">
        <ChevronRight
          size={14}
          strokeWidth={2.25}
          className="pd-goal-view__fold-chevron"
          aria-hidden
        />
        <MeasureKindIcon kind="metric" />
        <div className="pd-goal-view__fold-title">
          {name ? <h2>{name}</h2> : null}
          <GoalMetricReadout metric={metric} showWeight={false} />
        </div>
        <div className="pd-goal-view__fold-meta">
          <GoalWeightReadout weight={metric.weight} />
        </div>
      </summary>

      {onLogProgress ? (
        <MetricProgressUpdate
          metric={metric}
          goalTitle={goalTitle}
          cycleLabel={cycleLabel}
          onCommit={onLogProgress}
        />
      ) : null}

      <GoalProgressLog kind="metric" entries={metric.progressLog ?? []} />
    </details>
  )
}
