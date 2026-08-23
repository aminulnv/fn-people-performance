import { Hash, ListTodo } from 'lucide-react'
import { cx } from '@/lib/cx'

export function MeasureKindIcon({
  kind,
  className,
}: {
  kind: 'metric' | 'milestone'
  className?: string
}) {
  const label = kind === 'metric' ? 'Metric' : 'Milestone'
  const Icon = kind === 'metric' ? Hash : ListTodo
  return (
    <span
      className={cx('pd-goals-table__measure-icon', className)}
      role="img"
      aria-label={label}
    >
      <Icon size={13} strokeWidth={2.25} aria-hidden />
    </span>
  )
}
