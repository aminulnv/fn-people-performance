import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Measurement, Milestone } from '@/lib/goals/types'
import type { MeasurementPanel, TodoListPanel } from '@/lib/goals/measurements'
import {
  readMilestoneListTitle,
  readMilestoneTitle,
  uniqueMilestonesById,
} from '@/lib/goals/measurements'
import { FocusSafeTextField } from './FocusSafeTextField'
import { TaskListNameField, MeasureTitleField } from './MeasureTitleField'
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
  todoCheckClassName = 'pd-goal-measure-card__todo-check',
  addTodoClassName = 'pd-goal-measure-card__add-todo',
  addListClassName = 'pd-goal-v2__row-btn pd-goal-measure-card__add-list',
}: {
  panel: TodoMeasurePanel
  measurements: Measurement[]
  measureTitle: string
  onChangeMeasureTitle: (title: string) => void
  onChangeWeight: (weight: number) => void
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
  todoCheckClassName?: string
  addTodoClassName?: string
  addListClassName?: string
}) {
  const weightLabel = measureTitle.trim()
    ? `Weight for ${measureTitle.trim()}`
    : 'Weight'

  const renderTodoList = (list: TodoListPanel) => {
    const todos = uniqueMilestonesById(list.todos)
    const complete = todos.filter((todo) => todo.complete).length
    const total = todos.length

    return (
      <div key={list.listKey} className="pd-goal-measure-card__list">
        <div className="pd-goal-measure-card__list-head">
          <TaskListNameField
            inputKey={list.listKey}
            value={readMilestoneListTitle(measurements, list.listKey)}
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

        <div className="pd-goal-measure-card__list-scroll">
          <ul className={todoListClassName}>
            {todos.map((todo) => (
              <li key={todo.id} className={todoItemClassName}>
                <input
                  type="checkbox"
                  className={todoCheckClassName}
                  checked={todo.complete}
                  aria-label={`Mark ${readMilestoneTitle(measurements, todo.id).trim() || 'milestone'} complete`}
                  onChange={(event) =>
                    onChangeMilestone(todo.id, { complete: event.target.checked })
                  }
                />
                <FocusSafeTextField
                  className="pd-goal-measure-card__todo-input"
                  inputKey={todo.id}
                  value={readMilestoneTitle(measurements, todo.id)}
                  placeholder="Untitled milestone"
                  ariaLabel="Milestone"
                  requestFocus={focusMilestoneId === todo.id}
                  onFocusRequested={onFocusMilestone}
                  onChange={(title) => onChangeMilestoneTitle(todo.id, title)}
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

        <button
          type="button"
          className={addTodoClassName}
          onClick={() => onAddItem(list.listKey)}
        >
          <Plus size={15} strokeWidth={2} aria-hidden />
          Add to do
        </button>
      </div>
    )
  }

  return (
    <section className={cardClassName} aria-label={measureTitle.trim() || 'Measure'}>
      <div className={headClassName}>
        <div className={titleClassName}>
          <MeasureTitleField
            inputKey={panel.measureGroupId}
            value={measureTitle}
            onChange={onChangeMeasureTitle}
          />
        </div>
        <GoalTodoMeasureReadout panel={panel} />
        <div className={metricsClassName}>
          <GoalWeightInput
            weight={panel.weight}
            ariaLabel={weightLabel}
            onChange={onChangeWeight}
          />
        </div>
      </div>

      {meta ? <div className="pd-goal-measure-card__meta">{meta}</div> : null}

      <div className="pd-goal-measure-card__body">
        {panel.lists.map((list) => renderTodoList(list))}
      </div>

      <div className="pd-goal-measure-card__foot">
        <button type="button" className={addListClassName} onClick={onAddTodoList}>
          <Plus size={15} strokeWidth={2} aria-hidden />
          Add task list
        </button>
      </div>
    </section>
  )
}
