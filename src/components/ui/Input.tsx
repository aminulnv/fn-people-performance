import { useId, type InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { DateInputControl } from './DateInputControl'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  /** `notch` sits the label in a gap on the field border. */
  labelPlacement?: 'above' | 'notch'
}

export function Input({
  label,
  hint,
  error,
  id,
  className,
  disabled,
  type,
  labelPlacement = 'above',
  ...props
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const labelId = `${inputId}-label`
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined
  const notched = labelPlacement === 'notch' && Boolean(label)
  const controlProps = {
    id: inputId,
    className: 'pd-field__control',
    disabled,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-labelledby': notched ? labelId : undefined,
    ...props,
  }
  const control =
    type === 'date' ? (
      <DateInputControl {...controlProps} />
    ) : (
      <input type={type} {...controlProps} />
    )
  const message = error ? (
    <p id={errorId} className="pd-field__error" role="alert">
      {error}
    </p>
  ) : hint ? (
    <p id={hintId} className="pd-field__hint">
      {hint}
    </p>
  ) : null

  if (notched) {
    return (
      <div
        className={cx(
          'pd-field',
          'pd-field--notch',
          error && 'pd-field--error',
          className,
        )}
      >
        <label id={labelId} className="pd-field__label" htmlFor={inputId}>
          {label}
        </label>
        {control}
        {message}
      </div>
    )
  }

  return (
    <div className={cx('pd-field', error && 'pd-field--error', className)}>
      {label ? (
        <label className="pd-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      {control}
      {message}
    </div>
  )
}
