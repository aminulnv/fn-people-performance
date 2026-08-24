import type { ReactNode } from 'react'
import { Circle, CircleCheck, CircleDot, Minus, Plus, Target } from 'lucide-react'
import { useFocusSafeDraft } from './useFocusSafeDraft'
import { Tooltip } from '@/components/ui'
import type { Goal, Metric } from '@/lib/goals/types'
import type { MeasurementPanel } from '@/lib/goals/measurements'
import { measurementPanels, todoMeasureItems } from '@/lib/goals/measurements'
import { measurePanelName, measurePanelProgress } from '@/pages/goals/measurePanelDisplay'
import {
  formatMetricNumber,
  metricSummary,
  metricTipFromMetric,
  type MetricTipDetails,
} from './goalHelpers'

export function GoalMetricTip({ tip }: { tip: MetricTipDetails }) {
  return (
    <div className="pd-goals-table__metric-tip">
      <div className="pd-goals-table__metric-tip-title">{tip.title}</div>
      <div className="pd-goals-table__metric-tip-rows">
        <div className="pd-goals-table__metric-tip-row">
          <span>Initial value</span>
          <span>{tip.initial}</span>
        </div>
        <div className="pd-goals-table__metric-tip-row">
          <span>Current value</span>
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

export function parseWeightInputValue(raw: string, max = 100): number {
  const digits = raw.replace(/\D/g, '')
  if (digits === '') return 0
  return Math.min(Math.max(0, max), Number(digits))
}

export function formatWeightReadout(weight: number | undefined): string {
  if (weight == null) return ''
  return `${weight}%`
}

export function GoalWeightReadout({ weight }: { weight: number }) {
  const display = weightInputDisplayValue(weight)

  return (
    <span className="pd-goal-readout__stat pd-goal-measure-card__weight">
      <span className="pd-goal-measure-card__weight-field">
        <span className="pd-goal-readout__label">Weight %</span>
        <span className="pd-goals-table__weight-edit pd-goals-table__weight-edit--static">
          <span
            className="pd-goals-table__weight-value"
            aria-label={display ? `${display} percent` : 'Weight not set'}
          >
            {display}
          </span>
        </span>
      </span>
    </span>
  )
}

const WEIGHT_STEP = 5

function clampWeight(value: number, max = 100) {
  return Math.min(max, Math.max(0, Math.round(value)))
}

export function WeightHoverField({
  weight,
  ariaLabel,
  maxWeight = 100,
  showSuffix = true,
  onChange,
}: {
  weight: number
  ariaLabel: string
  maxWeight?: number
  showSuffix?: boolean
  onChange: (weight: number) => void
}) {
  const stepWeight = (delta: number) => {
    const next = clampWeight(weight + delta, maxWeight)
    if (next !== weight) onChange(next)
  }

  return (
    <div
      className="pd-goals-table__weight-edit"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="pd-goals-table__weight-step pd-goals-table__weight-step--minus"
        aria-label={`Decrease ${ariaLabel}`}
        disabled={weight <= 0}
        tabIndex={-1}
        onClick={() => stepWeight(-WEIGHT_STEP)}
      >
        <Minus size={12} strokeWidth={2.25} aria-hidden />
      </button>
      <BufferedWeightInput
        weight={weight}
        ariaLabel={ariaLabel}
        maxWeight={maxWeight}
        onChange={(next) => onChange(clampWeight(next, maxWeight))}
      />
      {showSuffix ? (
        <span className="pd-goals-table__weight-suffix" aria-hidden>
          %
        </span>
      ) : null}
      <button
        type="button"
        className="pd-goals-table__weight-step pd-goals-table__weight-step--plus"
        aria-label={`Increase ${ariaLabel}`}
        disabled={weight >= maxWeight}
        tabIndex={-1}
        onClick={() => stepWeight(WEIGHT_STEP)}
      >
        <Plus size={12} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}

export function BufferedWeightInput({
  weight,
  ariaLabel,
  className = 'pd-goals-table__weight-input',
  maxWeight = 100,
  onChange,
}: {
  weight: number
  ariaLabel: string
  className?: string
  maxWeight?: number
  onChange: (weight: number) => void
}) {
  const draft = useFocusSafeDraft(weightInputDisplayValue(weight), ariaLabel)

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={draft.text}
      aria-label={ariaLabel}
      onFocus={() => {
        draft.markFocused()
      }}
      onChange={(event) => {
        draft.setText(event.target.value.replace(/\D/g, '').slice(0, 3))
      }}
      onBlur={() => {
        const next = parseWeightInputValue(draft.text, maxWeight)
        draft.markBlurred()
        draft.setText(weightInputDisplayValue(next))
        if (next !== weight) onChange(next)
      }}
    />
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
      <span className="pd-goal-measure-card__weight-field">
        <span className="pd-goal-readout__label">Weight %</span>
        <WeightHoverField
          weight={weight}
          ariaLabel={ariaLabel}
          showSuffix={false}
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
  showCaptions = true,
}: {
  complete: number
  total: number
  tooltip?: ReactNode
  showCaptions?: boolean
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
        aria-label={`${complete} of ${total} tasks done, ${remaining} left`}
      >
        <span className="pd-goal-readout__checklist-stats">
          <span className="pd-goal-readout__checklist-stat pd-goal-readout__checklist-stat--done">
            <CircleCheck size={13} strokeWidth={2.25} aria-hidden />
            <span className="pd-goal-readout__checklist-value">{complete}</span>
            {showCaptions ? (
              <span className="pd-goal-readout__checklist-caption">done</span>
            ) : null}
          </span>
          <span
            className="pd-goal-readout__checklist-divider"
            aria-hidden
          />
          <span className="pd-goal-readout__checklist-stat pd-goal-readout__checklist-stat--remaining">
            <Circle size={13} strokeWidth={2.25} aria-hidden />
            <span className="pd-goal-readout__checklist-value">{remaining}</span>
            {showCaptions ? (
              <span className="pd-goal-readout__checklist-caption">left</span>
            ) : null}
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
  showCaptions = true,
}: {
  panel: Extract<MeasurementPanel, { kind: 'todo_measure' }>
  showCaptions?: boolean
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
        showCaptions={showCaptions}
        tooltip={
          <div className="pd-goals-table__metric-tip">
            <div className="pd-goals-table__metric-tip-title">{name}</div>
            <div className="pd-goals-table__metric-tip-rows">
              <div className="pd-goals-table__metric-tip-row">
                <span>Checklist items</span>
                <span>{total}</span>
              </div>
              <div className="pd-goals-table__metric-tip-row">
                <span>Done</span>
                <span>{complete}</span>
              </div>
              <div className="pd-goals-table__metric-tip-row">
                <span>Left</span>
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

export function GoalNumericProgress({
  current,
  target,
  tooltip,
  currentControl,
  showCaptions = true,
}: {
  current: string
  target: string
  tooltip?: ReactNode
  currentControl?: ReactNode
  showCaptions?: boolean
}) {
  const body = (
    <span
      className="pd-goal-readout__checklist"
      aria-label={`Current ${current} of target ${target}`}
    >
      <span className="pd-goal-readout__checklist-stats">
        <span className="pd-goal-readout__checklist-stat pd-goal-readout__checklist-stat--current">
          <CircleDot size={13} strokeWidth={2.25} aria-hidden />
          {currentControl ?? (
            <span className="pd-goal-readout__checklist-value">{current}</span>
          )}
          {showCaptions ? (
            <span className="pd-goal-readout__checklist-caption">now</span>
          ) : null}
        </span>
        <span className="pd-goal-readout__checklist-divider" aria-hidden />
        <span className="pd-goal-readout__checklist-stat pd-goal-readout__checklist-stat--target">
          <Target size={13} strokeWidth={2.25} aria-hidden />
          <span className="pd-goal-readout__checklist-value">{target}</span>
          {showCaptions ? (
            <span className="pd-goal-readout__checklist-caption">target</span>
          ) : null}
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

export function GoalMetricReadout({
  metric,
  currentControl,
  showWeight = true,
  showCaptions = false,
}: {
  metric: Metric
  currentControl?: ReactNode
  showWeight?: boolean
  showCaptions?: boolean
}) {
  const name = metric.title.trim() || 'Metric'
  const current = formatMetricNumber(metric.currentValue)
  const target = formatMetricNumber(metric.targetValue)
  const tip = metricTipFromMetric(metric)

  return (
    <div className="pd-goal-readout" aria-label={`Values for ${name}`}>
      <GoalNumericProgress
        current={current}
        target={target}
        currentControl={currentControl}
        showCaptions={showCaptions}
        tooltip={<GoalMetricTip tip={tip} />}
      />
      {showWeight ? <GoalWeightReadout weight={metric.weight} /> : null}
    </div>
  )
}

function isTodoMeasurePanel(
  panel: MeasurementPanel,
): panel is Extract<MeasurementPanel, { kind: 'todo_measure' }> {
  return panel.kind === 'todo_measure'
}

export function GoalMeasureReadout({
  panel,
}: {
  panel: MeasurementPanel
}) {
  if (isTodoMeasurePanel(panel)) {
    return <GoalTodoMeasureReadout panel={panel} showCaptions={false} />
  }
  return <GoalMetricReadout metric={panel.metric} showWeight={false} />
}

/** Stacked table-cell fallback when measures are not nested as rows. */
export function GoalTableMetricReadout({ goal }: { goal: Goal }) {
  const panels = measurementPanels(goal.measurements)
  if (panels.length === 0) return metricSummary(goal)

  return (
    <>
      {panels.map((panel) => (
        <GoalMeasureReadout key={panel.key} panel={panel} />
      ))}
    </>
  )
}
