import { ChevronRight } from 'lucide-react'
import { Tooltip } from '@/components/ui'
import type { Metric } from '@/lib/goals/types'
import {
  GoalMetricReadout,
  GoalMetricTip,
  GoalWeightReadout,
} from './GoalMeasurementReadout'
import { GoalProgressLog } from './GoalProgressLog'
import { ignoreInteractiveSummaryClick } from './measureFold'
import { MeasureKindIcon } from './MeasureKindIcon'
import { MeasureProofFields } from './MeasureProofFields'
import { MetricProgressUpdate } from './MetricProgressUpdate'

export function NumberMeasureViewCard({
  metric,
  goalTitle,
  cycleLabel,
  highlighted = false,
  onLogProgress,
  onProofChange,
}: {
  metric: Metric
  goalTitle?: string
  cycleLabel?: string
  highlighted?: boolean
  onLogProgress?: (nextValue: number | undefined) => void
  onProofChange?: (next: { proofUrl?: string; comment?: string }) => void
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
      <summary
        className="pd-goal-view__fold-head"
        onClick={ignoreInteractiveSummaryClick}
      >
        <ChevronRight
          size={14}
          strokeWidth={2.25}
          className="pd-goal-view__fold-chevron"
          aria-hidden
        />
        <MeasureKindIcon kind="metric" />
        <div className="pd-goal-view__fold-title">
          {name ? (
            <Tooltip
              className="pd-goals-table__measure-name-tip"
              side="left"
              portal
              interactive
              delayMs={80}
              content={<GoalMetricTip metric={metric} />}
            >
              <h2>{name}</h2>
            </Tooltip>
          ) : null}
          <GoalMetricReadout metric={metric} showWeight={false} />
        </div>
        <div className="pd-goal-view__fold-meta">
          <MeasureProofFields
            proofUrl={metric.proofUrl}
            comment={metric.comment}
            name={name || "metric"}
            disabled={!onProofChange}
            onChange={onProofChange}
          />
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
