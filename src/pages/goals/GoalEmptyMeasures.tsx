import { ListTodo } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { MeasureTypeAddButtons } from '@/pages/goals/MeasureTypeSwitch'

export function GoalEmptyMeasures({
  canAdd = false,
  onAddMilestones,
  onAddNumber,
}: {
  canAdd?: boolean
  onAddMilestones?: () => void
  onAddNumber?: () => void
}) {
  return (
    <EmptyState
      className="pd-goal-view__empty-measures"
      icon={ListTodo}
      title="No metrics yet"
      description="Add a number or a milestone so progress on this goal can be tracked."
      action={
        canAdd && onAddMilestones && onAddNumber ? (
          <MeasureTypeAddButtons
            onAddMilestone={onAddMilestones}
            onAddNumber={onAddNumber}
          />
        ) : undefined
      }
    />
  )
}
