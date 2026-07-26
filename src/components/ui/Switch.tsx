import { useId, type InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'role'
> & {
  label: string
}

export function Switch({
  label,
  id,
  className,
  disabled,
  ...props
}: SwitchProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <label
      className={cx(
        'pd-switch',
        disabled && 'is-disabled',
        className,
      )}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className="pd-switch__input"
        disabled={disabled}
        {...props}
      />
      <span className="pd-switch__track" aria-hidden>
        <span className="pd-switch__thumb" />
      </span>
      <span className="pd-switch__label">{label}</span>
    </label>
  )
}
