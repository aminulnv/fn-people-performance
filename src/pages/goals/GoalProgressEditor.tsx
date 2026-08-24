import { useEffect, useRef, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import {
  appendMilestoneList,
  appendMilestoneToList,
  appendTodoListToMeasure,
  blankMetric,
  canEditMeasurementWeights,
  lockSoloMeasurementWeights,
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
import { recordMetricProgress, type ProgressLogAuthor } from '@/lib/goals/progressLog'
import { GoalEmptyMeasures } from '@/pages/goals/GoalEmptyMeasures'
import { MeasureTypeAddButtons } from '@/pages/goals/MeasureTypeSwitch'
import { NumberMeasureEditCard } from '@/pages/goals/NumberMeasureEditCard'
import { TodoMeasureEditCard } from '@/pages/goals/TodoMeasureEditCard'
import type { Goal, Measurement, Milestone } from '@/lib/goals/types'
import { sumMeasurementWeights } from '@/lib/goals/weightage'

function panelWeights(measurements: Measurement[]): number[] {
  return measurementPanels(measurements).map((panel) =>
    panel.kind === 'metric' ? panel.metric.weight : panel.weight,
  )
}

function isEvenMeasurementSplit(measurements: Measurement[]): boolean {
  const current = panelWeights(measurements)
  if (current.length === 0) return true
  const even = panelWeights(rebalanceMeasurementWeights(measurements))
  return (
    current.length === even.length &&
    current.every((weight, index) => weight === even[index])
  )
}

export function GoalProgressEditor({
  goal,
  onChange,
  measureNameError,
  measurementWeightError,
  progressAuthor,
  cycleLabel,
}: {
  goal: Goal
  onChange: (goal: Goal) => void
  measureNameError?: string
  measurementWeightError?: string
  progressAuthor?: ProgressLogAuthor
  cycleLabel?: string
}) {
  const measureWeight = sumMeasurementWeights(goal.measurements)
  const measurements = goal.measurements
  const panels = measurementPanels(measurements)
  const goalRef = useRef(goal)
  const onChangeRef = useRef(onChange)
  goalRef.current = goal
  onChangeRef.current = onChange
  const [focusMilestoneId, setFocusMilestoneId] = useState<string | null>(null)

  const patch = (partial: Partial<Goal>) =>
    onChange({ ...goalRef.current, ...partial })

  const currentMeasurements = () => goalRef.current.measurements

  /** Seed empty weights, and keep a lone measure locked at 100%. */
  useEffect(() => {
    const current = goalRef.current.measurements
    if (current.length === 0) return
    const allocated = sumMeasurementWeights(current)
    const locked = lockSoloMeasurementWeights(current)
    if (locked !== current) {
      onChangeRef.current({
        ...goalRef.current,
        measurements: locked,
      })
      return
    }
    if (allocated > 0) return
    onChangeRef.current({
      ...goalRef.current,
      measurements: rebalanceMeasurementWeights(current),
    })
  }, [goal.id])

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

  const panelCount = measurementPanels(measurements).length
  const canEditMeasureWeight = canEditMeasurementWeights(measurements)
  const canDistribute =
    panelCount > 1 && !isEvenMeasurementSplit(measurements)
  const showWeightFooter =
    panelCount > 0 && (measureWeight !== 100 || canDistribute)

  return (
    <section
      className="pd-goal-create__progress"
      aria-label="Progress metrics"
    >
      <div className="pd-goal-create__progress-head">
        <h2>
          <BarChart3 size={16} strokeWidth={2.25} aria-hidden />
          Metrics
        </h2>
      </div>

      {panels.map((panel) =>
        panel.kind === 'metric' ? (
          <div key={panel.key} className="pd-goal-create__measure-block">
            <NumberMeasureEditCard
              metric={panel.metric}
              canEditWeight={canEditMeasureWeight}
              onChange={updateMeasurement}
              onRemove={() => removeMeasurement(panel.metric.id)}
              cycleLabel={cycleLabel}
              goalTitle={goal.description}
              onLogProgress={
                progressAuthor
                  ? (nextValue) => {
                      const current = currentMeasurements().find(
                        (item) => item.id === panel.metric.id,
                      )
                      if (!current || current.kind !== 'metric') return
                      updateMeasurement(
                        recordMetricProgress(
                          current,
                          nextValue,
                          progressAuthor,
                        ),
                      )
                    }
                  : undefined
              }
            />
          </div>
        ) : panel.kind === 'todo_measure' ? (
          <div key={panel.key} className="pd-goal-create__measure-block">
            <TodoMeasureEditCard
              panel={panel}
              measurements={measurements}
              canEditWeight={canEditMeasureWeight}
              measureTitle={readMeasureGroupTitle(measurements, panel.measureGroupId)}
              canRemoveList={panel.lists.length > 1}
              addListClassName="pd-goal-measure-card__add-list"
              addTodoClassName="pd-goal-measure-card__add-todo"
              onRemove={() =>
                setMeasurements(
                  removeTodoMeasure(currentMeasurements(), panel.measureGroupId),
                )
              }
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

      {panelCount === 0 ? (
        <GoalEmptyMeasures
          canAdd
          onAddMilestones={addMilestoneMeasure}
          onAddNumber={addMetric}
        />
      ) : (
        <MeasureTypeAddButtons
          onAddMilestone={addMilestoneMeasure}
          onAddNumber={addMetric}
        />
      )}

      {measureNameError ? (
        <p className="pd-goal-create__title-error" role="alert">
          {measureNameError}
        </p>
      ) : null}

      {measurementWeightError && panelCount > 0 ? (
        <p className="pd-goal-create__title-error" role="alert">
          {measurementWeightError}
        </p>
      ) : null}

      {showWeightFooter ? (
        <div className="pd-goal-create__weight-footer">
          <p className="pd-goal-create__weight-hint" role="status">
            {measureWeight !== 100
              ? `Weights total ${measureWeight}% of 100%.`
              : 'Weights do not split evenly.'}
          </p>
          {canDistribute ? (
            <button
              type="button"
              className="pd-goal-create__text-btn"
              onClick={distributeWeightsEvenly}
            >
              Distribute evenly
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
