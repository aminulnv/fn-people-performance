import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Measurement, Milestone } from '@/lib/goals/types'
import type { MeasurementPanel, TodoListPanel } from '@/lib/goals/measurements'
import {
  numberedTaskListTitle,
  readMilestoneListTitle,
  readMilestoneTitle,
  uniqueMilestonesById,
} from '@/lib/goals/measurements'
import { GoalTodoCheck } from './GoalTodoCheck'
import { FocusSafeTextArea } from './FocusSafeTextField'
import { TaskListNameField, MeasureTitleField } from './MeasureTitleField'
import { MeasureTypeIcon } from './MeasureTypeSwitch'
import { GoalTodoMeasureReadout, GoalWeightInput } from './GoalMeasurementReadout'

type TodoMeasurePanel = Extract<MeasurementPanel, { kind: 'todo_measure' }>

export function TodoMeasureEditCard({
  panel,
  measurements,
  measureTitle,
  onChangeMeasureTitle,
  onChangeWeight,
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
  cardClassName = 'pd-goal-view__card pd-goal-measure-card pd-goal-measure-card--edit',
  headClassName = 'pd-goal-view__card-head',
  titleClassName = 'pd-goal-view__card-title',
  metricsClassName = 'pd-goal-view__card-metrics',
  todoListClassName = 'pd-goal-view__todos',
  todoItemClassName = 'pd-goal-view__todo',
  addTodoClassName = 'pd-people__ghost-btn pd-goal-measure-card__add-todo',
  addListClassName = 'pd-people__ghost-btn pd-goal-measure-card__add-list',
}: {
  panel: TodoMeasurePanel
  measurements: Measurement[]
  measureTitle: string
  onChangeMeasureTitle: (title: string) => void
  onChangeWeight: (weight: number) => void
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
}) {
  const weightLabel = measureTitle.trim()
    ? `Weight for ${measureTitle.trim()}`
    : 'Weight'

  const showListChrome = panel.lists.length > 1

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
                onClick={() => onRemoveList(list.listKey)}
              >
                <Trash2 size={14} strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="pd-goal-measure-card__list-scroll">
          <ul className={todoListClassName}>
            {todos.map((todo) => (
              <li key={todo.id} className={todoItemClassName}>
                <GoalTodoCheck
                  checked={todo.complete}
                  ariaLabel={`Mark ${readMilestoneTitle(measurements, todo.id).trim() || 'milestone'} complete`}
                  onChange={(complete) =>
                    onChangeMilestone(todo.id, { complete })
                  }
                />
                <FocusSafeTextArea
                  className="pd-goal-measure-card__todo-input"
                  inputKey={todo.id}
                  value={readMilestoneTitle(measurements, todo.id)}
                  placeholder="Untitled milestone"
                  ariaLabel="Milestone"
                  requestFocus={focusMilestoneId === todo.id}
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
                    aria-label={`Remove milestone${todo.title ? ` ${todo.title}` : ''}`}
                    onClick={() => onRemoveItem(todo.id)}
                  >
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="pd-goal-measure-card__list-actions">
          <button
            type="button"
            className={addTodoClassName}
            onClick={() => onAddItem(list.listKey)}
          >
            <Plus size={15} strokeWidth={2} aria-hidden />
            Add to do
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className={cardClassName} aria-label={measureTitle.trim() || 'Measure'}>
      <div className={headClassName}>
        <div className={titleClassName}>
          <MeasureTypeIcon kind="todo" />
          <MeasureTitleField
            inputKey={panel.measureGroupId}
            value={measureTitle}
            onChange={onChangeMeasureTitle}
          />
        </div>
        <div className={metricsClassName}>
          <GoalTodoMeasureReadout panel={panel} showCaptions={false} />
          <GoalWeightInput
            weight={panel.weight}
            ariaLabel={weightLabel}
            onChange={onChangeWeight}
          />
          {onRemove ? (
            <button
              type="button"
              className="pd-goal-create__icon-btn pd-goal-create__icon-btn--danger"
              aria-label={`Remove ${measureTitle.trim() || 'milestone'}`}
              onClick={onRemove}
            >
              <Trash2 size={15} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {meta ? <div className="pd-goal-measure-card__meta">{meta}</div> : null}

      <div className="pd-goal-measure-card__body">
        {panel.lists.map((list, index) => renderTodoList(list, index))}
        <button type="button" className={addListClassName} onClick={onAddTodoList}>
          <Plus size={15} strokeWidth={2} aria-hidden />
          Add task list
        </button>
      </div>
    </section>
  )
}
