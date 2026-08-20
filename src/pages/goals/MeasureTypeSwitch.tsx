import { Hash, ListTodo, Plus } from 'lucide-react'

export type MeasureMethod = 'number' | 'todo'

const MEASURE_ADD_OPTIONS: {
  id: MeasureMethod
  label: string
  icon: typeof Hash
}[] = [
  { id: 'todo', label: 'Milestone', icon: ListTodo },
  { id: 'number', label: 'Number', icon: Hash },
]

export function MeasureTypeIcon({ kind }: { kind: MeasureMethod }) {
  const option = MEASURE_ADD_OPTIONS.find((item) => item.id === kind)
  if (!option) return null
  const Icon = option.icon

  return (
    <span className="pd-goal-measure-card__type" role="img" aria-label={option.label}>
      <Icon size={16} strokeWidth={2.25} aria-hidden />
    </span>
  )
}

/** Quiet add actions — each click creates a new measure. */
export function MeasureTypeAddButtons({
  onAddMilestone,
  onAddNumber,
}: {
  onAddMilestone: () => void
  onAddNumber: () => void
}) {
  return (
    <div
      className="pd-goal-create__measure-add"
      role="group"
      aria-label="Add measurement"
    >
      {MEASURE_ADD_OPTIONS.map(({ id, label }) => {
        const onClick = id === 'todo' ? onAddMilestone : onAddNumber
        return (
          <button
            key={id}
            type="button"
            className="pd-people__ghost-btn pd-goal-create__add-measure"
            aria-label={`Add ${label.toLowerCase()} measure`}
            onClick={onClick}
          >
            <Plus size={16} strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
