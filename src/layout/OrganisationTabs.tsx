import { NavLink } from 'react-router-dom'
import {
  organisationTabPath,
  type OrganisationTabId,
} from '@/lib/organisation/paths'

const TABS: Array<{ id: OrganisationTabId; label: string }> = [
  { id: 'departments', label: 'Departments' },
  { id: 'teams', label: 'Teams' },
  { id: 'roles', label: 'Roles' },
]

export function OrganisationTabs({ current }: { current?: OrganisationTabId }) {
  return (
    <nav className="pd-topbar__reviews-nav" aria-label="Organisation sections">
      {TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={organisationTabPath(tab.id)}
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
