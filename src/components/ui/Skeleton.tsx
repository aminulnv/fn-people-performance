import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'text' | 'title' | 'avatar' | 'button' | 'rect'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cx('pd-skeleton', `pd-skeleton--${variant}`, className)}
      style={{
        width: width ?? undefined,
        height: height ?? undefined,
        ...style,
      }}
      aria-hidden
      {...props}
    />
  )
}
