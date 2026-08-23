import type { Goal } from '@/lib/goals/types'
import { WeightHoverField, formatWeightReadout } from './GoalMeasurementReadout'

type GoalSummaryCardsProps = {
  goal: Goal
  onWeightChange?: (weight: number) => void
}

export function GoalSummaryCards({
  goal,
  onWeightChange,
}: GoalSummaryCardsProps) {
  return (
    <div className="pd-goal-view__weight-row">
      <p className="pd-goal-view__weight-label">Goal weight</p>
      {onWeightChange ? (
        <WeightHoverField
          weight={goal.weight}
          ariaLabel="Goal weight"
          onChange={onWeightChange}
        />
      ) : (
        <span className="pd-goals-table__weight-pill">
          {formatWeightReadout(goal.weight)}
        </span>
      )}
    </div>
  )
}
