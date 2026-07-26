import { Button, type ButtonProps } from './Button'
import { cx } from '@/lib/cx'

export type LoadMoreProps = Omit<ButtonProps, 'children' | 'loading'> & {
  loading?: boolean
  hasMore?: boolean
  label?: string
  loadingLabel?: string
  endLabel?: string
}

export function LoadMore({
  loading = false,
  hasMore = true,
  label = 'Load more',
  loadingLabel = 'Loading…',
  endLabel = 'You’re all caught up',
  className,
  disabled,
  ...props
}: LoadMoreProps) {
  if (!hasMore) {
    return <p className={cx('pd-load-more__end', className)}>{endLabel}</p>
  }

  return (
    <div className={cx('pd-load-more', className)}>
      <Button
        variant="secondary"
        loading={loading}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? loadingLabel : label}
      </Button>
    </div>
  )
}
