import { Minus, Plus } from 'lucide-react'
import type { Goal } from '@/lib/goals/types'
import {
  BufferedWeightInput,
  formatWeightReadout,
} from './GoalMeasurementReadout'

const WEIGHT_STEP = 5

type GoalSummaryCardsProps = {
  goal: Goal
  onWeightChange?: (weight: number) => void
}

function clampWeight(value: number) {
  return Math.min(100, Math.max(0, value))
}

export function GoalSummaryCards({
  goal,
  onWeightChange,
}: GoalSummaryCardsProps) {
  const stepWeight = (delta: number) => {
    if (!onWeightChange) return
    onWeightChange(clampWeight(goal.weight + delta))
  }

  return (
    <div className="pd-goal-view__weight-row">
      <p className="pd-goal-view__weight-label">Goal weight</p>
      {onWeightChange ? (
        <div className="pd-goal-view__weight-stepper">
          <button
            type="button"
            className="pd-goal-view__weight-step"
            aria-label="Decrease goal weight"
            disabled={goal.weight <= 0}
            onClick={() => stepWeight(-WEIGHT_STEP)}
          >
            <Minus size={14} strokeWidth={2.25} aria-hidden />
          </button>
          <div className="pd-goals-table__weight-edit">
            <BufferedWeightInput
              weight={goal.weight}
              ariaLabel="Goal weight"
              onChange={onWeightChange}
            />
            <span className="pd-goals-table__weight-suffix" aria-hidden>
              %
            </span>
          </div>
          <button
            type="button"
            className="pd-goal-view__weight-step"
            aria-label="Increase goal weight"
            disabled={goal.weight >= 100}
            onClick={() => stepWeight(WEIGHT_STEP)}
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      ) : (
        <span className="pd-goals-table__weight-pill">
          {formatWeightReadout(goal.weight)}
        </span>
      )}
    </div>
  )
}
