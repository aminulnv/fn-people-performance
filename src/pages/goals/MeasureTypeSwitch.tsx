import { Hash, ListTodo } from 'lucide-react'

export type MeasureMethod = 'number' | 'todo'

const MEASURE_ADD_OPTIONS: {
  id: MeasureMethod
  label: string
  icon: typeof Hash
}[] = [
  {
    id: 'todo',
    label: 'Milestone',
    icon: ListTodo,
  },
  {
    id: 'number',
    label: 'Number',
    icon: Hash,
  },
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

/** Pill actions that create a milestone or number metric. */
export function MeasureTypeAddButtons({
  onAddMilestone,
  onAddNumber,
}: {
  onAddMilestone: () => void
  onAddNumber: () => void
}) {
  return (
    <section
      className="pd-goal-create__measure-add"
      role="group"
      aria-label="Add metrics"
    >
      <button
        type="button"
        className="pd-people__ghost-btn pd-people__ghost-btn--primary"
        onClick={onAddMilestone}
      >
        <ListTodo size={16} strokeWidth={1.75} aria-hidden />
        Add milestones
      </button>
      <button
        type="button"
        className="pd-people__ghost-btn pd-people__ghost-btn--primary"
        onClick={onAddNumber}
      >
        <Hash size={16} strokeWidth={1.75} aria-hidden />
        Add number
      </button>
    </section>
  )
}
