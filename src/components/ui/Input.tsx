import { useId, type InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { DateInputControl } from './DateInputControl'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
}

export function Input({
  label,
  hint,
  error,
  id,
  className,
  disabled,
  type,
  ...props
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined
  const controlProps = {
    id: inputId,
    className: 'pd-field__control',
    disabled,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    ...props,
  }

  return (
    <div className={cx('pd-field', error && 'pd-field--error', className)}>
      {label ? (
        <label className="pd-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      {type === 'date' ? (
        <DateInputControl {...controlProps} />
      ) : (
        <input type={type} {...controlProps} />
      )}
      {error ? (
        <p id={errorId} className="pd-field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="pd-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
