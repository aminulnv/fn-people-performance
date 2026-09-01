import type { Goal } from '@/lib/goals/types'
import {
  WeightHoverField,
  weightInputDisplayValue,
} from './GoalMeasurementReadout'

type GoalSummaryCardsProps = {
  goal: Goal
  onWeightChange?: (weight: number) => void
}

export function GoalSummaryCards({
  goal,
  onWeightChange,
}: GoalSummaryCardsProps) {
  const weightDisplay = weightInputDisplayValue(goal.weight)

  return (
    <div className="pd-goal-view__weight-row">
      <p className="pd-goal-view__weight-label">Goal Weight %</p>
      {onWeightChange ? (
        <WeightHoverField
          weight={goal.weight}
          ariaLabel="Goal Weight %"
          showSuffix={false}
          onChange={onWeightChange}
        />
      ) : (
        <span
          className="pd-goals-table__weight-pill"
          aria-label={weightDisplay ? undefined : 'Weight not set'}
        >
          {weightDisplay}
        </span>
      )}
    </div>
  )
}
