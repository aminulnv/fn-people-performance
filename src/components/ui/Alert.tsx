import type { HTMLAttributes, ReactNode } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  X,
} from 'lucide-react'
import { cx } from '@/lib/cx'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  /** When set, shows a dismiss control. */
  onClose?: () => void
}

const ICONS = {
  info: MessageCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
} as const

export function Alert({
  variant = 'info',
  title,
  className,
  children,
  onClose,
  ...props
}: AlertProps) {
  const Icon = ICONS[variant]

  return (
    <div
      className={cx('pd-alert', `pd-alert--${variant}`, className)}
      role={variant === 'error' ? 'alert' : 'status'}
      {...props}
    >
      <span className="pd-alert__glow" aria-hidden />
      <span className="pd-alert__icon-wrap" aria-hidden>
        <Icon className="pd-alert__icon" size={14} strokeWidth={2} />
      </span>
      <div className="pd-alert__content">
        {title ? <p className="pd-alert__title">{title}</p> : null}
        <div className="pd-alert__body">{children}</div>
      </div>
      {onClose ? (
        <button
          type="button"
          className="pd-alert__close"
          onClick={onClose}
          aria-label="Dismiss"
        >
          <X size={14} strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
