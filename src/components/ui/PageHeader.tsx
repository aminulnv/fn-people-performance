import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cx('pd-page-header', className)} {...props}>
      <div className="pd-page-header__text">
        <h1 className="pd-page-header__title">{title}</h1>
        {description ? (
          <p className="pd-page-header__description">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="pd-page-header__actions">{actions}</div>
      ) : null}
    </header>
  )
}
