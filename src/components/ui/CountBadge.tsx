import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type CountBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  count: number
  /** `danger` is the sidebar notification. `theme` is brand. `muted` is quiet. */
  tone?: 'danger' | 'theme' | 'muted'
}

/** Numeric pill, shared by My Reports, the Goals sidebar item, and metric counts. */
export function CountBadge({
  count,
  tone = 'danger',
  className,
  ...props
}: CountBadgeProps) {
  if (count <= 0) return null
  return (
    <span
      className={cx(
        'pd-count-badge',
        tone === 'theme' && 'pd-count-badge--theme',
        tone === 'muted' && 'pd-count-badge--muted',
        className,
      )}
      {...props}
    >
      {count}
    </span>
  )
}
