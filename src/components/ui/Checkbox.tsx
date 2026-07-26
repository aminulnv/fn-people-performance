import { useId, type InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label: string
}

export function Checkbox({
  label,
  id,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <label
      className={cx(
        'pd-check',
        disabled && 'is-disabled',
        className,
      )}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="checkbox"
        className="pd-check__input"
        disabled={disabled}
        {...props}
      />
      <span className="pd-check__box" aria-hidden />
      <span className="pd-check__label">{label}</span>
    </label>
  )
}
