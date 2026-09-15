import { NavLink } from 'react-router-dom'
import { reviewsTabPath } from '@/lib/reviews/paths'

const TABS = [
  { id: 'scorecards' as const, label: 'Scorecards' },
  { id: 'skills' as const, label: 'Skills' },
]

export function ReviewsTabs({ current }: { current: 'scorecards' | 'skills' }) {
  return (
    <nav className="pd-reviews-tabs" aria-label="Reviews sections">
      <div className="pd-reviews-tabs__list">
        {TABS.map((tab) => (
          <NavLink
            key={tab.id}
            to={reviewsTabPath(tab.id)}
            className={({ isActive }) =>
              [
                'pd-reviews-tabs__link',
                isActive || current === tab.id ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')
            }
            end
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
