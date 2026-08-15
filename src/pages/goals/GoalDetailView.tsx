import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  GitFork,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react'
import { Avatar, Badge, Checkbox } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { goalCompletion, newId } from '@/lib/goalsApi'
import type {
  Goal,
  GoalProgressStatus,
  Measurement,
  PersonGoals,
} from '@/lib/goals/types'
import {
  formatRefreshAge,
  goalTitle,
  GOAL_PROGRESS_STATUS_OPTIONS,
  progressStatusClass,
  trackLabel,
  trackToneClass,
} from './goalHelpers'
import { statusLabel } from './statusLabels'

export type GoalOwner = {
  id?: string
  name: string
  avatarUrl?: string
}

type GoalDetailViewProps = {
  goal: Goal
  index: number
  total: number
  owner: GoalOwner
  cycleLabel: string
  isCurrentCycle?: boolean
  status: PersonGoals['status']
  commentAuthorName: string
  canEdit?: boolean
  canUpdateProgress?: boolean
  canRemove?: boolean
  canCascade?: boolean
  approvalActions?: ReactNode
  /** Expanded panel under the approval actions, e.g. a send back reason. */
  approvalReason?: ReactNode
  onChange: (goal: Goal) => void
  onEdit?: () => void
  onDuplicate?: () => void
  onCascade?: () => void
  onRemove?: () => void
  onSelectIndex: (index: number) => void
}

function approvalCopy(status: PersonGoals['status']): {
  title: string
  sub: string
  tone: 'ok' | 'pending' | 'draft'
} {
  if (status === 'approved') {
    return { title: 'Approved', sub: 'Manager signed off', tone: 'ok' }
  }
  if (status === 'submitted') {
    return { title: 'Pending approval', sub: 'Waiting on manager', tone: 'pending' }
  }
  if (status === 'sent_back') {
    return { title: 'Sent back', sub: 'Needs changes', tone: 'pending' }
  }
  return { title: statusLabel(status), sub: 'Not submitted yet', tone: 'draft' }
}

function touch(goal: Goal, partial: Partial<Goal>): Goal {
  return { ...goal, ...partial, updatedAt: new Date().toISOString() }
}

export function GoalDetailView({
  goal,
  index,
  total,
  owner,
  cycleLabel,
  isCurrentCycle = false,
  status,
  commentAuthorName,
  canEdit = false,
  canUpdateProgress = false,
  canRemove = false,
  canCascade = false,
  approvalActions,
  approvalReason,
  onChange,
  onEdit,
  onDuplicate,
  onCascade,
  onRemove,
  onSelectIndex,
}: GoalDetailViewProps) {
  const [comment, setComment] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const commentFieldId = useId()

  useEffect(() => {
    if (!menuOpen && !statusOpen) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false)
      if (statusRef.current && !statusRef.current.contains(target)) {
        setStatusOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, statusOpen])

  const completion = Math.round(goalCompletion(goal))
  const track = trackLabel(status, completion, goal.progressStatus)
  const approval = approvalCopy(status)
  const title = goalTitle(goal, index)
  const todos = goal.measurements.filter((item) => item.kind === 'milestone')
  const metrics = goal.measurements.filter((item) => item.kind === 'metric')
  const comments = goal.comments ?? []
  const canMutate = canEdit || canUpdateProgress

  const patchMeasurement = (id: string, next: Measurement) => {
    onChange(
      touch(goal, {
        measurements: goal.measurements.map((item) =>
          item.id === id ? next : item,
        ),
      }),
    )
  }

  const setProgressStatus = (next: GoalProgressStatus) => {
    onChange(touch(goal, { progressStatus: next }))
    setStatusOpen(false)
  }

  const submitComment = () => {
    const text = comment.trim()
    if (!text) return
    onChange(
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

  const hasOverflowMenu = Boolean(
    (canEdit && onEdit) ||
      onDuplicate ||
      onCascade ||
      (canRemove && onRemove),
  )

  return (
    <div className="pd-goal-view" aria-label={title}>
      <header className="pd-goal-view__header">
        <div className="pd-goal-view__chrome">
          <h1 className="pd-goal-view__title">{title}</h1>

          {total > 1 ? (
            <div className="pd-goal-view__pager">
              <button
                type="button"
                className="pd-people__icon-btn"
                disabled={index <= 0}
                aria-label="Previous goal"
                onClick={() => onSelectIndex(index - 1)}
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
                onClick={() => onSelectIndex(index + 1)}
              >
                <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          ) : null}

          {hasOverflowMenu ? (
            <div className="pd-goal-view__actions">
              <div ref={menuRef} className="pd-goal-view__menu">
                <button
                  type="button"
                  className="pd-people__icon-btn"
                  aria-label="More actions"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
                </button>
                {menuOpen ? (
                  <div className="pd-goal-view__menu-panel" role="menu">
                    {canEdit && onEdit ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="pd-goal-view__menu-item"
                        onClick={() => {
                          setMenuOpen(false)
                          onEdit()
                        }}
                      >
                        <Pencil size={15} strokeWidth={1.75} aria-hidden />
                        Edit
                      </button>
                    ) : null}
                    {onDuplicate ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="pd-goal-view__menu-item"
                        onClick={() => {
                          setMenuOpen(false)
                          onDuplicate()
                        }}
                      >
                        <Copy size={15} strokeWidth={1.75} aria-hidden />
                        Duplicate
                      </button>
                    ) : null}
                    {onCascade ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="pd-goal-view__menu-item"
                        disabled={!canCascade}
                        title={
                          canCascade
                            ? 'Copy this goal to your direct reports'
                            : 'No direct reports to cascade to'
                        }
                        onClick={() => {
                          if (!canCascade) return
                          setMenuOpen(false)
                          onCascade()
                        }}
                      >
                        <GitFork size={15} strokeWidth={1.75} aria-hidden />
                        Cascade This Goal
                      </button>
                    ) : null}
                    {canRemove && onRemove ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="pd-goal-view__menu-item pd-goal-view__menu-item--danger"
                        onClick={() => {
                          setMenuOpen(false)
                          onRemove()
                        }}
                      >
                        <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                        Remove Goal
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="pd-goal-view__byline">
          {owner.id ? (
            <Link
              to={`/people/${owner.id}`}
              className="pd-goal-view__owner pd-goal-view__owner--link"
              aria-label={`Open ${owner.name}'s profile`}
            >
              <Avatar
                name={owner.name}
                src={owner.avatarUrl}
                size="sm"
                style={avatarStyle(owner.name)}
              />
              <p>{owner.name}</p>
            </Link>
          ) : (
            <div
              className="pd-goal-view__owner"
              aria-label={`Owner ${owner.name}`}
            >
              <Avatar
                name={owner.name}
                src={owner.avatarUrl}
                size="sm"
                style={avatarStyle(owner.name)}
              />
              <p>{owner.name}</p>
            </div>
          )}
          <div className="pd-goal-view__meta">
            <p>Last refresh {formatRefreshAge(goal.updatedAt)}</p>
            <p>Late update 15 days</p>
          </div>
        </div>

        {goal.details?.trim() ? (
          <section
            className="pd-goal-view__description-card"
            aria-label="Description"
          >
            <p className="pd-goal-view__description-label">Description</p>
            <p className="pd-goal-view__description">{goal.details}</p>
          </section>
        ) : null}
      </header>

      <div className={`pd-goal-view__approval pd-goal-view__approval--${approval.tone}`}>
        <span className="pd-goal-view__approval-icon" aria-hidden>
          <Check size={16} strokeWidth={2.5} />
        </span>
        <div className="pd-goal-view__approval-copy">
          <p className="pd-goal-view__approval-title">{approval.title}</p>
          <p className="pd-goal-view__approval-sub">{approval.sub}</p>
        </div>
        {approvalActions ? (
          <div className="pd-goal-view__approval-actions">
            {approvalActions}
          </div>
        ) : null}
        {approvalReason ? (
          <div className="pd-goal-view__approval-reason">{approvalReason}</div>
        ) : null}
      </div>

      <div
        className="pd-people__summary pd-goal-view__summary"
        role="group"
        aria-label="Goal summary"
      >
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Cycle</span>
          <span className="pd-people__summary-value pd-goal-view__cycle">
            {cycleLabel}
            {isCurrentCycle ? (
              <Badge variant="completed">Current</Badge>
            ) : null}
          </span>
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Status</span>
          {canUpdateProgress ? (
            <div ref={statusRef} className="pd-goal-view__status">
              <button
                type="button"
                className={`pd-people__summary-value pd-goal-view__status-btn ${trackToneClass(track.tone)}`}
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                onClick={() => setStatusOpen((open) => !open)}
              >
                {track.label}
                <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
              </button>
              {statusOpen ? (
                <div className="pd-goal-view__status-menu" role="listbox" aria-label="Status">
                  {GOAL_PROGRESS_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={goal.progressStatus === option.id}
                      className={`pd-goal-view__status-option ${progressStatusClass(option.id)}`}
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
              className={`pd-people__summary-value pd-goal-view__status-btn ${trackToneClass(track.tone)} is-static`}
            >
              {track.label}
            </span>
          )}
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Goal weight</span>
          <span className="pd-people__summary-value">{goal.weight}%</span>
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Completion</span>
          <span className="pd-people__summary-value">{completion}%</span>
        </div>
      </div>

      <div className="pd-goal-view__body">
        <div className="pd-goal-view__main">
          {todos.length > 0 || metrics.length === 0 ? (
            <section className="pd-goal-view__card" aria-label="To dos">
              <div className="pd-goal-view__card-head">
                <h2>To Do&apos;s</h2>
              </div>
              {todos.length === 0 ? (
                <p className="pd-goal-view__empty">
                  No to-dos on this goal yet.
                </p>
              ) : (
                <ul className="pd-goal-view__todos">
                  {todos.map((todo) => (
                    <li key={todo.id} className="pd-goal-view__todo">
                      <Checkbox
                        className="pd-goal-todo__check"
                        label={todo.title || 'Mark done'}
                        checked={todo.complete}
                        disabled={!canMutate}
                        onChange={(event) =>
                          patchMeasurement(todo.id, {
                            ...todo,
                            complete: event.target.checked,
                          })
                        }
                      />
                      <p
                        className={`pd-goal-view__todo-title${
                          todo.complete ? ' is-done' : ''
                        }`}
                      >
                        {todo.title || 'Untitled to-do'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {metrics.map((metric) => (
            <section
              key={metric.id}
              className="pd-goal-view__card"
              aria-label={metric.title || 'Metric'}
            >
              <div className="pd-goal-view__card-head">
                <h2>{metric.title.trim() || 'Metric'}</h2>
                <div className="pd-goal-view__card-value">
                  {canUpdateProgress ? (
                    <label className="pd-goal-view__metric-field">
                      <span className="pd-sr-only">Current value</span>
                      <input
                        type="number"
                        value={metric.currentValue ?? ''}
                        aria-label={`Current value for ${metric.title.trim() || 'metric'}`}
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
                    <span className="pd-goal-view__card-current">
                      {metric.currentValue ?? '—'}
                      {metric.unit === '%' ? '%' : ''}
                    </span>
                  )}
                  <span className="pd-goal-view__card-meta">
                    → {metric.targetValue ?? '—'}
                    {metric.unit === '%' ? '%' : ''}
                  </span>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      <section className="pd-goal-view__comments" aria-label="Comments">
        <h2>Comments</h2>
        {comments.length > 0 ? (
          <ul className="pd-goal-view__comment-list">
            {comments.map((item) => (
              <li key={item.id} className="pd-goal-view__comment">
                <Avatar
                  name={item.authorName}
                  size="sm"
                  style={avatarStyle(item.authorName)}
                />
                <div>
                  <p className="pd-goal-view__comment-meta">
                    <strong>{item.authorName}</strong>
                    <span>{formatRefreshAge(item.createdAt)}</span>
                  </p>
                  <p className="pd-goal-view__comment-text">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="pd-goal-view__composer" htmlFor={commentFieldId}>
          <span className="pd-sr-only">Add comment</span>
          <input
            id={commentFieldId}
            type="text"
            value={comment}
            placeholder="Add comment"
            disabled={!canMutate}
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
            className="pd-goal-view__send"
            aria-label="Send comment"
            disabled={!canMutate || !comment.trim()}
            onClick={submitComment}
          >
            <Send size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </label>
      </section>
    </div>
  )
}
