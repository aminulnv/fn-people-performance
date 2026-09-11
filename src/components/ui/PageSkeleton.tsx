import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { Skeleton } from './Skeleton'

const ROW_WIDTHS = ['72%', '64%', '58%', '66%', '52%', '60%'] as const

export type PageSkeletonProps = HTMLAttributes<HTMLDivElement> & {
  pageClassName?: string
}

/** Generic page-shaped placeholder for route and data loading. */
export function PageSkeleton({
  className,
  pageClassName,
  ...props
}: PageSkeletonProps) {
  return (
    <div
      className={cx('pd-page', 'pd-page-skeleton', pageClassName, className)}
      aria-busy="true"
      {...props}
    >
      <div className="pd-page-skeleton__chrome">
        <Skeleton variant="title" width="28%" />
        <Skeleton variant="button" />
      </div>
      <div className="pd-page-skeleton__filters">
        <Skeleton className="pd-page-skeleton__chip" width="14rem" height="2.25rem" />
        <Skeleton className="pd-page-skeleton__chip" width="9rem" height="2.25rem" />
        <Skeleton className="pd-page-skeleton__chip" width="9rem" height="2.25rem" />
      </div>
      <div className="pd-page-skeleton__panel">
        {ROW_WIDTHS.map((width) => (
          <div key={width} className="pd-page-skeleton__row">
            <Skeleton variant="avatar" />
            <Skeleton variant="text" width={width} />
            <Skeleton variant="text" width="4.5rem" />
          </div>
        ))}
      </div>
    </div>
  )
}
