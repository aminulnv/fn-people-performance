import { ListTodo } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { MeasureTypeAddButtons } from '@/pages/goals/MeasureTypeSwitch'

export function GoalEmptyMeasures({
  canAdd = false,
  disabled = false,
  disabledTitle,
  onAddMilestones,
  onAddNumber,
}: {
  canAdd?: boolean
  disabled?: boolean
  disabledTitle?: string
  onAddMilestones?: () => void
  onAddNumber?: () => void
}) {
  return (
    <EmptyState
      className="pd-goal-view__empty-measures"
      icon={ListTodo}
      title="No Metrics Yet"
      description="Add a number or a milestone so progress on this goal can be tracked."
      action={
        canAdd && onAddMilestones && onAddNumber ? (
          <MeasureTypeAddButtons
            disabled={disabled}
            disabledTitle={disabledTitle}
            onAddMilestone={onAddMilestones}
            onAddNumber={onAddNumber}
          />
        ) : undefined
      }
    />
  )
}
