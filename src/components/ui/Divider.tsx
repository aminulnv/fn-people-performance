import { cx } from '@/lib/cx'

export type DividerProps = {
  label?: string
  className?: string
}

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <hr className={cx('pd-divider', className)} />
  }

  return (
    <div
      className={cx('pd-divider', 'pd-divider--labeled', className)}
      role="separator"
      aria-label={label}
    >
      <span className="pd-divider__line" aria-hidden />
      <span className="pd-divider__label">{label}</span>
      <span className="pd-divider__line" aria-hidden />
    </div>
  )
}
