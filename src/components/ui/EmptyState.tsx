import type { HTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cx('pd-empty', className)} {...props}>
      {Icon ? (
        <div className="pd-empty__icon" aria-hidden>
          <Icon size={28} strokeWidth={1.75} />
        </div>
      ) : null}
      <h2 className="pd-empty__title">{title}</h2>
      {description ? (
        <p className="pd-empty__description">{description}</p>
      ) : null}
      {action ? <div className="pd-empty__action">{action}</div> : null}
    </div>
  )
}
