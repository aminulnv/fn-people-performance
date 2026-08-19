import { useEffect, useId, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
} from 'lucide-react'
import {
  applyMetricStrategy,
  METRIC_STRATEGIES,
  metricUsesRange,
  normalizeMetricStrategy,
  strategyLabel,
} from '@/lib/goals/measurements'
import type { Metric, MetricStrategy } from '@/lib/goals/types'

function StrategyIcon({
  strategy,
  size = 13,
}: {
  strategy: MetricStrategy
  size?: number
}) {
  const props = { size, strokeWidth: 2.25, 'aria-hidden': true as const }
  switch (strategy) {
    case 'increase':
      return <ArrowUp {...props} />
    case 'decrease':
      return <ArrowDown {...props} />
    case 'between':
      return <ArrowLeftRight {...props} />
    case 'keep_above':
      return <ArrowUpRight {...props} />
    case 'keep_below':
      return <ArrowDownRight {...props} />
  }
}

function StrategySelect({
  value,
  onChange,
  disabled,
  ariaLabelledBy,
}: {
  value: MetricStrategy
  onChange: (next: MetricStrategy) => void
  disabled?: boolean
  ariaLabelledBy?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={containerRef}
      className={`pd-goal-create__strategy${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="pd-goal-create__strategy-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={ariaLabelledBy}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="pd-goal-create__strategy-current">
          <StrategyIcon strategy={value} />
          {strategyLabel(value)}
        </span>
        <ChevronDown size={12} strokeWidth={2.25} aria-hidden />
      </button>
      {open ? (
        <div
          id={listId}
          className="pd-goal-create__strategy-menu"
          role="listbox"
          aria-label="Strategy"
        >
          {METRIC_STRATEGIES.map((option) => {
            const selected = option.id === value
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`pd-goal-create__strategy-option${
                  selected ? ' is-selected' : ''
                }`}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
              >
                <StrategyIcon strategy={option.id} />
                <span>{option.label}</span>
                {selected ? (
                  <Check size={14} strokeWidth={2.5} aria-hidden />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function NumberTargetEditor({
  metric,
  onChange,
  disabled,
  showHeading = true,
}: {
  metric: Metric
  onChange: (next: Metric) => void
  disabled?: boolean
  showHeading?: boolean
}) {
  const strategy = normalizeMetricStrategy(metric.direction)
  const usesRange = metricUsesRange(strategy)
  const strategyLabelId = useId()

  const lowerValue =
    strategy === 'increase' || strategy === 'decrease'
      ? (metric.startValue ?? '')
      : (metric.rangeMin ?? '')

  const upperValue =
    strategy === 'increase' || strategy === 'decrease'
      ? (metric.targetValue ?? '')
      : (metric.rangeMax ?? '')

  const lowerLabel =
    strategy === 'increase' || strategy === 'decrease'
      ? 'Start value'
      : 'Lower limit'
  const upperLabel =
    strategy === 'increase' || strategy === 'decrease'
      ? 'Target value'
      : 'Upper limit'

  const parseOptional = (raw: string): number | '' => {
    if (raw.trim() === '') return ''
    const next = Number(raw)
    return Number.isFinite(next) ? next : ''
  }

  return (
    <div className="pd-goal-create__target">
      {showHeading ? (
        <p className="pd-goal-create__target-label">Set target</p>
      ) : null}
      <div className="pd-goal-create__target-row">
        <label className="pd-goal-create__target-field">
          <span className="pd-goal-create__target-field-label">{lowerLabel}</span>
          <span className="pd-goal-create__target-control">
            <input
              type="number"
              inputMode="decimal"
              className="pd-goal-create__shell-input"
              value={lowerValue}
              disabled={disabled}
              onChange={(event) => {
                const next = parseOptional(event.target.value)
                if (strategy === 'increase' || strategy === 'decrease') {
                  const startValue = next === '' ? undefined : next
                  onChange({
                    ...metric,
                    startValue,
                    currentValue: startValue,
                  })
                  return
                }
                if (strategy === 'keep_above') {
                  const rangeMin = next === '' ? undefined : next
                  onChange({
                    ...metric,
                    rangeMin,
                    targetValue: rangeMin,
                  })
                  return
                }
                if (strategy === 'between') {
                  onChange({
                    ...metric,
                    rangeMin: next === '' ? undefined : next,
                  })
                  return
                }
                onChange({
                  ...metric,
                  rangeMin: next === '' ? undefined : next,
                })
              }}
            />
          </span>
        </label>

        <div className="pd-goal-create__target-field pd-goal-create__target-strategy">
          <span className="pd-goal-create__target-field-label" id={strategyLabelId}>
            Strategy
          </span>
          <span className="pd-goal-create__target-control">
            <StrategySelect
              value={strategy}
              disabled={disabled}
              ariaLabelledBy={strategyLabelId}
              onChange={(nextStrategy) =>
                onChange(applyMetricStrategy(metric, nextStrategy))
              }
            />
          </span>
        </div>

        <label className="pd-goal-create__target-field">
          <span className="pd-goal-create__target-field-label">{upperLabel}</span>
          <span className="pd-goal-create__target-control">
            <input
              type="number"
              inputMode="decimal"
              className="pd-goal-create__shell-input"
              value={upperValue}
              disabled={disabled}
              onChange={(event) => {
                const next = parseOptional(event.target.value)
                if (strategy === 'increase' || strategy === 'decrease') {
                  onChange({
                    ...metric,
                    targetValue: next === '' ? undefined : next,
                  })
                  return
                }
                if (strategy === 'keep_below') {
                  const rangeMax = next === '' ? undefined : next
                  onChange({
                    ...metric,
                    rangeMax,
                    targetValue: rangeMax,
                  })
                  return
                }
                if (strategy === 'between') {
                  onChange({
                    ...metric,
                    rangeMax: next === '' ? undefined : next,
                  })
                  return
                }
                onChange({
                  ...metric,
                  rangeMax: next === '' ? undefined : next,
                })
              }}
            />
          </span>
        </label>
      </div>
      {usesRange &&
      strategy === 'between' &&
      metric.rangeMin != null &&
      metric.rangeMax != null &&
      metric.rangeMin > metric.rangeMax ? (
        <p className="pd-goal-create__error" role="alert">
          Lower limit must be less than or equal to upper limit.
        </p>
      ) : null}
    </div>
  )
}
