import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type FieldProps = HTMLAttributes<HTMLDivElement> & {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
}

/** Shared label / hint / error shell for custom controls. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  ...props
}: FieldProps) {
  return (
    <div className={cx('pd-field', error && 'pd-field--error', className)} {...props}>
      {label ? (
        <label className="pd-field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="pd-field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="pd-field__hint">{hint}</p>
      ) : null}
    </div>
  )
}
