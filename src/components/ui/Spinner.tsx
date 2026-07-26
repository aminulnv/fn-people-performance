import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function Spinner({
  size = 'md',
  label = 'Loading',
  className,
  ...props
}: SpinnerProps) {
  return (
    <span
      className={cx('pd-spinner', `pd-spinner--${size}`, className)}
      role="status"
      aria-label={label}
      {...props}
    >
      <span className="pd-spinner__ring" aria-hidden />
    </span>
  )
}
