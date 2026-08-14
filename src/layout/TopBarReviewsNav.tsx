import { NavLink } from 'react-router-dom'
import { REVIEW_TABS } from '@/lib/reviews/tabs'

export function TopBarReviewsNav() {
  return (
    <nav className="pd-topbar__reviews-nav" aria-label="Reviews sections">
      {REVIEW_TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={`/reviews/${tab.id}`}
          className={({ isActive }) =>
            [
              'pd-topbar__reviews-link',
              isActive ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
