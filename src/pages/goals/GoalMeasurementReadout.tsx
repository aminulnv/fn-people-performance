import type { ReactNode } from 'react'
import { Tooltip } from '@/components/ui'
import type { Metric } from '@/lib/goals/types'
import {
  formatMetricNumber,
  metricTipFromMetric,
  trackToneClass,
  type MetricTipDetails,
} from './goalHelpers'

export type GoalMetricTrack = {
  label: string
  tone: 'ok' | 'warn' | 'muted' | 'danger' | 'hold' | 'complete'
}

export function GoalMetricTip({
  tip,
  track,
}: {
  tip: MetricTipDetails
  track: GoalMetricTrack
}) {
  return (
    <div className="pd-goals-table__metric-tip">
      <div className="pd-goals-table__metric-tip-title">{tip.title}</div>
      <div className="pd-goals-table__metric-tip-rows">
        <div className="pd-goals-table__metric-tip-row">
          <span>Initial value</span>
          <span>{tip.initial}</span>
        </div>
        <div className="pd-goals-table__metric-tip-row">
          <span>
            Current value (
            <span
              className={`pd-goals-table__metric-tip-status pd-goals-table__metric-tip-status--${track.tone}`}
            >
              {track.label}
            </span>
            )
          </span>
          <span>{tip.current}</span>
        </div>
        <div className="pd-goals-table__metric-tip-row">
          <span>Target value</span>
          <span>{tip.target}</span>
        </div>
        <div className="pd-goals-table__metric-tip-row">
          <span>Unit</span>
          <span>{tip.unit}</span>
        </div>
      </div>
    </div>
  )
}

export function GoalWeightReadout({ weight }: { weight: number }) {
  return (
    <span className="pd-goal-readout__stat">
      <span className="pd-goal-readout__label">Weight</span>
      <span className="pd-goal-readout__value">{weight}%</span>
    </span>
  )
}

export function GoalMetricReadout({
  metric,
  track,
  currentControl,
  showWeight = true,
}: {
  metric: Metric
  track: GoalMetricTrack
  currentControl?: ReactNode
  showWeight?: boolean
}) {
  const name = metric.title.trim() || 'metric'
  const start = formatMetricNumber(metric.startValue)
  const current = formatMetricNumber(metric.currentValue)
  const target = formatMetricNumber(metric.targetValue)
  const tip = metricTipFromMetric(metric)

  return (
    <div className="pd-goal-readout" aria-label={`Values for ${name}`}>
      <Tooltip
        side="left"
        delayMs={80}
        content={<GoalMetricTip tip={tip} track={track} />}
      >
        <span
          className="pd-goal-readout__progress"
          aria-label={`Start ${start}, current ${current}, target ${target}`}
        >
          <span className="pd-goal-readout__value">{start}</span>
          <span className="pd-goal-readout__arrow" aria-hidden>
            {' → '}
          </span>
          {currentControl ?? (
            <span
              className={`pd-goal-readout__value pd-goal-readout__value--current ${trackToneClass(track.tone)}`}
            >
              {current}
            </span>
          )}
          <span className="pd-goal-readout__arrow" aria-hidden>
            {' → '}
          </span>
          <span className="pd-goal-readout__value">{target}</span>
        </span>
      </Tooltip>
      {showWeight ? <GoalWeightReadout weight={metric.weight} /> : null}
    </div>
  )
}
