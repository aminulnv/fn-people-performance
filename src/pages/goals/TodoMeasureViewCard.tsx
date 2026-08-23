import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Milestone } from '@/lib/goals/types'
import {
  numberedTaskListTitle,
  todoMeasureItems,
  uniqueMilestonesById,
  type MeasurementPanel,
} from '@/lib/goals/measurements'
import { measurePanelName } from '@/pages/goals/measurePanelDisplay'
import {
  GoalTodoMeasureReadout,
  formatWeightReadout,
} from './GoalMeasurementReadout'
import { GoalProgressLog } from './GoalProgressLog'
import { MeasureKindIcon } from './MeasureKindIcon'

type TodoMeasurePanel = Extract<MeasurementPanel, { kind: 'todo_measure' }>

export function TodoMeasureViewCard({
  panel,
  renderTodoItem,
  highlighted = false,
  cardClassName = 'pd-goal-view__fold pd-goal-measure-card',
  headClassName = 'pd-goal-view__fold-head',
  titleClassName = 'pd-goal-view__fold-title',
  metricsClassName = 'pd-goal-view__fold-meta',
  todoListClassName = 'pd-goal-view__todos',
  todoItemClassName = 'pd-goal-view__todo',
}: {
  panel: TodoMeasurePanel
  renderTodoItem: (todo: Milestone) => ReactNode
  highlighted?: boolean
  cardClassName?: string
  headClassName?: string
  titleClassName?: string
  metricsClassName?: string
  todoListClassName?: string
  todoItemClassName?: string
}) {
  const name = measurePanelName(panel)
  const weightLabel = formatWeightReadout(panel.weight)
  const progressEntries = todoMeasureItems(panel).flatMap(
    (todo) => todo.progressLog ?? [],
  )

  return (
    <details
      className={[cardClassName, highlighted ? 'is-highlighted' : '']
        .filter(Boolean)
        .join(' ')}
      data-measure-panel={panel.key}
      aria-label={name || 'Measure'}
      open
    >
      <summary className={headClassName}>
        <ChevronRight
          size={14}
          strokeWidth={2.25}
          className="pd-goal-view__fold-chevron"
          aria-hidden
        />
        <MeasureKindIcon kind="milestone" />
        <div className={titleClassName}>
          {name ? (
            <h2>
              {name}
              {weightLabel ? ` · ${weightLabel}` : ''}
            </h2>
          ) : null}
        </div>
        <div className={metricsClassName}>
          <GoalTodoMeasureReadout panel={panel} showCaptions={false} />
        </div>
      </summary>

      <div className="pd-goal-measure-card__body">
        {panel.lists.map((list, index) => {
          const todos = uniqueMilestonesById(list.todos)
          return (
            <div key={list.listKey} className="pd-goal-measure-card__list">
              {panel.lists.length > 1 ? (
                <div className="pd-goal-measure-card__list-head">
                  <span className="pd-goal-measure-card__list-label">
                    {list.listTitle.trim() || numberedTaskListTitle(index + 1)}
                  </span>
                </div>
              ) : null}
              <ul className={todoListClassName}>
                {todos.map((todo) => (
                  <li key={todo.id} className={todoItemClassName}>
                    {renderTodoItem(todo)}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <GoalProgressLog kind="milestone" entries={progressEntries} />
    </details>
  )
}
