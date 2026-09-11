import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Info,
  SearchX,
  ShieldOff,
  type LucideIcon,
} from 'lucide-react'
import { Button } from './Button'
import { cx } from '@/lib/cx'
import { PageSkeleton } from './PageSkeleton'

export type PageStatusVariant =
  | 'forbidden'
  | 'not-found'
  | 'error'
  | 'loading'
  | 'info'

type VariantConfig = {
  icon: LucideIcon
  defaultTitle: string
}

const VARIANTS: Record<Exclude<PageStatusVariant, 'loading'>, VariantConfig> = {
  forbidden: {
    icon: ShieldOff,
    defaultTitle: 'Access restricted',
  },
  'not-found': {
    icon: SearchX,
    defaultTitle: 'Not found',
  },
  error: {
    icon: AlertCircle,
    defaultTitle: 'Something went wrong',
  },
  info: {
    icon: Info,
    defaultTitle: 'Unavailable',
  },
}

export type PageStatusProps = HTMLAttributes<HTMLDivElement> & {
  variant: PageStatusVariant
  title?: string
  description?: string
  action?: ReactNode
  pageClassName?: string
}

export function PageStatus({
  variant,
  title,
  description,
  action,
  pageClassName,
  className,
  ...props
}: PageStatusProps) {
  if (variant === 'loading') {
    const label =
      (typeof props['aria-label'] === 'string' && props['aria-label']) ||
      description ||
      title ||
      'Loading'
    return (
      <PageSkeleton
        className={className}
        pageClassName={pageClassName}
        aria-label={label}
        {...props}
      />
    )
  }

  const { icon: Icon, defaultTitle } = VARIANTS[variant]
  const resolvedTitle = title ?? defaultTitle

  return (
    <div
      className={cx(
        'pd-page',
        'pd-page--status',
        pageClassName,
        className,
      )}
      {...props}
    >
      <div className="pd-page-status">
        <div
          className={cx(
            'pd-page-status__icon',
            `pd-page-status__icon--${variant}`,
          )}
          aria-hidden
        >
          <Icon size={28} strokeWidth={1.75} />
        </div>
        {resolvedTitle ? (
          <h1 className="pd-page-status__title">{resolvedTitle}</h1>
        ) : null}
        {description ? (
          <p className="pd-page-status__description">{description}</p>
        ) : null}
        {action ? <div className="pd-page-status__action">{action}</div> : null}
      </div>
    </div>
  )
}

export function PageStatusLink({
  to,
  label,
}: {
  to: string
  label: string
}) {
  return (
    <Link to={to} className="pd-btn pd-btn--secondary pd-btn--md pd-btn--pill">
      <span className="pd-btn__label">{label}</span>
    </Link>
  )
}

export function PageStatusRetry({
  label = 'Try again',
  onClick,
}: {
  label?: string
  onClick: () => void
}) {
  return (
    <Button variant="secondary" size="md" pill onClick={onClick}>
      {label}
    </Button>
  )
}
