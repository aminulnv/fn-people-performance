import { Hash, ListTodo } from 'lucide-react'

export type MeasureMethod = 'number' | 'todo'

const MEASURE_ADD_OPTIONS: {
  id: MeasureMethod
  label: string
  hint: string
  icon: typeof Hash
}[] = [
  { id: 'todo', label: 'Milestone', hint: 'Track completion', icon: ListTodo },
  { id: 'number', label: 'Number', hint: 'Track a value', icon: Hash },
]

/** Large add cards — always unselected; each click creates a new measure. */
export function MeasureTypeAddButtons({
  onAddMilestone,
  onAddNumber,
}: {
  onAddMilestone: () => void
  onAddNumber: () => void
}) {
  return (
    <div
      className="pd-goal-create__methods pd-goal-create__measure-add"
      role="group"
      aria-label="Add measurement"
    >
      {MEASURE_ADD_OPTIONS.map(({ id, label, hint, icon: Icon }) => {
        const onClick = id === 'todo' ? onAddMilestone : onAddNumber
        return (
          <button
            key={id}
            type="button"
            className="pd-goal-create__method"
            aria-label={`Add ${label.toLowerCase()} measure`}
            onClick={onClick}
          >
            <span className="pd-goal-create__method-icon" aria-hidden>
              <Icon size={18} strokeWidth={2.25} />
            </span>
            <span className="pd-goal-create__method-copy">
              <span className="pd-goal-create__method-title">{label}</span>
              <span className="pd-goal-create__method-sub">{hint}</span>
            </span>
            <span className="pd-goal-create__method-mark" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
