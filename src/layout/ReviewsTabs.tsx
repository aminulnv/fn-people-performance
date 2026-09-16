import { NavLink } from 'react-router-dom'
import { reviewsTabPath, type ReviewsTabId } from '@/lib/reviews/paths'

const TABS: Array<{ id: ReviewsTabId; label: string }> = [
  { id: 'scorecards', label: 'Scorecards' },
  { id: 'skills', label: 'Skills' },
  { id: 'values', label: 'Values' },
]

export function ReviewsTabs({ current }: { current?: ReviewsTabId }) {
  return (
    <nav className="pd-topbar__reviews-nav" aria-label="Reviews sections">
      {TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={reviewsTabPath(tab.id)}
          className={({ isActive }) =>
            [
              'pd-topbar__reviews-link',
              isActive || current === tab.id ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')
          }
          end
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
