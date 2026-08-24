import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type BadgeVariant =
  | 'neutral'
  | 'draft'
  | 'completed'
  | 'pending'
  | 'in-progress'
  | 'on-hold'
  | 'danger'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
  children: ReactNode
}

export function Badge({
  variant = 'neutral',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cx('pd-badge', `pd-badge--${variant}`, className)}
      {...props}
    >
      {children}
    </span>
  )
}
