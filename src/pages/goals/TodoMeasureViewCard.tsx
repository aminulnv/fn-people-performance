import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Tooltip } from '@/components/ui'
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
  GoalTodoMeasureTip,
  GoalWeightReadout,
} from './GoalMeasurementReadout'
import { proofParts } from '@/lib/goals/proof'
import { GoalProgressLog } from './GoalProgressLog'
import { ignoreInteractiveSummaryClick } from './measureFold'
import { MeasureKindIcon } from './MeasureKindIcon'
import { MeasureProofFields } from './MeasureProofFields'

type TodoMeasurePanel = Extract<MeasurementPanel, { kind: 'todo_measure' }>

export function TodoMeasureViewCard({
  panel,
  renderTodoItem,
  highlighted = false,
  onProofChange,
  cardClassName = 'pd-goal-view__fold pd-goal-measure-card',
  headClassName = 'pd-goal-view__fold-head',
  titleClassName = 'pd-goal-view__fold-title',
  todoListClassName = 'pd-goal-view__todos',
  todoItemClassName = 'pd-goal-view__todo',
}: {
  panel: TodoMeasurePanel
  renderTodoItem: (todo: Milestone) => ReactNode
  highlighted?: boolean
  onProofChange?: (next: { proofUrl?: string; comment?: string }) => void
  cardClassName?: string
  headClassName?: string
  titleClassName?: string
  todoListClassName?: string
  todoItemClassName?: string
}) {
  const name = measurePanelName(panel)
  const todos = todoMeasureItems(panel)
  const progressEntries = todos.flatMap((todo) => todo.progressLog ?? [])
  const proofSource =
    todos.find((todo) => proofParts(todo.proofUrl, todo.comment).hasProof) ??
    todos[0]

  return (
    <details
      className={[cardClassName, highlighted ? 'is-highlighted' : '']
        .filter(Boolean)
        .join(' ')}
      data-measure-panel={panel.key}
      aria-label={name || 'Metric'}
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
          {name ? (
            <Tooltip
              className="pd-goals-table__measure-name-tip"
              side="left"
              portal
              interactive
              delayMs={80}
              content={<GoalTodoMeasureTip panel={panel} />}
            >
              <h2>{name}</h2>
            </Tooltip>
          ) : null}
          <GoalTodoMeasureReadout panel={panel} showCaptions={false} />
        </div>
        <div className="pd-goal-view__fold-meta">
          <MeasureProofFields
            proofUrl={proofSource?.proofUrl}
            comment={proofSource?.comment}
            name={name || 'milestone'}
            disabled={!onProofChange}
            onChange={onProofChange}
          />
          <GoalWeightReadout weight={panel.weight} />
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
