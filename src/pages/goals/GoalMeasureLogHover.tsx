import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { History } from 'lucide-react'
import { CountBadge } from '@/components/ui'
import { cx } from '@/lib/cx'
import {
  numberedTaskListTitle,
  uniqueMilestonesById,
  type TodoListPanel,
} from '@/lib/goals/measurements'
import type { Metric, Milestone, ProgressLogEntry } from '@/lib/goals/types'
import {
  GoalProgressLog,
  ProgressLogHeading,
  progressLogCountLabel,
} from '@/pages/goals/GoalProgressLog'
import { GoalTodoCheck } from '@/pages/goals/GoalTodoCheck'
import { MetricProgressUpdate } from '@/pages/goals/MetricProgressUpdate'
import {
  logPopoverCoords,
  visibleLogPopoverBounds,
} from '@/pages/goals/logPopoverPosition'

const CLOSE_DELAY_MS = 180

function keepRowClickFromOpening(event: { stopPropagation(): void }) {
  event.stopPropagation()
}

function ChecklistUpdate({
  lists,
  canToggle,
  onToggle,
}: {
  lists: TodoListPanel[]
  canToggle: boolean
  onToggle?: (todoId: string, complete: boolean) => void
}) {
  const showListChrome = lists.length > 1

  if (lists.length === 0) {
    return (
      <p className="pd-goals-table__log-checklist-empty">No tasks yet</p>
    )
  }

  return (
    <div className="pd-goals-table__log-checklist">
      {lists.map((list, index) => {
        const todos = uniqueMilestonesById(list.todos)
        return (
          <div
            key={list.listKey}
            className="pd-goals-table__log-checklist-group"
          >
            {showListChrome ? (
              <p className="pd-goals-table__log-checklist-list">
                {list.listTitle.trim() || numberedTaskListTitle(index + 1)}
              </p>
            ) : null}
            {todos.length === 0 ? (
              <p className="pd-goals-table__log-checklist-empty">No tasks yet</p>
            ) : (
              todos.map((todo) => (
                <ChecklistItem
                  key={todo.id}
                  todo={todo}
                  canToggle={canToggle}
                  onToggle={onToggle}
                />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChecklistItem({
  todo,
  canToggle,
  onToggle,
}: {
  todo: Milestone
  canToggle: boolean
  onToggle?: (todoId: string, complete: boolean) => void
}) {
  const name = todo.title.trim() || 'Untitled task'
  return (
    <div
      className={
        todo.complete
          ? 'pd-goals-table__log-checklist-item is-done'
          : 'pd-goals-table__log-checklist-item'
      }
    >
      <GoalTodoCheck
        checked={todo.complete}
        disabled={!canToggle}
        ariaLabel={`Mark ${name} ${todo.complete ? 'incomplete' : 'complete'}`}
        onChange={(complete) => onToggle?.(todo.id, complete)}
      />
      <span className="pd-goals-table__log-checklist-title">{name}</span>
    </div>
  )
}

export function GoalMeasureLogHover({
  measureName,
  entries,
  metric,
  lists,
  canLog = false,
  onRecord,
  onToggleTodo,
}: {
  measureName: string
  entries: ProgressLogEntry[]
  metric?: Metric
  lists?: TodoListPanel[]
  canLog?: boolean
  onRecord?: (nextValue: number | undefined) => void
  onToggleTodo?: (todoId: string, complete: boolean) => void
}) {
  const isChecklist = Boolean(lists)
  const canAddMetric = Boolean(canLog && metric && onRecord)
  const canToggle = Boolean(canLog && lists && onToggleTodo)
  const headingId = useId()
  const [open, setOpen] = useState(false)
  const [focusField, setFocusField] = useState(false)
  const [coords, setCoords] = useState<CSSProperties>()
  const hideTimer = useRef<number>(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const todos = lists ? lists.flatMap((list) => uniqueMilestonesById(list.todos)) : []
  const doneCount = todos.filter((todo) => todo.complete).length

  useLayoutEffect(() => {
    if (!open) {
      setCoords(undefined)
      return
    }

    const update = () => {
      const trigger = rootRef.current
      if (!trigger) return
      const pop = popRef.current
      setCoords(
        logPopoverCoords(
          trigger.getBoundingClientRect(),
          pop
            ? {
                width: pop.offsetWidth,
                height: Math.max(pop.offsetHeight, pop.scrollHeight),
              }
            : undefined,
          visibleLogPopoverBounds(),
        ),
      )
    }

    update()
    const frame = window.requestAnimationFrame(update)
    const observer =
      popRef.current && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(update)
        : null
    if (popRef.current && observer) observer.observe(popRef.current)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, isChecklist, entries.length, todos.length, doneCount])

  const show = (focus = false) => {
    window.clearTimeout(hideTimer.current)
    setOpen(true)
    if (focus) setFocusField(true)
  }

  const hide = () => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      setOpen(false)
      setFocusField(false)
    }, CLOSE_DELAY_MS)
  }

  const isInsideHover = (node: Node | null) =>
    Boolean(node && (rootRef.current?.contains(node) || popRef.current?.contains(node)))

  const logLabel = isChecklist
    ? `Update checklist for ${measureName}`
    : `Progress for ${measureName}`
  const triggerLabel =
    entries.length === 0
      ? logLabel
      : `${logLabel}, ${progressLogCountLabel(entries.length)}`

  const popover = open ? (
    <div
      ref={popRef}
      className={cx(
        'pd-goals-table__log-pop',
        isChecklist && 'pd-goals-table__log-pop--checklist',
        'pd-goals-table__log-pop--portal',
      )}
      style={{ ...coords, visibility: coords ? 'visible' : 'hidden' }}
      role="dialog"
      aria-labelledby={headingId}
      onMouseEnter={() => show()}
      onMouseLeave={hide}
      onFocusCapture={() => show()}
      onBlurCapture={(event) => {
        if (!isInsideHover(event.relatedTarget as Node)) hide()
      }}
      onClick={keepRowClickFromOpening}
      onKeyDown={keepRowClickFromOpening}
    >
      {canAddMetric && metric && onRecord ? (
        <MetricProgressUpdate
          metric={metric}
          goalTitle={measureName}
          compact
          autoFocus={focusField}
          onCommit={onRecord}
        />
      ) : null}
      {lists ? (
        <ChecklistUpdate
          lists={lists}
          canToggle={canToggle}
          onToggle={onToggleTodo}
        />
      ) : null}
      <ProgressLogHeading count={entries.length} headingId={headingId} />
      {entries.length > 0 ? (
        <GoalProgressLog
          variant="list"
          kind={isChecklist ? 'milestone' : 'metric'}
          entries={entries}
          label={`Progress history for ${measureName}`}
        />
      ) : null}
    </div>
  ) : null

  return (
    <div
      ref={rootRef}
      className="pd-goals-table__log-hover"
      onMouseEnter={() => show()}
      onMouseLeave={hide}
      onFocusCapture={() => show()}
      onBlurCapture={(event) => {
        if (!isInsideHover(event.relatedTarget as Node)) hide()
      }}
      onClick={keepRowClickFromOpening}
      onKeyDown={keepRowClickFromOpening}
    >
      <button
        type="button"
        className="pd-goals-table__log-add"
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => show(canAddMetric)}
      >
        <History size={11} strokeWidth={2} aria-hidden />
        Progress
        <CountBadge
          count={entries.length}
          tone="muted"
          className="pd-goals-table__log-add-count"
        />
      </button>
      {popover && typeof document !== 'undefined'
        ? createPortal(popover, document.body)
        : null}
    </div>
  )
}
