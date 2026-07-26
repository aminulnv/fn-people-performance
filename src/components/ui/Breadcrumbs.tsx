import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export type BreadcrumbsProps = {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items.length) return null

  return (
    <nav className={cx('pd-breadcrumbs', className)} aria-label="Breadcrumb">
      <ol className="pd-breadcrumbs__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? (
                <li className="pd-breadcrumbs__sep" aria-hidden>
                  <ChevronRight size={14} strokeWidth={2} />
                </li>
              ) : null}
              <li className="pd-breadcrumbs__item">
                {isLast || !item.href ? (
                  <span
                    className="pd-breadcrumbs__current"
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link className="pd-breadcrumbs__link" to={item.href}>
                    {item.label}
                  </Link>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
