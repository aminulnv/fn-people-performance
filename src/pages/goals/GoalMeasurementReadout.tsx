import type { ReactNode } from 'react'
import { Circle, CircleCheck, CircleDot, Minus, Plus, Target } from 'lucide-react'
import { useFocusSafeDraft } from './useFocusSafeDraft'
import { Tooltip } from '@/components/ui'
import type { Goal, Metric, ProgressLogEntry } from '@/lib/goals/types'
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
import { formatProgressTimestamp } from '@/lib/goals/progressLog'
import { proofLinkLabel, proofParts } from '@/lib/goals/proof'
import {
  formatMetricNumber,
  formatRefreshAge,
  metricSummary,
  metricTipFromMetric,
} from './goalHelpers'

function Fact({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function latestLog(entries: ProgressLogEntry[]): ProgressLogEntry | undefined {
  return entries.reduce<ProgressLogEntry | undefined>((latest, entry) => {
    if (!latest || entry.recordedAt > latest.recordedAt) return entry
    return latest
  }, undefined)
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

function lastUpdateLine(entries: ProgressLogEntry[]): string | null {
  const last = latestLog(entries)
  if (!last) return null
  const age = formatRefreshAge(last.recordedAt)
  const who = last.authorName.trim()
  return who ? `${who} · ${age}` : age
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
  const lastUpdate = lastUpdateLine(metric.progressLog ?? [])
  const last = latestLog(metric.progressLog ?? [])

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
      <dl className="pd-okr-ref__detail-facts">
        <Fact label="Current" value={tip.current} />
        <Fact label="Target" value={tip.target} />
        <Fact label="Initial" value={tip.initial} />
        <Fact label="Unit" value={tip.unit} />
        {usesRange ? (
          <Fact
            label={metricLowerLabel(strategy)}
            value={formatMetricNumber(metric.rangeMin)}
          />
        ) : null}
        {usesRange ? (
          <Fact
            label={metricUpperLabel(strategy)}
            value={formatMetricNumber(metric.rangeMax)}
          />
        ) : null}
        {gap ? <Fact label="Gap" value={gap} /> : null}
        <Fact label="Weight" value={`${metric.weight}%`} />
        <Fact label="Progress" value={`${progress}%`} />
        {proof.href ? (
          <Fact
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
      </dl>
      {lastUpdate && last ? (
        <section className="pd-okr-ref__detail-section">
          <h4>Last update</h4>
          <p title={formatProgressTimestamp(last.recordedAt)}>{lastUpdate}</p>
        </section>
      ) : null}
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
  const entries = todos.flatMap((todo) => todo.progressLog ?? [])
  const lastUpdate = lastUpdateLine(entries)
  const last = latestLog(entries)

  return (
    <div className="pd-okr-ref__detail">
      <header className="pd-okr-ref__detail-head">
        <p className="pd-okr-ref__detail-kind">Checklist</p>
        <h3>{name}</h3>
        {proof.note ? (
          <p className="pd-okr-ref__detail-desc">{proof.note}</p>
        ) : null}
      </header>
      <dl className="pd-okr-ref__detail-facts">
        <Fact label="Done" value={complete} />
        <Fact label="Left" value={remaining} />
        <Fact label="Items" value={total} />
        <Fact label="Progress" value={`${progress}%`} />
        <Fact label="Weight" value={`${panel.weight}%`} />
        {proof.href ? (
          <Fact
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
      </dl>
      {preview.length > 0 ? (
        <section className="pd-okr-ref__detail-section">
          <h4>Tasks</h4>
          <ul>
            {preview.map((todo) => (
              <li key={todo.id}>
                {todo.title.trim() || 'Untitled task'}
                {todo.complete ? ' · Done' : ''}
              </li>
            ))}
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
      {lastUpdate && last ? (
        <section className="pd-okr-ref__detail-section">
          <h4>Last update</h4>
          <p title={formatProgressTimestamp(last.recordedAt)}>{lastUpdate}</p>
        </section>
      ) : null}
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
