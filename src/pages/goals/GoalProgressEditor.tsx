import { useEffect, useRef, useState } from 'react'
import { BarChart3, Scale } from 'lucide-react'
import {
  appendMilestoneList,
  appendMilestoneToList,
  appendTodoListToMeasure,
  blankMetric,
  canEditMeasurementWeights,
  hasMeasurePanelName,
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
  withMeasureProof,
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
  progressAuthor,
  cycleLabel,
  locked = false,
}: {
  goal: Goal
  onChange: (goal: Goal) => void
  progressAuthor?: ProgressLogAuthor
  cycleLabel?: string
  locked?: boolean
}) {
  const measureWeight = sumMeasurementWeights(goal.measurements)
  const measurements = goal.measurements
  const panels = measurementPanels(measurements)
  const goalRef = useRef(goal)
  const onChangeRef = useRef(onChange)
  goalRef.current = goal
  onChangeRef.current = onChange
  const [focusMilestoneId, setFocusMilestoneId] = useState<string | null>(null)
  const [pendingNameKeys, setPendingNameKeys] = useState(
    () =>
      new Set(
        measurementPanels(goal.measurements)
          .filter((panel) => !hasMeasurePanelName(panel))
          .map((panel) => panel.key),
      ),
  )

  const markNamed = (key: string) => {
    setPendingNameKeys((prev) => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const abandonPendingName = (key: string, remove: () => void) => {
    setPendingNameKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    remove()
  }

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

  useEffect(() => {
    setPendingNameKeys(
      new Set(
        measurementPanels(goalRef.current.measurements)
          .filter((panel) => !hasMeasurePanelName(panel))
          .map((panel) => panel.key),
      ),
    )
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

  const addMetric = () => {
    const next = blankMetric('increase')
    setPendingNameKeys((prev) => new Set(prev).add(next.id))
    setMeasurements([...currentMeasurements(), next])
  }

  const updateMeasurement = (next: Measurement) =>
    patch({
      measurements: currentMeasurements().map((item) =>
        item.id === next.id ? next : item,
      ),
    })

  const removeMeasurement = (id: string) =>
    setMeasurements(currentMeasurements().filter((item) => item.id !== id))

  const addMilestoneMeasure = () => {
    const current = currentMeasurements()
    const next = appendMilestoneList(current)
    const before = new Set(measurementPanels(current).map((panel) => panel.key))
    const added = measurementPanels(next).find((panel) => !before.has(panel.key))
    if (added) {
      setPendingNameKeys((prev) => new Set(prev).add(added.key))
    }
    setMeasurements(next)
  }

  const panelCount = measurementPanels(measurements).length
  const canEditMeasureWeight = canEditMeasurementWeights(measurements)
  const canDistribute =
    panelCount > 1 && !isEvenMeasurementSplit(measurements)
  const hasUnnamedPanel = panels.some((panel) => !hasMeasurePanelName(panel))
  const weightError =
    panelCount > 0 && !hasUnnamedPanel && measureWeight !== 100
  const canShowWeightRibbon = !hasUnnamedPanel && (weightError || canDistribute)
  const panelNameError = (named: boolean) =>
    named ? undefined : 'Each metric needs a name'

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
        {canShowWeightRibbon ? (
          <div
            className={
              weightError
                ? 'pd-goal-create__weight-ribbon pd-goal-create__weight-ribbon--error'
                : 'pd-goal-create__weight-ribbon'
            }
          >
            {weightError ? (
              <p className="pd-goal-create__weight-ribbon-copy" role="alert">
                <span className="pd-goal-create__weight-ribbon-total">
                  {measureWeight}%
                </span>
                Metric weights must total 100%
              </p>
            ) : null}
            {canDistribute ? (
              <button
                type="button"
                className="pd-goal-create__distribute"
                disabled={locked}
                onClick={distributeWeightsEvenly}
              >
                <Scale size={14} strokeWidth={2} aria-hidden />
                Distribute evenly
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {panels.map((panel) =>
        panel.kind === 'metric' ? (
          <div key={panel.key} className="pd-goal-create__measure-block">
            <NumberMeasureEditCard
              metric={panel.metric}
              locked={locked}
              canEditWeight={canEditMeasureWeight}
              nameError={panelNameError(hasMeasurePanelName(panel))}
              requestNameFocus={pendingNameKeys.has(panel.key)}
              onNameAbandon={
                pendingNameKeys.has(panel.key)
                  ? () =>
                      abandonPendingName(panel.key, () =>
                        removeMeasurement(panel.metric.id),
                      )
                  : undefined
              }
              onChange={(next) => {
                if (next.title.trim()) markNamed(panel.key)
                updateMeasurement(next)
              }}
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
              locked={locked}
              canEditWeight={canEditMeasureWeight}
              nameError={panelNameError(hasMeasurePanelName(panel))}
              requestNameFocus={pendingNameKeys.has(panel.key)}
              onNameAbandon={
                pendingNameKeys.has(panel.key)
                  ? () =>
                      abandonPendingName(panel.key, () =>
                        setMeasurements(
                          removeTodoMeasure(
                            currentMeasurements(),
                            panel.measureGroupId,
                          ),
                        ),
                      )
                  : undefined
              }
              measureTitle={readMeasureGroupTitle(measurements, panel.measureGroupId)}
              canRemoveList={panel.lists.length > 1}
              addListClassName="pd-goal-measure-card__add-list"
              addTodoClassName="pd-goal-measure-card__add-todo"
              onRemove={() =>
                setMeasurements(
                  removeTodoMeasure(currentMeasurements(), panel.measureGroupId),
                )
              }
              onChangeMeasureTitle={(measureTitle) => {
                if (measureTitle.trim()) markNamed(panel.key)
                patch({
                  measurements: withMeasureTitle(
                    currentMeasurements(),
                    panel.measureGroupId,
                    measureTitle,
                  ),
                })
              }}
              onChangeWeight={(weight) =>
                patch({
                  measurements: redistributeTodoMeasureWeight(
                    currentMeasurements(),
                    panel.measureGroupId,
                    weight,
                  ),
                })
              }
              onChangeProof={(next) =>
                patch({
                  measurements: withMeasureProof(
                    currentMeasurements(),
                    panel.measureGroupId,
                    next,
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
          disabled={locked}
          disabledTitle="Name the goal first"
          onAddMilestones={addMilestoneMeasure}
          onAddNumber={addMetric}
        />
      ) : (
        <MeasureTypeAddButtons
          disabled={locked || hasUnnamedPanel}
          disabledTitle={
            locked ? 'Name the goal first' : 'Name the metric first'
          }
          onAddMilestone={addMilestoneMeasure}
          onAddNumber={addMetric}
        />
      )}

    </section>
  )
}
