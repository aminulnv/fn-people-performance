import type { ReactNode } from 'react'
import type { Milestone } from '@/lib/goals/types'
import type { MeasurementPanel } from '@/lib/goals/measurements'
import { todoMeasureItems, uniqueMilestonesById } from '@/lib/goals/measurements'
import { measurePanelName } from '@/pages/goals-v2/measurePanelDisplay'
import {
  GoalTodoMeasureReadout,
  GoalWeightReadout,
} from './GoalMeasurementReadout'
import { GoalProgressLog } from './GoalProgressLog'

type TodoMeasurePanel = Extract<MeasurementPanel, { kind: 'todo_measure' }>

export function TodoMeasureViewCard({
  panel,
  renderTodoItem,
  cardClassName = 'pd-goal-view__card pd-goal-measure-card',
  headClassName = 'pd-goal-view__card-head',
  titleClassName = 'pd-goal-view__card-title',
  metricsClassName = 'pd-goal-view__card-metrics',
  todoListClassName = 'pd-goal-view__todos',
  todoItemClassName = 'pd-goal-view__todo',
}: {
  panel: TodoMeasurePanel
  renderTodoItem: (todo: Milestone) => ReactNode
  cardClassName?: string
  headClassName?: string
  titleClassName?: string
  metricsClassName?: string
  todoListClassName?: string
  todoItemClassName?: string
}) {
  const name = measurePanelName(panel)
  const progressEntries = todoMeasureItems(panel).flatMap(
    (todo) => todo.progressLog ?? [],
  )

  return (
    <section className={cardClassName} aria-label={name || 'Measure'}>
      <div className={headClassName}>
        <div className={titleClassName}>
          {name ? <h2>{name}</h2> : null}
        </div>
        <GoalTodoMeasureReadout panel={panel} />
        <div className={metricsClassName}>
          <GoalWeightReadout weight={panel.weight} />
        </div>
      </div>

      <div className="pd-goal-measure-card__body">
        {panel.lists.map((list) => {
          const todos = uniqueMilestonesById(list.todos)
          const complete = todos.filter((todo) => todo.complete).length
          const total = todos.length
          return (
            <div key={list.listKey} className="pd-goal-measure-card__list">
              <div className="pd-goal-measure-card__list-head">
                <span className="pd-goal-measure-card__list-label">
                  {list.listTitle.trim() || 'Task list'}
                </span>
                <span className="pd-goal-measure-card__list-count">
                  {complete}/{total} done
                </span>
              </div>
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

      <GoalProgressLog entries={progressEntries} />
    </section>
  )
}
