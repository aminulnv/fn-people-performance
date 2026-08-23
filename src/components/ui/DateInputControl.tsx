import { useState, type InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { formatInputDate } from '@/lib/dates/inputDate'

export type DateInputControlProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
>

function isoFrom(value: InputHTMLAttributes<HTMLInputElement>['value']): string {
  return typeof value === 'string' ? value : ''
}

/** Native date field that keeps ISO values and shows DD-MMM-YYYY. */
export function DateInputControl({
  className,
  value,
  defaultValue,
  onChange,
  ...props
}: DateInputControlProps) {
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(isoFrom(defaultValue))
  const iso = isControlled ? isoFrom(value) : uncontrolled
  const display = formatInputDate(iso)

  return (
    <span className="pd-date-input">
      <input
        type="date"
        className={cx('pd-date-input__native', className)}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          if (!isControlled) setUncontrolled(event.target.value)
          onChange?.(event)
        }}
        {...props}
      />
      <span
        className={cx('pd-date-input__display', className)}
        aria-hidden="true"
        data-empty={!display || undefined}
      >
        {display || 'DD-MMM-YYYY'}
      </span>
    </span>
  )
}
