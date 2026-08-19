import type { ReactNode } from 'react'
import { Circle, CircleCheck } from 'lucide-react'
import { Tooltip } from '@/components/ui'
import type { Metric } from '@/lib/goals/types'
import type { MeasurementPanel } from '@/lib/goals/measurements'
import { todoMeasureItems } from '@/lib/goals/measurements'
import { measurePanelName, measurePanelProgress } from '@/pages/goals-v2/measurePanelDisplay'
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

export function weightInputDisplayValue(weight: number | undefined): string {
  if (weight == null || weight === 0) return ''
  return String(weight)
}

export function parseWeightInputValue(raw: string): number {
  const digits = raw.replace(/\D/g, '')
  if (digits === '') return 0
  return Math.min(100, Number(digits))
}

export function formatWeightReadout(weight: number | undefined): string {
  if (weight == null || weight === 0) return ''
  return `${weight}%`
}

export function GoalWeightReadout({ weight }: { weight: number }) {
  const display = weightInputDisplayValue(weight)

  return (
    <span className="pd-goal-readout__stat pd-goal-measure-card__weight">
      <span className="pd-goal-readout__label">Weight</span>
      <span className="pd-goals-table__weight-edit pd-goals-table__weight-edit--static">
        <span
          className="pd-goals-table__weight-value"
          aria-label={display ? `${display} percent` : 'Weight not set'}
        >
          {display}
        </span>
        <span className="pd-goals-table__weight-suffix" aria-hidden>
          %
        </span>
      </span>
    </span>
  )
}

function WeightPercentInput({
  weight,
  ariaLabel,
  onChange,
}: {
  weight: number
  ariaLabel: string
  onChange: (weight: number) => void
}) {
  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        className="pd-goals-table__weight-input"
        value={weightInputDisplayValue(weight)}
        aria-label={ariaLabel}
        onChange={(event) => onChange(parseWeightInputValue(event.target.value))}
      />
      <span className="pd-goals-table__weight-suffix" aria-hidden>
        %
      </span>
    </>
  )
}

export function GoalWeightInput({
  weight,
  ariaLabel,
  onChange,
}: {
  weight: number
  ariaLabel: string
  onChange: (weight: number) => void
}) {
  return (
    <span className="pd-goal-readout__stat pd-goal-measure-card__weight">
      <span className="pd-goal-readout__label">Weight</span>
      <span
        className="pd-goals-table__weight-edit"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <WeightPercentInput
          weight={weight}
          ariaLabel={ariaLabel}
          onChange={onChange}
        />
      </span>
    </span>
  )
}

export function GoalChecklistProgress({
  complete,
  total,
  tooltip,
}: {
  complete: number
  total: number
  tooltip?: ReactNode
}) {
  const remaining = Math.max(0, total - complete)

  const body =
    total === 0 ? (
      <span className="pd-goal-readout__checklist pd-goal-readout__checklist--empty">
        No tasks yet
      </span>
    ) : (
      <span
        className="pd-goal-readout__checklist"
        aria-label={`${complete} of ${total} tasks complete, ${remaining} remaining`}
      >
        <span className="pd-goal-readout__checklist-stats">
          <span className="pd-goal-readout__checklist-stat pd-goal-readout__checklist-stat--done">
            <CircleCheck size={13} strokeWidth={2.25} aria-hidden />
            <span className="pd-goal-readout__checklist-value">{complete}</span>
            <span className="pd-goal-readout__checklist-caption">done</span>
          </span>
          <span
            className="pd-goal-readout__checklist-divider"
            aria-hidden
          />
          <span className="pd-goal-readout__checklist-stat pd-goal-readout__checklist-stat--remaining">
            <Circle size={13} strokeWidth={2.25} aria-hidden />
            <span className="pd-goal-readout__checklist-value">{remaining}</span>
            <span className="pd-goal-readout__checklist-caption">left</span>
          </span>
        </span>
      </span>
    )

  if (!tooltip) return body

  return (
    <Tooltip side="left" delayMs={80} content={tooltip}>
      {body}
    </Tooltip>
  )
}

export function GoalTodoMeasureReadout({
  panel,
}: {
  panel: Extract<MeasurementPanel, { kind: 'todo_measure' }>
}) {
  const name = measurePanelName(panel)
  const todos = todoMeasureItems(panel)
  const complete = todos.filter((todo) => todo.complete).length
  const total = todos.length
  const progress = measurePanelProgress(panel)

  return (
    <div className="pd-goal-readout" aria-label={`Progress for ${name}`}>
      <GoalChecklistProgress
        complete={complete}
        total={total}
        tooltip={
          <div className="pd-goals-table__metric-tip">
            <div className="pd-goals-table__metric-tip-title">{name}</div>
            <div className="pd-goals-table__metric-tip-rows">
              <div className="pd-goals-table__metric-tip-row">
                <span>Checklist items</span>
                <span>{total}</span>
              </div>
              <div className="pd-goals-table__metric-tip-row">
                <span>Completed</span>
                <span>{complete}</span>
              </div>
              <div className="pd-goals-table__metric-tip-row">
                <span>Remaining</span>
                <span>{Math.max(0, total - complete)}</span>
              </div>
              <div className="pd-goals-table__metric-tip-row">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        }
      />
    </div>
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
  const name = metric.title.trim() || 'Measure'
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
