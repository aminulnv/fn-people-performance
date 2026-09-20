import { NavLink } from 'react-router-dom'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { reviewsTabPath, type ReviewsTabId } from '@/lib/reviews/paths'
import { useAuth } from '@/lib/useAuth'

const TABS: Array<{ id: ReviewsTabId; label: string }> = [
  { id: 'scorecards', label: 'Scorecards' },
  { id: 'scorecards-library', label: 'Scorecards Library' },
  { id: 'skills', label: 'Skills' },
  { id: 'values', label: 'Values' },
]

export function ReviewsTabs({ current }: { current?: ReviewsTabId }) {
  const { user } = useAuth()
  const canEditForms = hasSystemPermission(
    user?.permissions,
    'platform.write_all',
  )
  const tabs = canEditForms
    ? TABS
    : TABS.filter((tab) => tab.id !== 'scorecards-library')

  return (
    <nav className="pd-topbar__reviews-nav" aria-label="Reviews sections">
      {tabs.map((tab) => (
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
