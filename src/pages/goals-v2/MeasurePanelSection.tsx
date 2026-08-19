import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Progress } from '@/components/ui'
import type { MeasurementPanel } from '@/lib/goals/measurements'
import { MeasureTypeAddButtons } from '@/pages/goals/MeasureTypeSwitch'
import { GoalChecklistProgress } from '@/pages/goals/GoalMeasurementReadout'
import { todoMeasureItems } from '@/lib/goals/measurements'
import {
  measurePanelMetricLine,
  measurePanelListLabel,
  measurePanelName,
  measurePanelProgress,
  measurePanelUnit,
} from './measurePanelDisplay'

export function MeasureListTable({
  panels,
  cycleLabel,
  onEditPanel,
}: {
  panels: MeasurementPanel[]
  cycleLabel: string
  onEditPanel: (panelKey: string) => void
}) {
  if (panels.length === 0) {
    return (
      <p className="pd-measures-table__empty">
        No measures on this goal yet. Edit the goal to add metrics.
      </p>
    )
  }

  return (
    <div
      className="pd-measures-table"
      role="table"
      aria-label={`Metrics · ${panels.length}`}
    >
      <div className="pd-measures-table__head" role="row">
        <span role="columnheader">Metric name · {panels.length}</span>
        <span role="columnheader">Cycle</span>
        <span role="columnheader">Type</span>
        <span role="columnheader">Progress</span>
        <span role="columnheader">Metric</span>
        <span role="columnheader">Unit</span>
        <span className="pd-sr-only" role="columnheader">
          Edit
        </span>
      </div>
      {panels.map((panel, index) => {
        const progress = measurePanelProgress(panel)
        const name = measurePanelName(panel)
        return (
          <div key={panel.key} className="pd-measures-table__row" role="row">
            <span className="pd-measures-table__name" role="cell">
              {name}
            </span>
            <span className="pd-measures-table__cycle" role="cell">
              {cycleLabel}
            </span>
            <span className="pd-measures-table__type" role="cell">
              <span className="pd-measures-table__type-pill">Manual</span>
            </span>
            <span className="pd-measures-table__progress" role="cell">
              <span className="pd-measures-table__progress-label">
                {progress}%
              </span>
              <Progress value={progress} />
            </span>
            <span className="pd-measures-table__metric" role="cell">
              {panel.kind === 'metric' ? (
                measurePanelMetricLine(panel)
              ) : (
                <GoalChecklistProgress
                  complete={
                    todoMeasureItems(panel).filter((todo) => todo.complete)
                      .length
                  }
                  total={todoMeasureItems(panel).length}
                />
              )}
            </span>
            <span className="pd-measures-table__unit" role="cell">
              {measurePanelUnit(panel)}
            </span>
            <span className="pd-measures-table__actions" role="cell">
              <button
                type="button"
                className="pd-measures-table__edit"
                aria-label={name ? `Edit ${name}` : `Edit measure ${index + 1}`}
                onClick={() => onEditPanel(panel.key)}
              >
                <Pencil size={15} strokeWidth={1.75} aria-hidden />
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function MeasureEditList({
  panels,
  expandedKey,
  onExpandedKeyChange,
  measureWeight,
  onSplitEvenly,
  onAddNumber,
  onAddMilestone,
  onRemovePanel,
  onAddTodoList,
  renderExpandedPanel,
  measureNameError,
  weightError,
}: {
  panels: MeasurementPanel[]
  expandedKey: string | null
  onExpandedKeyChange: (panelKey: string | null) => void
  measureWeight: number
  onSplitEvenly: () => void
  onAddNumber: () => void
  onAddMilestone: () => void
  onRemovePanel: (panelKey: string) => void
  onAddTodoList?: (panelKey: string) => void
  renderExpandedPanel: (panel: MeasurementPanel) => ReactNode
  measureNameError?: string
  weightError?: string
}) {
  const allocationTone =
    measureWeight === 100 ? 'ok' : measureWeight > 100 ? 'over' : 'under'

  return (
    <section className="pd-measure-edit" aria-labelledby="goal-v2-measures">
      <div className="pd-measure-edit__head">
        <div>
          <h2 id="goal-v2-measures">How to measure progress?</h2>
          <p className="pd-measure-edit__sub">
            Weights split this goal between its measures.
          </p>
        </div>
        <div className="pd-measure-edit__head-actions">
          <div className="pd-measure-edit__alloc">
            <span
              className={`pd-goal-v2__alloc-value pd-goal-v2__alloc-value--${allocationTone}`}
            >
              {measureWeight}%<span aria-hidden> / 100%</span>
            </span>
            {panels.length > 1 ? (
              <button
                type="button"
                className="pd-goal-v2__quiet-btn"
                onClick={onSplitEvenly}
              >
                Split evenly
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {panels.length > 0 ? (
        <div className="pd-measure-edit__list">
          {panels.map((panel, index) => {
            const expanded = expandedKey === panel.key
            const listLabel = measurePanelListLabel(panel, index)
            return (
              <div
                key={panel.key}
                className={`pd-measure-edit__item${expanded ? ' is-expanded' : ''}`}
              >
                <div className="pd-measure-edit__item-row">
                  <button
                    type="button"
                    className="pd-measure-edit__toggle"
                    aria-expanded={expanded}
                    aria-controls={`measure-panel-${panel.key}`}
                    onClick={() =>
                      onExpandedKeyChange(expanded ? null : panel.key)
                    }
                  >
                    <ChevronDown
                      size={16}
                      strokeWidth={1.75}
                      className="pd-measure-edit__chevron"
                      aria-hidden
                    />
                    <span>{listLabel}</span>
                  </button>
                  <div className="pd-measure-edit__item-actions">
                    {panel.kind === 'todo_measure' && onAddTodoList ? (
                      <button
                        type="button"
                        className="pd-measure-edit__add-list"
                        onClick={() => onAddTodoList(panel.key)}
                      >
                        <Plus size={14} strokeWidth={2.25} aria-hidden />
                        Add task list
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="pd-measure-edit__delete"
                      onClick={() => onRemovePanel(panel.key)}
                    >
                      <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                      Delete
                    </button>
                  </div>
                </div>
                {expanded ? (
                  <div
                    id={`measure-panel-${panel.key}`}
                    className="pd-measure-edit__detail"
                  >
                    {renderExpandedPanel(panel)}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      <MeasureTypeAddButtons
        onAddMilestone={onAddMilestone}
        onAddNumber={onAddNumber}
      />

      {measureNameError ? (
        <p className="pd-goal-v2__error" role="alert">
          {measureNameError}
        </p>
      ) : null}

      {weightError ? (
        <p className="pd-goal-v2__error" role="alert">
          {weightError}
        </p>
      ) : null}
    </section>
  )
}
