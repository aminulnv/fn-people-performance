import { Badge } from '@/components/ui'
import { goalCompletion } from '@/lib/goalsApi'
import type { Goal } from '@/lib/goals/types'
import {
  formatWeightReadout,
  parseWeightInputValue,
  weightInputDisplayValue,
} from './GoalMeasurementReadout'

type GoalSummaryCardsProps = {
  goal: Goal
  cycleLabel: string
  isCurrentCycle?: boolean
  onWeightChange?: (weight: number) => void
}

export function GoalSummaryCards({
  goal,
  cycleLabel,
  isCurrentCycle = false,
  onWeightChange,
}: GoalSummaryCardsProps) {
  const completion = Math.round(goalCompletion(goal))

  return (
    <div
      className="pd-people__summary pd-goal-view__summary"
      role="group"
      aria-label="Goal summary"
    >
      <div className="pd-people__summary-card">
        <span className="pd-people__summary-label">Cycle</span>
        <span className="pd-people__summary-value pd-goal-view__cycle">
          {cycleLabel}
          {isCurrentCycle ? <Badge variant="completed">Current</Badge> : null}
        </span>
      </div>
      <div className="pd-people__summary-card">
        <span className="pd-people__summary-label">Goal weight</span>
        {onWeightChange ? (
          <label className="pd-people__summary-value pd-goal-view__weight-edit">
            <span className="pd-sr-only">Goal weight</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Goal weight"
              value={weightInputDisplayValue(goal.weight)}
              onChange={(event) => {
                onWeightChange(parseWeightInputValue(event.target.value))
              }}
            />
            <span aria-hidden>%</span>
          </label>
        ) : (
          <span className="pd-people__summary-value">
            {formatWeightReadout(goal.weight)}
          </span>
        )}
      </div>
      <div className="pd-people__summary-card">
        <span className="pd-people__summary-label">Completion</span>
        <span className="pd-people__summary-value">{completion}%</span>
      </div>
    </div>
  )
}
