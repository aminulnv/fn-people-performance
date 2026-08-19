import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  appendMilestoneList,
  appendMilestoneToList,
  appendTodoListToMeasure,
  blankMetric,
  measurementPanels,
  readMeasureGroupTitle,
  rebalanceMeasurementWeights,
  redistributeTodoMeasureWeight,
  removeMilestoneFromList,
  removeMilestoneList,
  removeTodoMeasure,
  replaceMilestoneList,
  patchMilestone,
  withMeasureTitle,
  withMilestoneListTitle,
  withMilestoneTitle,
} from '@/lib/goals/measurements'
import { MeasureTypeAddButtons } from '@/pages/goals/MeasureTypeSwitch'
import { NumberMeasureEditCard } from '@/pages/goals/NumberMeasureEditCard'
import { TodoMeasureEditCard } from '@/pages/goals/TodoMeasureEditCard'
import type { Goal, Measurement, Milestone } from '@/lib/goals/types'
import { sumMeasurementWeights } from '@/lib/goals/weightage'

function MeasureHead({
  title,
  removeLabel,
  onRemove,
}: {
  title: string
  removeLabel: string
  onRemove?: () => void
}) {
  return (
    <div className="pd-goal-create__measure-head">
      <h3 className="pd-goal-create__measure-title">{title}</h3>
      {onRemove ? (
        <button
          type="button"
          className="pd-goal-create__icon-btn pd-goal-create__icon-btn--danger"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <Trash2 size={15} strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

export function GoalProgressEditor({
  goal,
  onChange,
  onDone,
  measureNameError,
  measurementWeightError,
}: {
  goal: Goal
  onChange: (goal: Goal) => void
  onDone?: () => void
  measureNameError?: string
  measurementWeightError?: string
}) {
  const measureWeight = sumMeasurementWeights(goal.measurements)
  const measurements = goal.measurements
  const panels = measurementPanels(measurements)
  const goalRef = useRef(goal)
  goalRef.current = goal
  const [focusMilestoneId, setFocusMilestoneId] = useState<string | null>(null)

  const patch = (partial: Partial<Goal>) =>
    onChange({ ...goalRef.current, ...partial })

  const currentMeasurements = () => goalRef.current.measurements

  /** Legacy or seeded goals can arrive weightless; give them a starting split. */
  useEffect(() => {
    if (measurements.length === 0) return
    if (sumMeasurementWeights(measurements) > 0) return
    onChange({
      ...goalRef.current,
      measurements: rebalanceMeasurementWeights(measurements),
    })
  }, [goal, measurements, onChange])

  /**
   * Adding or removing a measurement re-splits evenly; per-measurement edits keep
   * whatever the user typed.
   */
  const setMeasurements = (next: Measurement[]) =>
    patch({
      measurements: rebalanceMeasurementWeights(next),
    })

  const distributeWeightsEvenly = () =>
    patch({ measurements: rebalanceMeasurementWeights(currentMeasurements()) })

  const addMetric = () =>
    setMeasurements([...currentMeasurements(), blankMetric('increase')])

  const updateMeasurement = (next: Measurement) =>
    patch({
      measurements: currentMeasurements().map((item) =>
        item.id === next.id ? next : item,
      ),
    })

  const removeMeasurement = (id: string) =>
    setMeasurements(currentMeasurements().filter((item) => item.id !== id))

  const addMilestoneMeasure = () =>
    setMeasurements(appendMilestoneList(currentMeasurements()))

  const todoMeasureCount = (panelIndex: number) =>
    panels
      .slice(0, panelIndex + 1)
      .filter((entry) => entry.kind === 'todo_measure').length

  return (
    <section
      className="pd-goal-create__progress"
      aria-label="Progress measurement"
    >
      <div className="pd-goal-create__progress-head">
        <h2>How to measure progress?</h2>
        <div className="pd-goal-create__progress-head-actions">
          {onDone ? (
            <button
              type="button"
              className="pd-people__ghost-btn"
              onClick={onDone}
            >
              Done
            </button>
          ) : null}
        </div>
      </div>

      {panels.map((panel, index) =>
        panel.kind === 'metric' ? (
          <div key={panel.key} className="pd-goal-create__measure-block">
            <MeasureHead
              title={`Metric ${
                panels.slice(0, index + 1).filter((item) => item.kind === 'metric')
                  .length
              }`}
              removeLabel={`Remove metric ${
                panels.slice(0, index + 1).filter((item) => item.kind === 'metric')
                  .length
              }`}
              onRemove={() => removeMeasurement(panel.metric.id)}
            />
            <NumberMeasureEditCard
              metric={panel.metric}
              onChange={updateMeasurement}
            />
          </div>
        ) : panel.kind === 'todo_measure' ? (
          <div key={panel.key} className="pd-goal-create__measure-block">
            <MeasureHead
              title={`Metric ${todoMeasureCount(index)}`}
              removeLabel={`Remove metric ${todoMeasureCount(index)}`}
              onRemove={() =>
                setMeasurements(
                  removeTodoMeasure(currentMeasurements(), panel.measureGroupId),
                )
              }
            />
            <TodoMeasureEditCard
              panel={panel}
              measurements={measurements}
              measureTitle={readMeasureGroupTitle(measurements, panel.measureGroupId)}
              canRemoveList={panel.lists.length > 1 || measurements.length > 1}
              addListClassName="pd-goal-create__text-btn pd-goal-create__add-todo-list pd-goal-measure-card__add-list"
              addTodoClassName="pd-goal-measure-card__add-todo"
              onChangeMeasureTitle={(measureTitle) =>
                patch({
                  measurements: withMeasureTitle(
                    currentMeasurements(),
                    panel.measureGroupId,
                    measureTitle,
                  ),
                })
              }
              onChangeWeight={(weight) =>
                patch({
                  measurements: redistributeTodoMeasureWeight(
                    currentMeasurements(),
                    panel.measureGroupId,
                    weight,
                  ),
                })
              }
              onAddTodoList={() =>
                patch({
                  measurements: appendTodoListToMeasure(
                    currentMeasurements(),
                    panel.measureGroupId,
                  ),
                })
              }
              onChangeListTitle={(listKey, listTitle) => {
                const listTodos = currentMeasurements().filter(
                  (item): item is Milestone =>
                    item.kind === 'milestone' &&
                    (item.listId ?? item.id) === listKey,
                )
                if (listTodos.length === 0) return
                patch({
                  measurements: replaceMilestoneList(
                    currentMeasurements(),
                    listKey,
                    withMilestoneListTitle(listTodos, listTitle),
                  ),
                })
              }}
              onChangeMilestoneTitle={(milestoneId, title) =>
                patch({
                  measurements: withMilestoneTitle(
                    currentMeasurements(),
                    milestoneId,
                    title,
                  ),
                })
              }
              onChangeMilestone={(milestoneId, milestonePatch) =>
                patch({
                  measurements: patchMilestone(
                    currentMeasurements(),
                    milestoneId,
                    milestonePatch,
                  ),
                })
              }
              onAddItem={(listKey) => {
                const beforeIds = new Set(currentMeasurements().map((item) => item.id))
                const next = appendMilestoneToList(currentMeasurements(), listKey)
                const added = next.find((item) => !beforeIds.has(item.id))
                if (added) setFocusMilestoneId(added.id)
                patch({ measurements: next })
              }}
              onRemoveItem={(id) =>
                setMeasurements(removeMilestoneFromList(currentMeasurements(), id))
              }
              onRemoveList={(listKey) =>
                setMeasurements(removeMilestoneList(currentMeasurements(), listKey))
              }
              focusMilestoneId={focusMilestoneId}
              onFocusMilestone={() => setFocusMilestoneId(null)}
            />
          </div>
        ) : null,
      )}

      <MeasureTypeAddButtons
        onAddMilestone={addMilestoneMeasure}
        onAddNumber={addMetric}
      />

      {measureNameError ? (
        <p className="pd-goal-create__title-error" role="alert">
          {measureNameError}
        </p>
      ) : null}

      {measurementWeightError ? (
        <p className="pd-goal-create__title-error" role="alert">
          {measurementWeightError}
        </p>
      ) : null}

      <div className="pd-goal-create__weight-footer">
        <p className="pd-goal-create__weight-hint">
          Measurement weights: {measureWeight}% / 100%
          {measureWeight === 100
            ? ' — split evenly, edit any weight to override.'
            : ' — edit the weights beside each measurement so they total 100%.'}
        </p>
        {measurements.length > 1 ? (
          <button
            type="button"
            className="pd-goal-create__text-btn"
            onClick={distributeWeightsEvenly}
          >
            Distribute Evenly
          </button>
        ) : null}
      </div>
    </section>
  )
}
