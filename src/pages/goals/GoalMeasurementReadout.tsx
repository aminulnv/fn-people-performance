import type { ReactNode } from 'react'
import {
  ArrowRight,
  Circle,
  CircleCheck,
  CircleDot,
  Minus,
  Plus,
  Target,
} from 'lucide-react'
import { useFocusSafeDraft } from './useFocusSafeDraft'
import { Progress, Tooltip } from '@/components/ui'
import type { Goal, Metric } from '@/lib/goals/types'
import {
  measurementPanels,
  metricLowerLabel,
  metricUpperLabel,
  metricUsesRange,
  normalizeMetricStrategy,
  strategyLabel,
  todoMeasureItems,
  type MeasurementPanel,
} from '@/lib/goals/measurements'
import { measurementProgress } from '@/lib/goals/weightage'
import {
  measurePanelName,
  measurePanelProgress,
} from '@/pages/goals/measurePanelDisplay'
import { proofLinkLabel, proofParts } from '@/lib/goals/proof'
import {
  formatMetricNumber,
  metricSummary,
  metricTipFromMetric,
} from './goalHelpers'
import { GoalTodoCheck } from './GoalTodoCheck'

function MetricScore({
  current,
  target,
  progress,
  gap,
  unit,
}: {
  current: string
  target: string
  progress: number
  gap: string | null
  unit: string
}) {
  return (
    <div className="pd-okr-ref__detail-score">
      <div className="pd-okr-ref__detail-score-pair" aria-label={`${current} of ${target} ${unit}`}>
        <div className="pd-okr-ref__detail-score-side">
          <span className="pd-okr-ref__detail-score-value">{current}</span>
          <span className="pd-okr-ref__detail-score-label">Current</span>
        </div>
        <ArrowRight
          className="pd-okr-ref__detail-score-arrow"
          size={16}
          strokeWidth={2}
          aria-hidden
        />
        <div className="pd-okr-ref__detail-score-side pd-okr-ref__detail-score-side--target">
          <span className="pd-okr-ref__detail-score-value">{target}</span>
          <span className="pd-okr-ref__detail-score-label">Target</span>
        </div>
      </div>
      <div className="pd-okr-ref__detail-score-progress">
        <Progress value={progress} showValue label="Progress" />
        {gap ? (
          <p className="pd-okr-ref__detail-score-gap">{gap}</p>
        ) : null}
      </div>
    </div>
  )
}

function ChecklistScore({
  complete,
  total,
  remaining,
  progress,
}: {
  complete: number
  total: number
  remaining: number
  progress: number
}) {
  return (
    <div className="pd-okr-ref__detail-score">
      <div
        className="pd-okr-ref__detail-score-pair"
        aria-label={`${complete} of ${total} tasks done, ${remaining} left`}
      >
        <div className="pd-okr-ref__detail-score-side">
          <span className="pd-okr-ref__detail-score-value">{complete}</span>
          <span className="pd-okr-ref__detail-score-label">Done</span>
        </div>
        <ArrowRight
          className="pd-okr-ref__detail-score-arrow"
          size={16}
          strokeWidth={2}
          aria-hidden
        />
        <div className="pd-okr-ref__detail-score-side pd-okr-ref__detail-score-side--target">
          <span className="pd-okr-ref__detail-score-value">{total}</span>
          <span className="pd-okr-ref__detail-score-label">Items</span>
        </div>
      </div>
      <div className="pd-okr-ref__detail-score-progress">
        <Progress value={progress} showValue label="Progress" />
        <p className="pd-okr-ref__detail-score-gap">
          {remaining === 0
            ? 'All tasks done'
            : remaining === 1
              ? '1 task left'
              : `${remaining} tasks left`}
        </p>
      </div>
    </div>
  )
}

function DetailMeta({ children }: { children: ReactNode }) {
  return <ul className="pd-okr-ref__detail-meta">{children}</ul>
}

function DetailMetaItem({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <li>
      <span className="pd-okr-ref__detail-meta-label">{label}</span>
      <span className="pd-okr-ref__detail-meta-value">{value}</span>
    </li>
  )
}

function metricGapLabel(metric: Metric): string | null {
  const current = metric.currentValue
  const target = metric.targetValue
  if (current == null || target == null) return null
  const strategy = normalizeMetricStrategy(metric.direction)
  if (strategy === 'between') {
    const min = metric.rangeMin
    const max = metric.rangeMax
    if (min == null || max == null) return null
    if (current >= min && current <= max) return 'In range'
    return current < min
      ? `${formatMetricNumber(min - current)} below range`
      : `${formatMetricNumber(current - max)} above range`
  }
  const remaining =
    strategy === 'decrease' || strategy === 'keep_below'
      ? current - target
      : target - current
  if (remaining === 0) return 'On target'
  return remaining > 0
    ? `${formatMetricNumber(remaining)} to go`
    : `${formatMetricNumber(Math.abs(remaining))} past target`
}

export function GoalMetricTip({
  metric,
}: {
  metric: Metric
}) {
  const tip = metricTipFromMetric(metric)
  const proof = proofParts(metric.proofUrl, metric.comment)
  const strategy = normalizeMetricStrategy(metric.direction)
  const usesRange = metricUsesRange(strategy)
  const progress = Math.round(measurementProgress(metric))
  const name = metric.title.trim() || 'Metric'
  const gap = metricGapLabel(metric)

  return (
    <div className="pd-okr-ref__detail">
      <header className="pd-okr-ref__detail-head">
        <p className="pd-okr-ref__detail-kind">
          {strategyLabel(metric.direction)} metric
        </p>
        <h3>{name}</h3>
        {proof.note ? (
          <p className="pd-okr-ref__detail-desc">{proof.note}</p>
        ) : null}
      </header>
      <MetricScore
        current={tip.current}
        target={tip.target}
        progress={progress}
        gap={gap}
        unit={tip.unit}
      />
      <DetailMeta>
        <DetailMetaItem label="Initial" value={tip.initial} />
        <DetailMetaItem label="Unit" value={tip.unit} />
        <DetailMetaItem label="Weight" value={`${metric.weight}%`} />
        {usesRange ? (
          <DetailMetaItem
            label={metricLowerLabel(strategy)}
            value={formatMetricNumber(metric.rangeMin)}
          />
        ) : null}
        {usesRange ? (
          <DetailMetaItem
            label={metricUpperLabel(strategy)}
            value={formatMetricNumber(metric.rangeMax)}
          />
        ) : null}
        {proof.href ? (
          <DetailMetaItem
            label="Proof"
            value={
              <a
                href={proof.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                {proofLinkLabel(proof.href)}
              </a>
            }
          />
        ) : null}
      </DetailMeta>
    </div>
  )
}

export function GoalTodoMeasureTip({
  panel,
}: {
  panel: Extract<MeasurementPanel, { kind: 'todo_measure' }>
}) {
  const name = measurePanelName(panel) || 'Checklist'
  const todos = todoMeasureItems(panel)
  const complete = todos.filter((todo) => todo.complete).length
  const total = todos.length
  const remaining = Math.max(0, total - complete)
  const progress = measurePanelProgress(panel)
  const proofSource =
    todos.find((todo) => proofParts(todo.proofUrl, todo.comment).hasProof) ??
    todos[0]
  const proof = proofParts(proofSource?.proofUrl, proofSource?.comment)
  const preview = todos.slice(0, 6)
  const extra = Math.max(0, todos.length - preview.length)

  return (
    <div className="pd-okr-ref__detail">
      <header className="pd-okr-ref__detail-head">
        <p className="pd-okr-ref__detail-kind">Checklist</p>
        <h3>{name}</h3>
        {proof.note ? (
          <p className="pd-okr-ref__detail-desc">{proof.note}</p>
        ) : null}
      </header>
      <ChecklistScore
        complete={complete}
        total={total}
        remaining={remaining}
        progress={progress}
      />
      <DetailMeta>
        <DetailMetaItem label="Weight" value={`${panel.weight}%`} />
        {proof.href ? (
          <DetailMetaItem
            label="Proof"
            value={
              <a
                href={proof.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                {proofLinkLabel(proof.href)}
              </a>
            }
          />
        ) : null}
      </DetailMeta>
      {preview.length > 0 ? (
        <section className="pd-okr-ref__detail-section">
          <h4>Tasks</h4>
          <ul className="pd-okr-ref__detail-tasks">
            {preview.map((todo) => {
              const taskName = todo.title.trim() || 'Untitled task'
              return (
                <li
                  key={todo.id}
                  className={
                    todo.complete
                      ? 'pd-okr-ref__detail-task is-done'
                      : 'pd-okr-ref__detail-task'
                  }
                >
                  <GoalTodoCheck
                    checked={todo.complete}
                    disabled
                    ariaLabel={
                      todo.complete ? `${taskName}, done` : `${taskName}, not done`
                    }
                    onChange={() => {}}
                  />
                  <span className="pd-okr-ref__detail-task-title">{taskName}</span>
                </li>
              )
            })}
          </ul>
          {extra > 0 ? (
            <p>+{extra} more {extra === 1 ? 'task' : 'tasks'}</p>
          ) : null}
        </section>
      ) : (
        <section className="pd-okr-ref__detail-section">
          <h4>Tasks</h4>
          <p>No tasks yet</p>
        </section>
      )}
    </div>
  )
}

export function GoalMeasureGlance({
  panel,
}: {
  panel: MeasurementPanel
}) {
  return panel.kind === 'metric' ? (
    <GoalMetricTip metric={panel.metric} />
  ) : (
    <GoalTodoMeasureTip panel={panel} />
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
    <Tooltip side="left" delayMs={80} interactive content={tooltip}>
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

  return (
    <div className="pd-goal-readout" aria-label={`Progress for ${name}`}>
      <GoalChecklistProgress
        complete={complete}
        total={total}
        showCaptions={showCaptions}
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
    <Tooltip side="left" delayMs={80} interactive content={tooltip}>
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

  return (
    <div className="pd-goal-readout" aria-label={`Values for ${name}`}>
      <GoalNumericProgress
        current={current}
        target={target}
        currentControl={currentControl}
        showCaptions={showCaptions}
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
