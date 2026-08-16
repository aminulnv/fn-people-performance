import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type CardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title?: ReactNode
  description?: string
  actions?: ReactNode
  children?: ReactNode
}

/**
 * Interactive / content group only — not decorative chrome.
 * Use when removing border/background would hurt understanding.
 */
export function Card({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <section className={cx('pd-card', className)} {...props}>
      {title || description || actions ? (
        <header className="pd-card__header">
          <div className="pd-card__text">
            {title ? <h3 className="pd-card__title">{title}</h3> : null}
            {description ? (
              <p className="pd-card__description">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="pd-card__actions">{actions}</div> : null}
        </header>
      ) : null}
      {children ? <div className="pd-card__body">{children}</div> : null}
    </section>
  )
}
