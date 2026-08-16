import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Send,
} from 'lucide-react'
import { Avatar, Checkbox, Textarea } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { newId } from '@/lib/goalsApi'
import type {
  Goal,
  Measurement,
  PersonGoals,
} from '@/lib/goals/types'
import {
  formatRefreshAge,
  goalTitle,
} from './goalHelpers'
import { GoalSummaryCards } from './GoalSummaryCards'
import { statusLabel } from './statusLabels'
import {
  EMPTY_LINE_MANAGER_CASCADE,
  CascadeLabel,
  GoalCascadeFromReadout,
  GoalCascadedTo,
  type CascadeGoalHref,
} from './GoalCascadeField'
import { GoalActionsMenu, hasGoalActions } from './GoalActionsMenu'
import type { CascadeTarget } from './GoalCascadeTargetDialog'
import { GoalProgressEditor } from './GoalProgressEditor'
import type {
  CascadeRecipient,
  LineManagerCascade,
} from '@/lib/goals/operations'

export type GoalOwner = {
  id?: string
  name: string
  avatarUrl?: string
}

type CommentAuthor = {
  id: string
  name: string
  avatarUrl?: string
}

function commentAuthor(
  comment: { authorId?: string; authorName: string },
  authors: CommentAuthor[],
): CommentAuthor | undefined {
  return (
    authors.find((person) => person.id === comment.authorId) ??
    authors.find((person) => person.name === comment.authorName)
  )
}

type GoalDetailViewProps = {
  goal: Goal
  index: number
  total: number
  owner: GoalOwner
  cascadeFrom?: LineManagerCascade
  cascadedTo?: CascadeRecipient[]
  cascadeHref?: CascadeGoalHref
  cycleLabel: string
  isCurrentCycle?: boolean
  status: PersonGoals['status']
  commentAuthorName: string
  commentAuthorId?: string
  commentAuthors?: CommentAuthor[]
  canEdit?: boolean
  canUpdateProgress?: boolean
  canRemove?: boolean
  canCascade?: boolean
  cascadeTargets?: CascadeTarget[]
  onChange: (goal: Goal) => void
  /** Structural edits (title, description, measurements) persist as a full save. */
  onSave?: (goal: Goal) => void
  onDuplicate?: () => void
  onCascade?: (reportIds: string[]) => void
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

type EditableSection = 'title' | 'description' | 'progress'

function SectionEditButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="pd-goal-view__section-edit"
      aria-label={label}
      onClick={onClick}
    >
      <Pencil size={14} strokeWidth={1.75} aria-hidden />
    </button>
  )
}

export function GoalDetailView({
  goal,
  index,
  total,
  owner,
  cascadeFrom = EMPTY_LINE_MANAGER_CASCADE,
  cascadedTo = [],
  cascadeHref,
  cycleLabel,
  isCurrentCycle = false,
  status,
  commentAuthorName,
  commentAuthorId,
  commentAuthors = [],
  canEdit = false,
  canUpdateProgress = false,
  canRemove = false,
  canCascade = false,
  cascadeTargets = [],
  onChange,
  onSave,
  onDuplicate,
  onCascade,
  onRemove,
  onSelectIndex,
}: GoalDetailViewProps) {
  const [comment, setComment] = useState('')
  const [editingSection, setEditingSection] = useState<EditableSection | null>(
    null,
  )
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const commentFieldId = useId()
  const titleFieldId = useId()

  useEffect(() => {
    setEditingSection(null)
  }, [goal.id])

  useEffect(() => {
    if (editingSection === 'title') titleRef.current?.focus()
  }, [editingSection])

  const approval = approvalCopy(status)
  const title = goalTitle(goal, index)
  const todos = goal.measurements.filter((item) => item.kind === 'milestone')
  const metrics = goal.measurements.filter((item) => item.kind === 'metric')
  const comments = goal.comments ?? []
  const canMutate = canEdit || canUpdateProgress
  const cascadeFromSelected = Boolean(
    goal.cascadedFromGoalId || goal.linkedGoalLabel,
  )

  const persistStructure = (next: Goal) => {
    if (onSave) onSave(next)
    else onChange(next)
  }

  const patchStructure = (partial: Partial<Goal>) => {
    persistStructure(touch(goal, partial))
  }

  const patchMeasurement = (id: string, next: Measurement) => {
    onChange(
      touch(goal, {
        measurements: goal.measurements.map((item) =>
          item.id === id ? next : item,
        ),
      }),
    )
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
            authorId: commentAuthorId,
            authorName: commentAuthorName,
            text,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    )
    setComment('')
  }

  const hasOverflowMenu = hasGoalActions({
    onDuplicate,
    onCascade,
    onRemove,
    canRemove,
  })

  return (
    <>
    <div className="pd-goal-view" aria-label={title}>
      <header className="pd-goal-view__header">
        <div className="pd-goal-view__chrome">
          {editingSection === 'title' ? (
            <div className="pd-goal-create__title-edit">
              <label className="pd-sr-only" htmlFor={titleFieldId}>
                Goal name
              </label>
              <textarea
                id={titleFieldId}
                ref={titleRef}
                className="pd-goal-create__title-input"
                value={goal.description}
                rows={1}
                placeholder="Goal name"
                onChange={(event) =>
                  patchStructure({ description: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    setEditingSection(null)
                  }
                  if (event.key === 'Escape') setEditingSection(null)
                }}
                onBlur={() => setEditingSection(null)}
              />
            </div>
          ) : (
            <h1 className="pd-goal-view__title">
              <span>{title}</span>
              {canEdit ? (
                <SectionEditButton
                  label="Edit title"
                  onClick={() => setEditingSection('title')}
                />
              ) : null}
            </h1>
          )}

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
              <GoalActionsMenu
                canCascade={canCascade}
                canRemove={canRemove}
                cascadeTargets={cascadeTargets}
                onDuplicate={onDuplicate}
                onCascade={onCascade}
                onRemove={onRemove}
              />
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
            <p>Late update 15 days</p>
          </div>
        </div>

        {goal.details?.trim() || canEdit ? (
          <section
            className="pd-goal-view__description-card"
            aria-label="Description"
          >
            <div className="pd-goal-view__section-head">
              <p className="pd-goal-view__description-label">Description</p>
              {canEdit && editingSection !== 'description' ? (
                <SectionEditButton
                  label="Edit description"
                  onClick={() => setEditingSection('description')}
                />
              ) : null}
            </div>
            {editingSection === 'description' ? (
              <Textarea
                value={goal.details ?? ''}
                placeholder="Add a description (optional)"
                rows={3}
                autoFocus
                onChange={(event) =>
                  patchStructure({
                    details: event.target.value || undefined,
                  })
                }
                onBlur={() => setEditingSection(null)}
              />
            ) : (
              <p
                className={`pd-goal-view__description${
                  goal.details?.trim() ? '' : ' is-empty'
                }`}
              >
                {goal.details?.trim() || 'Add a description'}
              </p>
            )}
          </section>
        ) : null}

        {cascadeFromSelected ? (
          <section
            className="pd-goal-view__description-card"
            aria-label="Cascading from"
          >
            <CascadeLabel as="p" className="pd-goal-view__description-label">
              Cascading from
            </CascadeLabel>
            <GoalCascadeFromReadout
              goal={goal}
              cascadeFrom={cascadeFrom}
              hrefFor={cascadeHref}
            />
          </section>
        ) : null}

        {cascadedTo.length > 0 ? (
          <section
            className="pd-goal-view__description-card"
            aria-label="Cascaded to"
          >
            <GoalCascadedTo recipients={cascadedTo} hrefFor={cascadeHref} />
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
      </div>

      <GoalSummaryCards
        goal={goal}
        status={status}
        cycleLabel={cycleLabel}
        isCurrentCycle={isCurrentCycle}
        canChangeStatus={canUpdateProgress}
        onProgressStatus={(progressStatus) =>
          onChange(touch(goal, { progressStatus }))
        }
      />

      {editingSection === 'progress' ? (
        <div className="pd-goal-create">
          <div className="pd-goal-create__stack">
            <GoalProgressEditor
              goal={goal}
              onChange={persistStructure}
              onDone={() => setEditingSection(null)}
            />
          </div>
        </div>
      ) : (
      <div className="pd-goal-view__body">
        <div className="pd-goal-view__main">
              {todos.length > 0 || metrics.length === 0 ? (
                <section className="pd-goal-view__card" aria-label="To dos">
                  <div className="pd-goal-view__card-head">
                    <h2>To Do&apos;s</h2>
                    {canEdit ? (
                      <SectionEditButton
                        label="Edit how to measure progress"
                        onClick={() => setEditingSection('progress')}
                      />
                    ) : null}
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
                      {canEdit ? (
                        <SectionEditButton
                          label="Edit how to measure progress"
                          onClick={() => setEditingSection('progress')}
                        />
                      ) : null}
                    </div>
                  </div>
                </section>
              ))}
        </div>
      </div>
      )}

      <section className="pd-goal-view__comments" aria-label="Comments">
        <h2>Comments</h2>
        {comments.length > 0 ? (
          <ul className="pd-goal-view__comment-list">
            {comments.map((item) => (
              <li key={item.id} className="pd-goal-view__comment">
                <Avatar
                  name={item.authorName}
                  src={commentAuthor(item, commentAuthors)?.avatarUrl}
                  size="sm"
                  className="pd-people__avatar"
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
    </>
  )
}
