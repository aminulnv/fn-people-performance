import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
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
  Copy,
  GitFork,
  Hash,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
} from 'lucide-react'
import { Avatar, Badge, ConfirmDialog, ListboxSelect } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { goalCompletion, newId } from '@/lib/goalsApi'
import {
  applyMetricStrategy,
  blankMetric,
  blankMilestone,
  METRIC_STRATEGIES,
  METRIC_UNITS,
  metricLowerLabel,
  metricUpperLabel,
  metricUsesRange,
  normalizeMetricStrategy,
  rebalanceMeasurementWeights,
  strategyLabel,
} from '@/lib/goals/measurements'
import type {
  Goal,
  GoalProgressStatus,
  Measurement,
  Metric,
  MetricStrategy,
  MetricUnit,
  Milestone,
  PersonGoals,
} from '@/lib/goals/types'
import { sumMeasurementWeights } from '@/lib/goals/weightage'
import {
  formatRefreshAge,
  goalTitle,
  GOAL_PROGRESS_STATUS_OPTIONS,
  progressStatusClass,
  trackLabel,
  trackToneClass,
} from '@/pages/goals/goalHelpers'
import { statusLabel } from '@/pages/goals/statusLabels'
import { isGoalDraftDirty, validateGoalDraft } from './draftHelpers'
import {
  EMPTY_LINE_MANAGER_CASCADE,
  CascadeLabel,
  GoalCascadeField,
  GoalCascadeFromReadout,
  GoalCascadedTo,
  type CascadeGoalHref,
} from '@/pages/goals/GoalCascadeField'
import {
  GoalCascadeTargetDialog,
  type CascadeTarget,
} from '@/pages/goals/GoalCascadeTargetDialog'
import type {
  CascadeRecipient,
  LineManagerCascade,
} from '@/lib/goals/operations'

export type GoalOwnerOption = {
  id: string
  name: string
  title?: string
  avatarUrl?: string
}

export type GoalUnifiedOwner = {
  name: string
  avatarUrl?: string
}

type GoalUnifiedDetailProps = {
  goal: Goal
  index: number
  total: number
  /** True when this goal was just created and should open in edit mode. */
  isNew?: boolean
  owner: GoalUnifiedOwner
  defaultOwnerId: string
  ownerOptions: GoalOwnerOption[]
  cascadeFrom?: LineManagerCascade
  cascadedTo?: CascadeRecipient[]
  cascadeHref?: CascadeGoalHref
  cycleLabel: string
  isCurrentCycle?: boolean
  status: PersonGoals['status']
  commentAuthorName: string
  canEdit?: boolean
  canUpdateProgress?: boolean
  canRemove?: boolean
  canCascade?: boolean
  cascadeTargets?: CascadeTarget[]
  /** Persist structural edits (save from edit mode). */
  onSave: (goal: Goal) => void
  /** Persist lightweight progress mutations while viewing. */
  onProgressChange: (goal: Goal) => void
  onDuplicate?: () => void
  onCascade?: (reportIds: string[]) => void
  onRemove?: () => void
  onSelectIndex: (index: number) => void
  onBack: () => void
  /** Discard an unsaved new goal and leave. */
  onDiscardNew?: () => void
}

function approvalCopy(status: PersonGoals['status']): {
  title: string
  sub: string
  tone: 'ok' | 'pending' | 'draft'
} {
  if (status === 'approved') {
    return { title: 'Approved', sub: 'Locked for this cycle', tone: 'ok' }
  }
  if (status === 'submitted') {
    return {
      title: 'Pending approval',
      sub: 'Waiting on manager',
      tone: 'pending',
    }
  }
  if (status === 'sent_back') {
    return { title: 'Sent back', sub: 'Needs changes', tone: 'pending' }
  }
  return { title: statusLabel(status), sub: 'Not submitted yet', tone: 'draft' }
}

function touch(goal: Goal, partial: Partial<Goal>): Goal {
  return { ...goal, ...partial, updatedAt: new Date().toISOString() }
}

function unitSuffix(unit: MetricUnit): string {
  return unit === '%' ? '%' : ''
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

type MenuItem = {
  id: string
  label: string
  icon?: ReactNode
  danger?: boolean
  onSelect: () => void
}

/** Compact overflow menu — keeps per-card actions out of the reading path. */
function CardMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
    <div ref={containerRef} className="pd-goal-v2__menu">
      <button
        type="button"
        className="pd-goal-v2__icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden />
      </button>
      {open ? (
        <div className="pd-goal-v2__menu-panel" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`pd-goal-v2__menu-item${
                item.danger ? ' pd-goal-v2__menu-item--danger' : ''
              }`}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function WeightInput({
  value,
  label,
  onChange,
}: {
  value: number
  label: string
  onChange: (next: number) => void
}) {
  return (
    <label className="pd-goal-v2__weight">
      <span className="pd-sr-only">{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
      <span aria-hidden>%</span>
    </label>
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
      className={`pd-goal-v2__owner${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="pd-goal-v2__owner-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="pd-goal-v2__owner-trigger-main">
          {selected ? (
            <>
              <Avatar
                name={selected.name}
                src={selected.avatarUrl}
                size="sm"
                style={avatarStyle(selected.name)}
              />
              <span>{selected.name}</span>
            </>
          ) : (
            <span className="pd-goal-v2__owner-placeholder">Select owner</span>
          )}
        </span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div className="pd-goal-v2__owner-menu" role="presentation">
          <label className="pd-goal-v2__owner-search">
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
            className="pd-goal-v2__owner-list"
            role="listbox"
            aria-label="Owner"
          >
            {filtered.length === 0 ? (
              <p className="pd-goal-v2__owner-empty">No people found</p>
            ) : (
              filtered.map((person) => {
                const isSelected = person.id === selected?.id
                return (
                  <button
                    key={person.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`pd-goal-v2__owner-option${
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
                    <span className="pd-goal-v2__owner-option-copy">
                      <span>{person.name}</span>
                      {person.title ? <span>{person.title}</span> : null}
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
}: {
  value: MetricStrategy
  onChange: (next: MetricStrategy) => void
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
      className={`pd-goal-v2__strategy${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="pd-goal-v2__strategy-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Strategy: ${strategyLabel(value)}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>
          <StrategyIcon strategy={value} />
          {strategyLabel(value)}
        </span>
        <ChevronDown size={12} strokeWidth={2.25} aria-hidden />
      </button>
      {open ? (
        <div
          id={listId}
          className="pd-goal-v2__strategy-menu"
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
                className={`pd-goal-v2__strategy-option${
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

/**
 * One metric per card. The card header carries identity (type, name, weight)
 * and the body carries only the target maths, so scanning a long list of
 * measures stays a single vertical read.
 */
function MetricCard({
  metric,
  canRemove,
  onChange,
  onRemove,
  onConvertToTodo,
}: {
  metric: Metric
  canRemove: boolean
  onChange: (next: Metric) => void
  onRemove: () => void
  onConvertToTodo: () => void
}) {
  const strategy = normalizeMetricStrategy(metric.direction)
  const name = metric.title.trim() || 'this metric'
  const parseOptional = (raw: string): number | undefined => {
    if (raw.trim() === '') return undefined
    const next = Number(raw)
    return Number.isFinite(next) ? next : undefined
  }

  const isRange = metricUsesRange(strategy)
  const lowerValue = isRange ? (metric.rangeMin ?? '') : (metric.startValue ?? '')
  const upperValue = isRange ? (metric.rangeMax ?? '') : (metric.targetValue ?? '')
  const lowerLabel = metricLowerLabel(strategy)
  const upperLabel = metricUpperLabel(strategy)
  const rangeInvalid =
    strategy === 'between' &&
    metric.rangeMin != null &&
    metric.rangeMax != null &&
    metric.rangeMin > metric.rangeMax

  const menuItems: MenuItem[] = [
    {
      id: 'to-todo',
      label: 'Change to a To-Do List',
      icon: <ListTodo size={15} strokeWidth={1.75} aria-hidden />,
      onSelect: onConvertToTodo,
    },
  ]
  if (canRemove) {
    menuItems.push({
      id: 'remove',
      label: 'Remove Measure',
      icon: <Trash2 size={15} strokeWidth={1.75} aria-hidden />,
      danger: true,
      onSelect: onRemove,
    })
  }

  return (
    <section className="pd-goal-v2__measure" aria-label={`Metric: ${name}`}>
      <div className="pd-goal-v2__measure-head">
        <input
          type="text"
          className="pd-goal-v2__measure-name"
          value={metric.title}
          placeholder="Name this metric"
          aria-label="Metric name"
          onChange={(event) => onChange({ ...metric, title: event.target.value })}
        />
        <WeightInput
          value={metric.weight}
          label={`Weight for ${name}`}
          onChange={(weight) => onChange({ ...metric, weight })}
        />
        <CardMenu label={`Options for ${name}`} items={menuItems} />
      </div>

      <div className="pd-goal-v2__measure-body">
        <div className="pd-goal-v2__target">
          <label className="pd-goal-v2__target-cell">
            <span>{lowerLabel}</span>
            <input
              type="number"
              value={lowerValue}
              onChange={(event) => {
                const next = parseOptional(event.target.value)
                if (!isRange) {
                  onChange({ ...metric, startValue: next, currentValue: next })
                  return
                }
                if (strategy === 'keep_above') {
                  onChange({ ...metric, rangeMin: next, targetValue: next })
                  return
                }
                onChange({ ...metric, rangeMin: next })
              }}
            />
          </label>

          <div className="pd-goal-v2__target-cell pd-goal-v2__target-cell--strategy">
            <span>Goes</span>
            <StrategySelect
              value={strategy}
              onChange={(nextStrategy) =>
                onChange(applyMetricStrategy(metric, nextStrategy))
              }
            />
          </div>

          <label className="pd-goal-v2__target-cell">
            <span>{upperLabel}</span>
            <input
              type="number"
              value={upperValue}
              onChange={(event) => {
                const next = parseOptional(event.target.value)
                if (!isRange) {
                  onChange({ ...metric, targetValue: next })
                  return
                }
                if (strategy === 'keep_below') {
                  onChange({ ...metric, rangeMax: next, targetValue: next })
                  return
                }
                onChange({ ...metric, rangeMax: next })
              }}
            />
          </label>

          <div className="pd-goal-v2__target-cell pd-goal-v2__target-cell--unit">
            <span>Unit</span>
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
          </div>
        </div>

        {rangeInvalid ? (
          <p className="pd-goal-v2__error" role="alert">
            Lower limit must be less than or equal to upper limit.
          </p>
        ) : null}
      </div>
    </section>
  )
}

/** Spread a checklist total across its tasks, keeping relative shares when possible. */
function redistributeTodoWeights(
  todos: Milestone[],
  nextTotal: number,
): Milestone[] {
  const clamped = Math.max(0, Math.min(100, Math.round(nextTotal)))
  if (todos.length === 0) return todos
  if (todos.length === 1) {
    return [{ ...todos[0], weight: clamped }]
  }

  const currentTotal = todos.reduce((sum, todo) => sum + todo.weight, 0)
  if (currentTotal <= 0) {
    const each = Math.floor(clamped / todos.length)
    const remainder = clamped - each * todos.length
    return todos.map((todo, index) => ({
      ...todo,
      weight: each + (index === todos.length - 1 ? remainder : 0),
    }))
  }

  let assigned = 0
  return todos.map((todo, index) => {
    if (index === todos.length - 1) {
      return { ...todo, weight: Math.max(0, clamped - assigned) }
    }
    const share = Math.round((todo.weight / currentTotal) * clamped)
    assigned += share
    return { ...todo, weight: share }
  })
}

/** Every milestone lives in one card, so to-dos read as a single checklist. */
function TodoCard({
  todos,
  canRemove,
  onChangeTodo,
  onChangeTodos,
  onAddTodo,
  onRemoveTodo,
  onRemoveAll,
  onConvertToMetric,
}: {
  todos: Milestone[]
  canRemove: boolean
  onChangeTodo: (next: Milestone) => void
  onChangeTodos: (next: Milestone[]) => void
  onAddTodo: () => void
  onRemoveTodo: (id: string) => void
  onRemoveAll: () => void
  onConvertToMetric: () => void
}) {
  const total = todos.reduce((sum, todo) => sum + todo.weight, 0)
  const menuItems: MenuItem[] = [
    {
      id: 'to-metric',
      label: 'Change to a Number Metric',
      icon: <Hash size={15} strokeWidth={1.75} aria-hidden />,
      onSelect: onConvertToMetric,
    },
  ]
  if (canRemove) {
    menuItems.push({
      id: 'remove-all',
      label: 'Remove All To-Dos',
      icon: <Trash2 size={15} strokeWidth={1.75} aria-hidden />,
      danger: true,
      onSelect: onRemoveAll,
    })
  }

  return (
    <section className="pd-goal-v2__measure" aria-label="To-do list">
      <div className="pd-goal-v2__measure-head">
        <p className="pd-goal-v2__measure-name is-static">To Do&apos;s</p>
        <WeightInput
          value={total}
          label="Checklist weight"
          onChange={(weight) =>
            onChangeTodos(redistributeTodoWeights(todos, weight))
          }
        />
        <CardMenu label="Options for the to-do list" items={menuItems} />
      </div>

      <div className="pd-goal-v2__measure-body pd-goal-v2__measure-body--rows">
        <ul className="pd-goal-v2__todo-rows">
          {todos.map((todo) => (
            <li key={todo.id} className="pd-goal-v2__todo-row">
              <input
                type="checkbox"
                className="pd-goal-v2__todo-check"
                checked={todo.complete}
                aria-label={`Mark ${todo.title.trim() || 'to-do'} complete`}
                onChange={(event) =>
                  onChangeTodo({ ...todo, complete: event.target.checked })
                }
              />
              <input
                type="text"
                className="pd-goal-v2__todo-input"
                value={todo.title}
                placeholder="Describe this task"
                aria-label="Task"
                onChange={(event) =>
                  onChangeTodo({ ...todo, title: event.target.value })
                }
              />
              <WeightInput
                value={todo.weight}
                label={`Weight for ${todo.title.trim() || 'to-do'}`}
                onChange={(weight) => onChangeTodo({ ...todo, weight })}
              />
              {todos.length > 1 ? (
                <button
                  type="button"
                  className="pd-goal-v2__icon-btn pd-goal-v2__icon-btn--danger"
                  aria-label={`Remove task${todo.title ? ` ${todo.title}` : ''}`}
                  onClick={() => onRemoveTodo(todo.id)}
                >
                  <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                </button>
              ) : (
                <span className="pd-goal-v2__todo-spacer" aria-hidden />
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="pd-goal-v2__row-btn"
          onClick={onAddTodo}
        >
          <Plus size={15} strokeWidth={2} aria-hidden />
          Add Task
        </button>
      </div>
    </section>
  )
}

export function GoalUnifiedDetail({
  goal,
  index,
  total,
  isNew = false,
  owner,
  defaultOwnerId,
  ownerOptions,
  cascadeFrom = EMPTY_LINE_MANAGER_CASCADE,
  cascadedTo = [],
  cascadeHref,
  cycleLabel,
  isCurrentCycle = false,
  status,
  commentAuthorName,
  canEdit = false,
  canUpdateProgress = false,
  canRemove = false,
  canCascade = false,
  cascadeTargets = [],
  onSave,
  onProgressChange,
  onDuplicate,
  onCascade,
  onRemove,
  onSelectIndex,
  onBack,
  onDiscardNew,
}: GoalUnifiedDetailProps) {
  const [mode, setMode] = useState<'view' | 'edit'>(isNew ? 'edit' : 'view')
  const [draft, setDraft] = useState(goal)
  const [baseline, setBaseline] = useState(goal)
  const [comment, setComment] = useState('')
  const [statusOpen, setStatusOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [cascadeOpen, setCascadeOpen] = useState(false)
  const [pendingNav, setPendingNav] = useState<null | (() => void)>(null)
  const [showCascadeField, setShowCascadeField] = useState(
    Boolean(goal.linkedGoalLabel || goal.cascadedFromGoalId),
  )
  const statusRef = useRef<HTMLDivElement>(null)
  const editingRef = useRef(false)
  const commentFieldId = useId()
  const titleFieldId = useId()

  editingRef.current = mode === 'edit'

  const goalId = goal.id
  useEffect(() => {
    setDraft(goal)
    setBaseline(goal)
    setShowCascadeField(Boolean(goal.linkedGoalLabel || goal.cascadedFromGoalId))
    setMode(isNew ? 'edit' : 'view')
    // Reset only when the opened goal identity changes; content sync while
    // viewing is handled by the effect below so in-progress edits are kept.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goalId/isNew gate
  }, [goalId, isNew])

  useEffect(() => {
    if (editingRef.current) return
    setDraft(goal)
    setBaseline(goal)
    setShowCascadeField(Boolean(goal.linkedGoalLabel || goal.cascadedFromGoalId))
  }, [goal])

  useEffect(() => {
    if (!statusOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (
        statusRef.current &&
        !statusRef.current.contains(event.target as Node)
      ) {
        setStatusOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStatusOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [statusOpen])

  const isEditing = mode === 'edit'
  const activeGoal = isEditing ? draft : baseline
  const completion = Math.round(goalCompletion(activeGoal))
  const track = trackLabel(status, completion, activeGoal.progressStatus)
  const approval = approvalCopy(status)
  const title = goalTitle(activeGoal, index)
  const todos = activeGoal.measurements.filter(
    (item): item is Milestone => item.kind === 'milestone',
  )
  const metrics = activeGoal.measurements.filter(
    (item): item is Metric => item.kind === 'metric',
  )
  const comments = activeGoal.comments ?? []
  const canMutateProgress = canEdit || canUpdateProgress
  const dirty = isEditing && isGoalDraftDirty(baseline, draft)
  const validation = useMemo(() => validateGoalDraft(draft), [draft])
  const measureWeight = sumMeasurementWeights(draft.measurements)
  const ownerId = draft.ownerId ?? defaultOwnerId
  const cascadeFromSelected = Boolean(
    activeGoal.cascadedFromGoalId || activeGoal.linkedGoalLabel,
  )

  const requestNav = (action: () => void) => {
    if (isEditing && (dirty || isNew)) {
      setPendingNav(() => action)
      setDiscardOpen(true)
      return
    }
    action()
  }

  const cancelEdit = () => {
    setDraft(baseline)
    if (isNew) {
      onDiscardNew?.()
      onBack()
      return
    }
    setMode('view')
  }

  const patchDraft = (partial: Partial<Goal>) => {
    setDraft((prev) => touch(prev, partial))
  }

  const patchMeasurement = (id: string, next: Measurement) => {
    const apply = (source: Goal) =>
      touch(source, {
        measurements: source.measurements.map((item) =>
          item.id === id ? next : item,
        ),
      })
    if (isEditing) {
      setDraft((prev) => apply(prev))
      return
    }
    onProgressChange(apply(goal))
  }

  const setMeasurements = (next: Measurement[]) => {
    patchDraft({
      measurements: next.length === 0 ? [] : rebalanceMeasurementWeights(next),
    })
  }

  const setProgressStatus = (next: GoalProgressStatus) => {
    if (isEditing) patchDraft({ progressStatus: next })
    else onProgressChange(touch(goal, { progressStatus: next }))
    setStatusOpen(false)
  }

  const submitComment = () => {
    const text = comment.trim()
    if (!text) return
    onProgressChange(
      touch(goal, {
        comments: [
          ...comments,
          {
            id: newId('comment'),
            authorName: commentAuthorName,
            text,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    )
    setComment('')
  }

  const handleSave = () => {
    if (!validation.ok) return
    onSave(draft)
    setBaseline(draft)
    setMode('view')
  }

  const allocationTone =
    measureWeight === 100 ? 'ok' : measureWeight > 100 ? 'over' : 'under'

  return (
    <div
      className={`pd-goal-v2${isEditing ? ' is-editing' : ''}`}
      aria-label={title}
      data-mode={mode}
    >
      <header className="pd-goal-v2__header">
        <div className="pd-goal-v2__crumbs">
          <button
            type="button"
            className="pd-goal-v2__back"
            onClick={() => requestNav(onBack)}
          >
            <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
            Back
          </button>
          {total > 1 ? (
            <div className="pd-goal-v2__pager">
              <button
                type="button"
                className="pd-people__icon-btn"
                disabled={index <= 0}
                aria-label="Previous goal"
                onClick={() => requestNav(() => onSelectIndex(index - 1))}
              >
                <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
              </button>
              <span>
                {index + 1} / {total}
              </span>
              <button
                type="button"
                className="pd-people__icon-btn"
                disabled={index >= total - 1}
                aria-label="Next goal"
                onClick={() => requestNav(() => onSelectIndex(index + 1))}
              >
                <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          ) : null}
        </div>

        {isEditing ? (
          <div className="pd-goal-v2__title-row">
            <div className="pd-goal-v2__title-edit">
              <label
                className="pd-goal-v2__field-label"
                htmlFor={titleFieldId}
              >
                Goal title
              </label>
              <textarea
                id={titleFieldId}
                className="pd-goal-v2__title-input"
                value={draft.description}
                rows={1}
                placeholder="What should be achieved?"
                aria-invalid={Boolean(validation.nameError)}
                onChange={(event) =>
                  patchDraft({ description: event.target.value })
                }
              />
              {validation.nameError ? (
                <p className="pd-goal-v2__error" role="alert">
                  {validation.nameError}
                </p>
              ) : null}
            </div>
            <div className="pd-goal-v2__actions">
              <span
                className={`pd-goal-v2__dot${dirty ? ' is-dirty' : ''}`}
                title={dirty ? 'Unsaved changes' : 'Editing'}
                aria-hidden
              />
              <button
                type="button"
                className="pd-people__ghost-btn"
                onClick={() => {
                  if (dirty || isNew) {
                    setPendingNav(() => cancelEdit)
                    setDiscardOpen(true)
                    return
                  }
                  cancelEdit()
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pd-people__ghost-btn pd-people__ghost-btn--primary"
                disabled={!validation.ok}
                onClick={handleSave}
              >
                {isNew ? 'Add Goal' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <h1 className="pd-goal-v2__title">{title}</h1>
        )}
      </header>

      {isEditing ? null : (
        <div className="pd-goal-v2__actionbar">
          <div className="pd-goal-v2__actions">
            {canEdit ? (
              <button
                type="button"
                className="pd-people__ghost-btn"
                onClick={() => {
                  setDraft(baseline)
                  setMode('edit')
                }}
              >
                <Pencil size={15} strokeWidth={1.75} aria-hidden />
                Edit
              </button>
            ) : null}
            {onDuplicate ? (
              <button
                type="button"
                className="pd-people__ghost-btn"
                onClick={onDuplicate}
              >
                <Copy size={15} strokeWidth={1.75} aria-hidden />
                Duplicate
              </button>
            ) : null}
            {onCascade ? (
              <button
                type="button"
                className="pd-people__ghost-btn"
                disabled={!canCascade}
                title={
                  canCascade
                    ? 'Create a child goal for selected reports'
                    : 'No direct reports to cascade to'
                }
                onClick={() => setCascadeOpen(true)}
              >
                <GitFork size={15} strokeWidth={1.75} aria-hidden />
                Cascade This Goal
              </button>
            ) : null}
            {canRemove && onRemove ? (
              <CardMenu
                label="More actions"
                items={[
                  {
                    id: 'remove',
                    label: 'Remove Goal',
                    icon: <Trash2 size={15} strokeWidth={1.75} aria-hidden />,
                    danger: true,
                    onSelect: onRemove,
                  },
                ]}
              />
            ) : null}
          </div>
        </div>
      )}

      <div
        className="pd-people__summary pd-goal-v2__summary"
        role="group"
        aria-label="Goal summary"
      >
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Cycle</span>
          <span className="pd-people__summary-value pd-goal-v2__cycle">
            {cycleLabel}
            {isCurrentCycle ? <Badge variant="completed">Current</Badge> : null}
          </span>
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Status</span>
          {canUpdateProgress ? (
            <div ref={statusRef} className="pd-goal-v2__status">
              <button
                type="button"
                className={`pd-people__summary-value pd-goal-v2__status-btn ${trackToneClass(track.tone)}`}
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                onClick={() => setStatusOpen((open) => !open)}
              >
                {track.label}
                <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
              </button>
              {statusOpen ? (
                <div
                  className="pd-goal-v2__status-menu"
                  role="listbox"
                  aria-label="Status"
                >
                  {GOAL_PROGRESS_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={activeGoal.progressStatus === option.id}
                      className={`pd-goal-v2__status-option ${progressStatusClass(option.id)}`}
                      onClick={() => setProgressStatus(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <span
              className={`pd-people__summary-value pd-goal-v2__status-btn ${trackToneClass(track.tone)} is-static`}
            >
              {track.label}
            </span>
          )}
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Goal weight</span>
          {isEditing ? (
            <span className="pd-people__summary-value pd-goal-v2__summary-edit">
              <input
                type="number"
                min={0}
                max={100}
                value={draft.weight}
                aria-label="Goal weight percent"
                onChange={(event) =>
                  patchDraft({ weight: Number(event.target.value) || 0 })
                }
              />
              <span aria-hidden>%</span>
            </span>
          ) : (
            <span className="pd-people__summary-value">
              {activeGoal.weight}%
            </span>
          )}
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Completion</span>
          <span className="pd-people__summary-value">{completion}%</span>
        </div>
      </div>

      <div className="pd-goal-v2__body">
        <div className="pd-goal-v2__main">
          {isEditing ? (
            <section
              className="pd-goal-v2__section"
              aria-labelledby="goal-v2-measures"
            >
              <div className="pd-goal-v2__section-head">
                <div>
                  <h2 id="goal-v2-measures">How progress is measured</h2>
                  <p className="pd-goal-v2__section-sub">
                    Weights split this goal between its measures.
                  </p>
                </div>
                <div className="pd-goal-v2__alloc">
                  <span
                    className={`pd-goal-v2__alloc-value pd-goal-v2__alloc-value--${allocationTone}`}
                  >
                    {measureWeight}%
                    <span aria-hidden> / 100%</span>
                  </span>
                  <span
                    className={`pd-goal-v2__alloc-bar pd-goal-v2__alloc-bar--${allocationTone}`}
                    aria-hidden
                  >
                    <span style={{ width: `${Math.min(measureWeight, 100)}%` }} />
                  </span>
                  {draft.measurements.length > 1 ? (
                    <button
                      type="button"
                      className="pd-goal-v2__quiet-btn"
                      onClick={() =>
                        patchDraft({
                          measurements: rebalanceMeasurementWeights(
                            draft.measurements,
                          ),
                        })
                      }
                    >
                      Split Evenly
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="pd-goal-v2__measures">
                {metrics.map((metric) => (
                  <MetricCard
                    key={metric.id}
                    metric={metric}
                    canRemove={draft.measurements.length > 1}
                    onChange={(next) => patchMeasurement(metric.id, next)}
                    onRemove={() =>
                      setMeasurements(
                        draft.measurements.filter(
                          (item) => item.id !== metric.id,
                        ),
                      )
                    }
                    onConvertToTodo={() =>
                      setMeasurements([
                        ...draft.measurements.filter(
                          (item) => item.id !== metric.id,
                        ),
                        { ...blankMilestone(), title: metric.title },
                      ])
                    }
                  />
                ))}

                {todos.length > 0 ? (
                  <TodoCard
                    todos={todos}
                    canRemove={todos.length < draft.measurements.length}
                    onChangeTodo={(next) => patchMeasurement(next.id, next)}
                    onChangeTodos={(nextTodos) => {
                      const byId = new Map(
                        nextTodos.map((todo) => [todo.id, todo]),
                      )
                      patchDraft({
                        measurements: draft.measurements.map((item) =>
                          item.kind === 'milestone'
                            ? (byId.get(item.id) ?? item)
                            : item,
                        ),
                      })
                    }}
                    onAddTodo={() =>
                      setMeasurements([...draft.measurements, blankMilestone()])
                    }
                    onRemoveTodo={(id) =>
                      setMeasurements(
                        draft.measurements.filter((item) => item.id !== id),
                      )
                    }
                    onRemoveAll={() =>
                      setMeasurements(
                        draft.measurements.filter(
                          (item) => item.kind === 'metric',
                        ),
                      )
                    }
                    onConvertToMetric={() =>
                      setMeasurements([
                        ...draft.measurements.filter(
                          (item) => item.kind === 'metric',
                        ),
                        blankMetric('increase'),
                      ])
                    }
                  />
                ) : null}
              </div>

              <div className="pd-goal-v2__addrow">
                <button
                  type="button"
                  className="pd-people__ghost-btn"
                  onClick={() =>
                    setMeasurements([
                      ...draft.measurements,
                      blankMetric('increase'),
                    ])
                  }
                >
                  <Hash size={15} strokeWidth={1.75} aria-hidden />
                  Add a Number
                </button>
                {todos.length === 0 ? (
                  <button
                    type="button"
                    className="pd-people__ghost-btn"
                    onClick={() =>
                      setMeasurements([...draft.measurements, blankMilestone()])
                    }
                  >
                    <ListTodo size={15} strokeWidth={1.75} aria-hidden />
                    Add a To-Do
                  </button>
                ) : null}
              </div>

              {validation.measurementWeightError ? (
                <p className="pd-goal-v2__error" role="alert">
                  {validation.measurementWeightError}
                </p>
              ) : null}
            </section>
          ) : (
            <>
              {todos.length > 0 || metrics.length === 0 ? (
                <section className="pd-goal-v2__card" aria-label="To dos">
                  <div className="pd-goal-v2__card-head">
                    <h2>To Do&apos;s</h2>
                  </div>
                  {todos.length === 0 ? (
                    <p className="pd-goal-v2__empty">
                      No to-dos on this goal yet.
                    </p>
                  ) : (
                    <ul className="pd-goal-v2__todos">
                      {todos.map((todo) => (
                        <li key={todo.id} className="pd-goal-v2__todo">
                          <input
                            type="checkbox"
                            className="pd-goal-v2__todo-check"
                            checked={todo.complete}
                            disabled={!canMutateProgress}
                            aria-label={`Mark ${
                              todo.title.trim() || 'to-do'
                            } complete`}
                            onChange={(event) =>
                              patchMeasurement(todo.id, {
                                ...todo,
                                complete: event.target.checked,
                              })
                            }
                          />
                          <p
                            className={`pd-goal-v2__todo-title${
                              todo.complete ? ' is-done' : ''
                            }`}
                          >
                            {todo.title || 'Untitled to-do'}
                          </p>
                          <span className="pd-goal-v2__todo-weight">
                            {todo.weight}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}

              {metrics.map((metric) => (
                <section
                  key={metric.id}
                  className="pd-goal-v2__card"
                  aria-label={metric.title || 'Metric'}
                >
                  <div className="pd-goal-v2__card-head">
                    <h2>{metric.title.trim() || 'Metric'}</h2>
                    <div className="pd-goal-v2__card-value">
                      {canUpdateProgress ? (
                        <label className="pd-goal-v2__metric-field">
                          <span className="pd-sr-only">Current value</span>
                          <input
                            type="number"
                            value={metric.currentValue ?? ''}
                            aria-label={`Current value for ${
                              metric.title.trim() || 'metric'
                            }`}
                            onChange={(event) =>
                              patchMeasurement(metric.id, {
                                ...metric,
                                currentValue:
                                  event.target.value.trim() === ''
                                    ? undefined
                                    : Number(event.target.value) || 0,
                              })
                            }
                          />
                        </label>
                      ) : (
                        <span className="pd-goal-v2__card-current">
                          {metric.currentValue ?? '—'}
                          {unitSuffix(metric.unit)}
                        </span>
                      )}
                      <span className="pd-goal-v2__card-meta">
                        → {metric.targetValue ?? '—'}
                        {unitSuffix(metric.unit)}
                      </span>
                      <span className="pd-goal-v2__card-weight">
                        {metric.weight}%
                      </span>
                    </div>
                  </div>
                </section>
              ))}

              <section className="pd-goal-v2__comments" aria-label="Comments">
                <h2>Comments</h2>
                {comments.length > 0 ? (
                  <ul className="pd-goal-v2__comment-list">
                    {comments.map((item) => (
                      <li key={item.id} className="pd-goal-v2__comment">
                        <Avatar
                          name={item.authorName}
                          size="sm"
                          style={avatarStyle(item.authorName)}
                        />
                        <div>
                          <p className="pd-goal-v2__comment-meta">
                            <strong>{item.authorName}</strong>
                            <span>{formatRefreshAge(item.createdAt)}</span>
                          </p>
                          <p className="pd-goal-v2__comment-text">{item.text}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <label className="pd-goal-v2__composer" htmlFor={commentFieldId}>
                  <span className="pd-sr-only">Add comment</span>
                  <input
                    id={commentFieldId}
                    type="text"
                    value={comment}
                    placeholder="Add comment"
                    disabled={!canMutateProgress}
                    onChange={(event) => setComment(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        submitComment()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="pd-goal-v2__send"
                    aria-label="Send comment"
                    disabled={!canMutateProgress || !comment.trim()}
                    onClick={submitComment}
                  >
                    <Send size={16} strokeWidth={1.75} aria-hidden />
                  </button>
                </label>
              </section>
            </>
          )}
        </div>

        <aside className="pd-goal-v2__aside" aria-label="Goal details">
          {isEditing ? (
            <section
              className="pd-goal-v2__section"
              aria-labelledby="goal-v2-details"
            >
              <div className="pd-goal-v2__section-head">
                <h2 id="goal-v2-details">Details</h2>
              </div>

              <div className="pd-goal-v2__fields">
                <div className="pd-goal-v2__field">
                  <span className="pd-goal-v2__field-label">Owner</span>
                  <OwnerSelect
                    ownerId={ownerId}
                    options={ownerOptions}
                    onChange={(nextOwnerId) =>
                      patchDraft({ ownerId: nextOwnerId })
                    }
                  />
                </div>

                <label className="pd-goal-v2__field">
                  <span className="pd-goal-v2__field-label">Description</span>
                  <textarea
                    className="pd-goal-v2__description-input"
                    value={draft.details ?? ''}
                    rows={4}
                    placeholder="Why this matters and what success looks like"
                    onChange={(event) =>
                      patchDraft({ details: event.target.value || undefined })
                    }
                  />
                </label>

                {showCascadeField ||
                draft.linkedGoalLabel ||
                draft.cascadedFromGoalId ? (
                  <div className="pd-goal-v2__field">
                    <GoalCascadeField
                      goal={draft}
                      cascadeFrom={cascadeFrom}
                      onChange={(next) => patchDraft(next)}
                    />
                  </div>
                ) : cascadeFrom.managerName ? (
                  <button
                    type="button"
                    className="pd-goal-v2__quiet-btn"
                    onClick={() => setShowCascadeField(true)}
                  >
                    <GitFork size={15} strokeWidth={2} aria-hidden />
                    Add cascading from
                  </button>
                ) : null}
                <GoalCascadedTo recipients={cascadedTo} hrefFor={cascadeHref} />
              </div>
            </section>
          ) : (
            <>
              <div
                className={`pd-goal-v2__approval pd-goal-v2__approval--${approval.tone}`}
              >
                <span className="pd-goal-v2__approval-icon" aria-hidden>
                  <Check size={16} strokeWidth={2.5} />
                </span>
                <div>
                  <p className="pd-goal-v2__approval-title">{approval.title}</p>
                  <p className="pd-goal-v2__approval-sub">{approval.sub}</p>
                </div>
              </div>

              <div className="pd-goal-v2__facts">
                <div className="pd-goal-v2__fact">
                  <p className="pd-goal-v2__fact-label">Owner</p>
                  <div className="pd-goal-v2__owner-static">
                    <Avatar
                      name={owner.name}
                      src={owner.avatarUrl}
                      size="sm"
                      style={avatarStyle(owner.name)}
                    />
                    <p>{owner.name}</p>
                  </div>
                </div>

                {activeGoal.details?.trim() ? (
                  <div className="pd-goal-v2__fact">
                    <p className="pd-goal-v2__fact-label">Description</p>
                    <p className="pd-goal-v2__description">
                      {activeGoal.details}
                    </p>
                  </div>
                ) : null}

                {cascadeFromSelected ? (
                  <div className="pd-goal-v2__fact">
                    <CascadeLabel as="p" className="pd-goal-v2__fact-label">
                      Cascading from
                    </CascadeLabel>
                    <GoalCascadeFromReadout
                      goal={activeGoal}
                      cascadeFrom={cascadeFrom}
                      hrefFor={cascadeHref}
                    />
                  </div>
                ) : null}

                {cascadedTo.length > 0 ? (
                  <div className="pd-goal-v2__fact">
                    <GoalCascadedTo
                      recipients={cascadedTo}
                      hrefFor={cascadeHref}
                    />
                  </div>
                ) : null}
              </div>
            </>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onClose={() => {
          setDiscardOpen(false)
          setPendingNav(null)
        }}
        onConfirm={() => {
          const action = pendingNav
          setDiscardOpen(false)
          setPendingNav(null)
          setDraft(baseline)
          setMode(isNew ? 'edit' : 'view')
          if (isNew) onDiscardNew?.()
          action?.()
        }}
        title="Discard changes?"
        description="You have unsaved edits on this goal. Discard them and leave edit mode?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmVariant="danger"
      />
      {onCascade ? (
        <GoalCascadeTargetDialog
          open={cascadeOpen}
          targets={cascadeTargets}
          onClose={() => setCascadeOpen(false)}
          onConfirm={onCascade}
        />
      ) : null}
    </div>
  )
}
