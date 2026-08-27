import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Measurement, Milestone } from '@/lib/goals/types'
import {
  numberedTaskListTitle,
  readMilestoneListTitle,
  readMilestoneTitle,
  todoMeasureItems,
  uniqueMilestonesById,
  type MeasurementPanel,
  type TodoListPanel,
} from '@/lib/goals/measurements'
import { proofParts } from '@/lib/goals/proof'
import { ignoreInteractiveSummaryClick } from './measureFold'
import { GoalTodoCheck } from './GoalTodoCheck'
import { MeasureProofFields } from './MeasureProofFields'
import { FocusSafeTextArea } from './FocusSafeTextField'
import { TaskListNameField, MeasureTitleField } from './MeasureTitleField'
import { MeasureKindIcon } from './MeasureKindIcon'
import {
  GoalTodoMeasureReadout,
  GoalWeightInput,
  GoalWeightReadout,
} from './GoalMeasurementReadout'

type TodoMeasurePanel = Extract<MeasurementPanel, { kind: 'todo_measure' }>

export function TodoMeasureEditCard({
  panel,
  measurements,
  measureTitle,
  canEditWeight = true,
  onChangeMeasureTitle,
  onChangeWeight,
  onChangeProof,
  onChangeListTitle,
  onChangeMilestoneTitle,
  onChangeMilestone,
  onRemove,
  onAddTodoList,
  onAddItem,
  onRemoveItem,
  onRemoveList,
  canRemoveList,
  focusMilestoneId,
  onFocusMilestone,
  meta,
  cardClassName = 'pd-goal-view__fold pd-goal-measure-card pd-goal-measure-card--edit',
  headClassName = 'pd-goal-view__fold-head',
  titleClassName = 'pd-goal-view__fold-title',
  metricsClassName = 'pd-goal-view__fold-meta',
  todoListClassName = 'pd-goal-view__todos',
  todoItemClassName = 'pd-goal-view__todo',
  addTodoClassName = 'pd-goal-measure-card__add-todo',
  addListClassName = 'pd-goal-measure-card__add-list',
  nameError,
  requestNameFocus,
  onNameAbandon,
  locked = false,
}: {
  panel: TodoMeasurePanel
  measurements: Measurement[]
  measureTitle: string
  canEditWeight?: boolean
  onChangeMeasureTitle: (title: string) => void
  onChangeWeight: (weight: number) => void
  onChangeProof?: (next: { proofUrl?: string; comment?: string }) => void
  onRemove?: () => void
  onChangeListTitle: (listKey: string, listTitle: string) => void
  onChangeMilestoneTitle: (milestoneId: string, title: string) => void
  onChangeMilestone: (milestoneId: string, patch: Partial<Milestone>) => void
  onAddTodoList: () => void
  onAddItem: (listKey: string) => void
  onRemoveItem: (id: string) => void
  onRemoveList: (listKey: string) => void
  canRemoveList: boolean
  focusMilestoneId?: string | null
  onFocusMilestone?: () => void
  meta?: ReactNode
  cardClassName?: string
  headClassName?: string
  titleClassName?: string
  metricsClassName?: string
  todoListClassName?: string
  todoItemClassName?: string
  addTodoClassName?: string
  addListClassName?: string
  nameError?: string
  requestNameFocus?: boolean
  onNameAbandon?: () => void
  locked?: boolean
}) {
  const named = measureTitle.trim() !== ''
  const bodyLocked = locked || !named
  const weightLabel = measureTitle.trim()
    ? `Weight for ${measureTitle.trim()}`
    : 'Weight'

  const showListChrome = panel.lists.length > 1
  const proofSource =
    todoMeasureItems(panel).find((todo) =>
      proofParts(todo.proofUrl, todo.comment).hasProof,
    ) ?? todoMeasureItems(panel)[0]

  const renderTodoList = (list: TodoListPanel, index: number) => {
    const todos = uniqueMilestonesById(list.todos)
    const complete = todos.filter((todo) => todo.complete).length
    const total = todos.length

    return (
      <div
        key={list.listKey}
        className={`pd-goal-measure-card__list${
          showListChrome ? '' : ' pd-goal-measure-card__list--bare'
        }`}
      >
        {showListChrome ? (
          <div className="pd-goal-measure-card__list-head">
            <TaskListNameField
              inputKey={list.listKey}
              value={readMilestoneListTitle(measurements, list.listKey)}
              placeholder={numberedTaskListTitle(index + 1)}
              disabled={bodyLocked}
              onChange={(listTitle) => onChangeListTitle(list.listKey, listTitle)}
            />
            <span className="pd-goal-measure-card__list-count">
              {complete}/{total} done
            </span>
            {canRemoveList ? (
              <button
                type="button"
                className="pd-goal-measure-card__list-delete"
                aria-label={`Remove ${readMilestoneListTitle(measurements, list.listKey).trim() || 'task list'}`}
                disabled={bodyLocked}
                onClick={() => onRemoveList(list.listKey)}
              >
                <Trash2 size={14} strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="pd-goal-measure-card__list-scroll">
          <ul className={todoListClassName}>
            {todos.map((todo) => {
              const taskName =
                readMilestoneTitle(measurements, todo.id).trim() || 'task'
              return (
              <li key={todo.id} className={todoItemClassName}>
                <GoalTodoCheck
                  checked={todo.complete}
                  disabled={bodyLocked}
                  ariaLabel={`Mark ${taskName} complete`}
                  onChange={(complete) =>
                    onChangeMilestone(todo.id, { complete })
                  }
                />
                <FocusSafeTextArea
                  className="pd-goal-measure-card__todo-input"
                  inputKey={todo.id}
                  value={readMilestoneTitle(measurements, todo.id)}
                  placeholder="Untitled task"
                  ariaLabel="Task"
                  requestFocus={!bodyLocked && focusMilestoneId === todo.id}
                  disabled={bodyLocked}
                  onFocusRequested={onFocusMilestone}
                  onChange={(title) => onChangeMilestoneTitle(todo.id, title)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    event.currentTarget.blur()
                  }}
                />
                {todos.length > 1 ? (
                  <button
                    type="button"
                    className="pd-goal-measure-card__todo-delete"
                    aria-label={`Remove task${todo.title ? ` ${todo.title}` : ''}`}
                    disabled={bodyLocked}
                    onClick={() => onRemoveItem(todo.id)}
                  >
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                  </button>
                ) : null}
              </li>
              )
            })}
          </ul>
        </div>

        <div className="pd-goal-measure-card__list-actions">
          <button
            type="button"
            className={addTodoClassName}
            disabled={bodyLocked}
            title={bodyLocked ? 'Name the metric first' : undefined}
            onClick={() => onAddItem(list.listKey)}
          >
            <Plus size={12} strokeWidth={2} aria-hidden />
            Add task
          </button>
        </div>
      </div>
    )
  }

  return (
    <details
      className={cardClassName}
      aria-label={measureTitle.trim() || 'Metric'}
      open
    >
      <summary className={headClassName} onClick={ignoreInteractiveSummaryClick}>
        <ChevronRight
          size={14}
          strokeWidth={2.25}
          className="pd-goal-view__fold-chevron"
          aria-hidden
        />
        <MeasureKindIcon kind="milestone" />
        <div className={titleClassName}>
          <MeasureTitleField
            inputKey={panel.measureGroupId}
            value={measureTitle}
            error={nameError}
            requestFocus={requestNameFocus}
            onEmptyBlur={onNameAbandon}
            disabled={locked}
            onChange={onChangeMeasureTitle}
            placeholder="Milestone name"
            editLabel="Edit milestone name"
            inputLabel="Milestone name"
          />
          <GoalTodoMeasureReadout panel={panel} showCaptions={false} />
        </div>
        <div className={metricsClassName}>
          <MeasureProofFields
            proofUrl={proofSource?.proofUrl}
            comment={proofSource?.comment}
            name={measureTitle.trim() || 'milestone'}
            disabled={bodyLocked}
            onChange={onChangeProof}
          />
          {!bodyLocked && canEditWeight ? (
            <GoalWeightInput
              weight={panel.weight}
              ariaLabel={weightLabel}
              onChange={onChangeWeight}
            />
          ) : (
            <GoalWeightReadout weight={panel.weight} />
          )}
          {onRemove ? (
            <button
              type="button"
              className="pd-goal-create__icon-btn pd-goal-create__icon-btn--danger"
              aria-label={`Remove ${measureTitle.trim() || 'milestone'}`}
              disabled={locked}
              onClick={onRemove}
            >
              <Trash2 size={15} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
      </summary>

      {meta ? <div className="pd-goal-measure-card__meta">{meta}</div> : null}

      <div className="pd-goal-measure-card__body">
        {panel.lists.map((list, index) => renderTodoList(list, index))}
        <button
          type="button"
          className={addListClassName}
          disabled={bodyLocked}
          title={bodyLocked ? 'Name the metric first' : undefined}
          onClick={onAddTodoList}
        >
          <Plus size={12} strokeWidth={2} aria-hidden />
          Add task list
        </button>
      </div>
    </details>
  )
}
