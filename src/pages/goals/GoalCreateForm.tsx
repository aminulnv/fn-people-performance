import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hash,
  ListTodo,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { Avatar, Input, ListboxSelect, Textarea } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import {
  applyMetricStrategy,
  blankMetric,
  blankMilestone,
  METRIC_STRATEGIES,
  METRIC_UNITS,
  metricUsesRange,
  normalizeMetricStrategy,
  rebalanceMeasurementWeights,
  strategyLabel,
} from '@/lib/goals/measurements'
import type {
  Goal,
  Measurement,
  Metric,
  MetricStrategy,
  MetricUnit,
  Milestone,
} from '@/lib/goals/types'
import { validateGoalDraft } from '@/lib/goals/draft'
import { sumMeasurementWeights } from '@/lib/goals/weightage'

export type GoalOwnerOption = {
  id: string
  name: string
  title?: string
  avatarUrl?: string
}

type GoalCreateFormProps = {
  goal: Goal
  index: number
  total: number
  isNew?: boolean
  /** Fallback owner when the goal has no ownerId yet (page person). */
  defaultOwnerId: string
  ownerOptions: GoalOwnerOption[]
  onChange: (goal: Goal) => void
  onBack: () => void
  onSave: () => void
  onRemove?: () => void
  onSelectIndex: (index: number) => void
}

type MeasureMethod = 'number' | 'todo'

/**
 * Metrics each get their own block; every milestone belongs to one shared
 * "To Do's" block, mirroring Revolut's grouped task list.
 */
type MeasurePanel =
  | { key: string; kind: 'metric'; metric: Metric; title: string }
  | { key: string; kind: 'todos'; todos: Milestone[] }

function buildPanels(measurements: Measurement[]): MeasurePanel[] {
  const todos = measurements.filter(
    (item): item is Milestone => item.kind === 'milestone',
  )
  const panels: MeasurePanel[] = []
  let todosPlaced = false
  let metricCount = 0

  for (const measurement of measurements) {
    if (measurement.kind === 'metric') {
      metricCount += 1
      panels.push({
        key: measurement.id,
        kind: 'metric',
        metric: measurement,
        title: `Metric ${metricCount}`,
      })
      continue
    }
    if (!todosPlaced) {
      panels.push({ key: 'todos', kind: 'todos', todos })
      todosPlaced = true
    }
  }

  return panels
}

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

function ShellField({
  label,
  children,
  className = '',
  trailing,
}: {
  label?: string
  children: ReactNode
  className?: string
  trailing?: ReactNode
}) {
  return (
    <div className={`pd-goal-create__shell ${className}`.trim()}>
      {label ? <span className="pd-goal-create__shell-label">{label}</span> : null}
      <div className="pd-goal-create__shell-body">
        <div className="pd-goal-create__shell-main">{children}</div>
        {trailing ? (
          <div className="pd-goal-create__shell-trailing">{trailing}</div>
        ) : null}
      </div>
    </div>
  )
}

function OwnerSelect({
  ownerId,
  options,
  onChange,
}: {
  ownerId: string
  options: GoalOwnerOption[]
  onChange: (ownerId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const selected =
    options.find((person) => person.id === ownerId) ?? options[0] ?? null

  const filtered = (() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((person) => {
      const haystack = [person.name, person.title ?? ''].join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  })()

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

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  return (
    <div
      ref={containerRef}
      className={`pd-goal-create__byline-owner${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="pd-goal-create__byline-owner-trigger"
        aria-label={selected ? `Owner ${selected.name}` : 'Select owner'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selected ? (
          <>
            <Avatar
              name={selected.name}
              src={selected.avatarUrl}
              size="sm"
              style={avatarStyle(selected.name)}
            />
            <span className="pd-goal-create__byline-owner-name">
              {selected.name}
            </span>
          </>
        ) : (
          <span className="pd-goal-create__byline-owner-placeholder">
            Select owner
          </span>
        )}
        <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
      </button>

      {open ? (
        <div className="pd-goal-create__owner-menu" role="presentation">
          <label className="pd-goal-create__owner-search">
            <span className="pd-sr-only">Search people</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Search people"
              aria-controls={listId}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div
            id={listId}
            className="pd-goal-create__owner-list"
            role="listbox"
            aria-label="Owner"
          >
            {filtered.length === 0 ? (
              <p className="pd-goal-create__owner-empty">No people found</p>
            ) : (
              filtered.map((person) => {
                const isSelected = person.id === selected?.id
                return (
                  <button
                    key={person.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`pd-goal-create__owner-option${
                      isSelected ? ' is-selected' : ''
                    }`}
                    onClick={() => {
                      onChange(person.id)
                      setOpen(false)
                    }}
                  >
                    <Avatar
                      name={person.name}
                      src={person.avatarUrl}
                      size="sm"
                      style={avatarStyle(person.name)}
                    />
                    <span className="pd-goal-create__owner-option-copy">
                      <span className="pd-goal-create__owner-option-name">
                        {person.name}
                      </span>
                      {person.title ? (
                        <span className="pd-goal-create__owner-option-title">
                          {person.title}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden />
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
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
                className={`pd-goal-create__strategy-option${selected ? ' is-selected' : ''
                  }`}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
              >
                <StrategyIcon strategy={option.id} />
                <span>{option.label}</span>
                {selected ? <Check size={14} strokeWidth={2.5} aria-hidden /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function NumberTargetEditor({
  metric,
  onChange,
  disabled,
}: {
  metric: Metric
  onChange: (next: Metric) => void
  disabled?: boolean
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
      <p className="pd-goal-create__target-label">Set target</p>
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

const MEASURE_METHODS: {
  id: MeasureMethod
  label: string
  hint: string
  icon: typeof Hash
}[] = [
  { id: 'number', label: 'Number', hint: 'Track a value', icon: Hash },
  { id: 'todo', label: 'To Do', hint: 'Checklist tasks', icon: ListTodo },
]

function MethodSwitch({
  method,
  onMethodChange,
}: {
  method: MeasureMethod
  onMethodChange: (method: MeasureMethod) => void
}) {
  return (
    <div
      className="pd-goal-create__methods"
      role="radiogroup"
      aria-label="Measurement type"
    >
      {MEASURE_METHODS.map(({ id, label, hint, icon: Icon }) => {
        const isActive = id === method
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`pd-goal-create__method${isActive ? ' is-active' : ''}`}
            onClick={() => onMethodChange(id)}
          >
            <Icon
              className="pd-goal-create__method-icon"
              size={22}
              strokeWidth={2.25}
              aria-hidden
            />
            <span className="pd-goal-create__method-title">{label}</span>
            <span className="pd-goal-create__method-sub">{hint}</span>
          </button>
        )
      })}
    </div>
  )
}

function MeasureHead({
  title,
  removeLabel,
  onRemove,
}: {
  title: string
  removeLabel: string
  onRemove?: () => void
}) {
  return (
    <div className="pd-goal-create__measure-head">
      <h3 className="pd-goal-create__measure-title">{title}</h3>
      {onRemove ? (
        <button
          type="button"
          className="pd-goal-create__icon-btn pd-goal-create__icon-btn--danger"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <Trash2 size={15} strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

function MetricPanel({
  metric,
  title,
  canRemove,
  onChange,
  onRemove,
  onMethodChange,
}: {
  metric: Metric
  title: string
  canRemove: boolean
  onChange: (next: Metric) => void
  onRemove: () => void
  onMethodChange: (method: MeasureMethod) => void
}) {
  return (
    <div className="pd-goal-create__measure-block">
      {canRemove ? (
        <MeasureHead
          title={title}
          removeLabel={`Remove ${title.toLowerCase()}`}
          onRemove={onRemove}
        />
      ) : null}

      <MethodSwitch method="number" onMethodChange={onMethodChange} />

      <div className="pd-goal-create__metric-meta">
        <label className="pd-goal-create__shell pd-goal-create__shell--input">
          <span className="pd-goal-create__shell-label">Metric name</span>
          <input
            type="text"
            className="pd-goal-create__shell-input"
            value={metric.title}
            placeholder="Metric name"
            aria-label="Metric name"
            onChange={(event) =>
              onChange({ ...metric, title: event.target.value })
            }
          />
        </label>

        <ShellField label="Metric unit">
          <ListboxSelect
            value={metric.unit}
            aria-label="Metric unit"
            allowEmpty={false}
            options={METRIC_UNITS.map((unit) => ({
              value: unit.value,
              label: unit.label,
            }))}
            onValueChange={(next) =>
              onChange({ ...metric, unit: next as MetricUnit })
            }
          />
        </ShellField>

        <label className="pd-goal-create__shell pd-goal-create__shell--input pd-goal-create__weight-field">
          <span className="pd-goal-create__shell-label">Weight %</span>
          <input
            type="number"
            min={0}
            max={100}
            className="pd-goal-create__shell-input"
            value={metric.weight}
            aria-label={`Weight for ${metric.title.trim() || 'metric'}`}
            onChange={(event) =>
              onChange({ ...metric, weight: Number(event.target.value) || 0 })
            }
          />
        </label>
      </div>

      <NumberTargetEditor metric={metric} onChange={onChange} />
    </div>
  )
}

function TodosPanel({
  todos,
  canRemove,
  onChangeTodo,
  onAddTodo,
  onRemoveTodo,
  onRemoveAll,
  onMethodChange,
}: {
  todos: Milestone[]
  canRemove: boolean
  onChangeTodo: (next: Milestone) => void
  onAddTodo: () => void
  onRemoveTodo: (id: string) => void
  onRemoveAll: () => void
  onMethodChange: (method: MeasureMethod) => void
}) {
  return (
    <div className="pd-goal-create__measure-block">
      {canRemove ? (
        <MeasureHead
          title="To Do's"
          removeLabel="Remove All To-Dos"
          onRemove={onRemoveAll}
        />
      ) : null}

      <MethodSwitch method="todo" onMethodChange={onMethodChange} />

      <div className="pd-goal-create__todos">
        <div className="pd-goal-create__group pd-goal-create__todo-list">
          <div
            className="pd-goal-create__todo pd-goal-create__todo--head"
            aria-hidden
          >
            <span>To Do&apos;s</span>
            <span>Weight %</span>
            <span />
          </div>

          {todos.map((todo) => (
            <div key={todo.id} className="pd-goal-create__todo">
              <label className="pd-goal-create__todo-row">
                <input
                  type="checkbox"
                  className="pd-goal-create__todo-check"
                  checked={todo.complete}
                  onChange={(event) =>
                    onChangeTodo({ ...todo, complete: event.target.checked })
                  }
                />
                <input
                  type="text"
                  className="pd-goal-create__todo-input"
                  value={todo.title}
                  placeholder="Task"
                  aria-label="Task"
                  onChange={(event) =>
                    onChangeTodo({ ...todo, title: event.target.value })
                  }
                />
              </label>
              <label className="pd-goal-create__todo-weight">
                <span className="pd-sr-only">Weight %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={todo.weight}
                  aria-label={`Weight for ${todo.title.trim() || 'to-do'}`}
                  onChange={(event) =>
                    onChangeTodo({
                      ...todo,
                      weight: Number(event.target.value) || 0,
                    })
                  }
                />
              </label>
              {todos.length > 1 ? (
                <button
                  type="button"
                  className="pd-goal-create__todo-remove"
                  aria-label={`Remove task${todo.title ? ` ${todo.title}` : ''}`}
                  onClick={() => onRemoveTodo(todo.id)}
                >
                  <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                </button>
              ) : (
                <span className="pd-goal-create__todo-remove-spacer" aria-hidden />
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="pd-people__create-btn"
          onClick={onAddTodo}
        >
          <Plus size={16} strokeWidth={2} aria-hidden />
          Add To Do
        </button>
      </div>
    </div>
  )
}

export function GoalCreateForm({
  goal,
  index,
  total,
  isNew = false,
  defaultOwnerId,
  ownerOptions,
  onChange,
  onBack,
  onSave,
  onRemove,
  onSelectIndex,
}: GoalCreateFormProps) {
  const [showLinkedField, setShowLinkedField] = useState(
    Boolean(goal.linkedGoalLabel),
  )
  const titleFieldId = useId()
  const measureWeight = sumMeasurementWeights(goal.measurements)
  const draftValidation = validateGoalDraft(goal)
  const nameError = Boolean(draftValidation.nameError)
  const measurements = goal.measurements
  const panels = buildPanels(measurements)
  const ownerId = goal.ownerId ?? defaultOwnerId

  const patch = (partial: Partial<Goal>) => onChange({ ...goal, ...partial })

  /** Legacy or seeded goals can arrive weightless; give them a starting split. */
  useEffect(() => {
    if (measurements.length === 0) return
    if (sumMeasurementWeights(measurements) > 0) return
    onChange({ ...goal, measurements: rebalanceMeasurementWeights(measurements) })
  }, [goal, measurements, onChange])

  /**
   * Adding or removing a measurement re-splits evenly; per-measurement edits keep
   * whatever the user typed.
   */
  const setMeasurements = (next: Measurement[]) =>
    patch({
      measurements: rebalanceMeasurementWeights(
        next.length === 0 ? [blankMetric('increase')] : next,
      ),
    })

  const distributeWeightsEvenly = () =>
    patch({ measurements: rebalanceMeasurementWeights(measurements) })

  const addMetric = () => setMeasurements([...measurements, blankMetric('increase')])

  const addTodo = () => setMeasurements([...measurements, blankMilestone()])

  const updateMeasurement = (next: Measurement) =>
    patch({
      measurements: measurements.map((item) =>
        item.id === next.id ? next : item,
      ),
    })

  const removeMeasurement = (id: string) =>
    setMeasurements(measurements.filter((item) => item.id !== id))

  const convertMetricToTodo = (metricId: string) => {
    const metric = measurements.find((item) => item.id === metricId)
    const withoutMetric = measurements.filter((item) => item.id !== metricId)
    const todo: Milestone = {
      ...blankMilestone(),
      title: metric?.title ?? '',
    }
    setMeasurements([...withoutMetric, todo])
  }

  const convertTodosToMetric = () =>
    setMeasurements([
      ...measurements.filter((item) => item.kind === 'metric'),
      blankMetric('increase'),
    ])

  const removeAllTodos = () =>
    setMeasurements(measurements.filter((item) => item.kind === 'metric'))

  return (
    <div className="pd-goal-create" aria-label={isNew ? 'Add goal' : 'Edit goal'}>
      <header className="pd-goal-create__header">
        <div className="pd-goal-create__title-row">
          <div className="pd-goal-create__title-edit">
            <label className="pd-sr-only" htmlFor={titleFieldId}>
              Goal name
            </label>
            <textarea
              id={titleFieldId}
              className="pd-goal-create__title-input"
              value={goal.description}
              rows={1}
              placeholder={isNew ? 'Name this goal' : 'Goal name'}
              aria-invalid={nameError}
              onChange={(event) => patch({ description: event.target.value })}
            />
            {nameError ? (
              <p className="pd-goal-create__title-error" role="alert">
                Goal name is required
              </p>
            ) : null}
          </div>
          <div className="pd-goal-create__header-actions">
            {onRemove ? (
              <button
                type="button"
                className="pd-goal-create__icon-btn"
                aria-label="Remove goal"
                onClick={onRemove}
              >
                <Trash2 size={16} strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
            {total > 1 ? (
              <div className="pd-goal-create__pager">
                <button
                  type="button"
                  className="pd-goal-create__icon-btn"
                  disabled={index <= 0}
                  aria-label="Previous goal"
                  onClick={() => onSelectIndex(index - 1)}
                >
                  <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
                </button>
                <span>
                  {index + 1}/{total}
                </span>
                <button
                  type="button"
                  className="pd-goal-create__icon-btn"
                  disabled={index >= total - 1}
                  aria-label="Next goal"
                  onClick={() => onSelectIndex(index + 1)}
                >
                  <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="pd-people__ghost-btn"
              onClick={onBack}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pd-people__ghost-btn pd-people__ghost-btn--primary"
              disabled={!draftValidation.ok}
              onClick={onSave}
            >
              <Save size={15} strokeWidth={1.75} aria-hidden />
              {isNew ? 'Add Goal' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="pd-goal-create__byline">
          <OwnerSelect
            ownerId={ownerId}
            options={ownerOptions}
            onChange={(nextOwnerId) => patch({ ownerId: nextOwnerId })}
          />
        </div>
      </header>

      <div className="pd-goal-create__stack">
        <div className="pd-goal-create__goal-row">
          <Input
            label="Goal weight %"
            type="number"
            min={0}
            max={100}
            value={goal.weight}
            onChange={(event) =>
              patch({ weight: Number(event.target.value) || 0 })
            }
          />
        </div>

        <Textarea
          label="Description"
          value={goal.details ?? ''}
          placeholder="Add a description (optional)"
          rows={3}
          onChange={(event) =>
            patch({ details: event.target.value || undefined })
          }
        />

        {showLinkedField ? (
          <Input
            label="Linked goal"
            value={goal.linkedGoalLabel ?? ''}
            placeholder="Linked goal (optional)"
            onChange={(event) =>
              patch({
                linkedGoalLabel: event.target.value.trim()
                  ? event.target.value
                  : undefined,
              })
            }
          />
        ) : (
          <button
            type="button"
            className="pd-people__ghost-btn pd-goal-create__add-field"
            onClick={() => setShowLinkedField(true)}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            Add Field
          </button>
        )}

        <section
          className="pd-goal-create__progress"
          aria-label="Progress measurement"
        >
          <div className="pd-goal-create__progress-head">
            <h2>How to measure progress?</h2>
            <button
              type="button"
              className="pd-people__create-btn"
              onClick={addMetric}
            >
              <Plus size={16} strokeWidth={2} aria-hidden />
              Add Metric
            </button>
          </div>

          {panels.map((panel) =>
            panel.kind === 'metric' ? (
              <MetricPanel
                key={panel.key}
                metric={panel.metric}
                title={panel.title}
                canRemove={measurements.length > 1}
                onChange={updateMeasurement}
                onRemove={() => removeMeasurement(panel.metric.id)}
                onMethodChange={(method) => {
                  if (method === 'todo') convertMetricToTodo(panel.metric.id)
                }}
              />
            ) : (
              <TodosPanel
                key={panel.key}
                todos={panel.todos}
                canRemove={panel.todos.length < measurements.length}
                onChangeTodo={updateMeasurement}
                onAddTodo={addTodo}
                onRemoveTodo={removeMeasurement}
                onRemoveAll={removeAllTodos}
                onMethodChange={(method) => {
                  if (method === 'number') convertTodosToMetric()
                }}
              />
            ),
          )}

          <div className="pd-goal-create__weight-footer">
            <p className="pd-goal-create__weight-hint">
              Measurement weights: {measureWeight}% / 100%
              {measureWeight === 100
                ? ' — split evenly, edit any weight to override.'
                : ' — edit the weights beside each measurement so they total 100%.'}
            </p>
            {measurements.length > 1 ? (
              <button
                type="button"
                className="pd-goal-create__text-btn"
                onClick={distributeWeightsEvenly}
              >
                Distribute Evenly
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
