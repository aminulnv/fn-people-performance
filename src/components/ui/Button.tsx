import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { cx } from '@/lib/cx'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Fully rounded ends — matches People/Org action chrome. */
  pill?: boolean
  loading?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      pill = false,
      loading = false,
      disabled,
      className,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          'pd-btn',
          `pd-btn--${variant}`,
          `pd-btn--${size}`,
          pill && 'pd-btn--pill',
          loading && 'is-loading',
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <span className="pd-btn__spinner" aria-hidden /> : null}
        <span className="pd-btn__label">{children}</span>
      </button>
    )
  },
)
