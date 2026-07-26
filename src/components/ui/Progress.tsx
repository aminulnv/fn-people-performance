import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value: number
  max?: number
  label?: string
  showValue?: boolean
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  className,
  ...props
}: ProgressProps) {
  const safeMax = max <= 0 ? 100 : max
  const clamped = Math.min(safeMax, Math.max(0, value))
  const percent = Math.round((clamped / safeMax) * 100)

  return (
    <div className={cx('pd-progress', className)} {...props}>
      {label || showValue ? (
        <div className="pd-progress__meta">
          {label ? <span className="pd-progress__label">{label}</span> : null}
          {showValue ? (
            <span className="pd-progress__value">{percent}%</span>
          ) : null}
        </div>
      ) : null}
      <div
        className="pd-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        aria-label={label}
      >
        <div
          className="pd-progress__fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
