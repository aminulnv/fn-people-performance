import { NavLink } from 'react-router-dom'
import {
  calibrationTabPath,
  type CalibrationTabId,
} from '@/lib/calibration/paths'

const TABS: Array<{ id: CalibrationTabId; label: string }> = [
  { id: 'insights', label: 'Calibration Insights' },
  { id: 'ratings', label: 'Employee Rating Table' },
]

export function CalibrationTabs({ current }: { current?: CalibrationTabId }) {
  return (
    <nav className="pd-topbar__reviews-nav" aria-label="Calibration sections">
      {TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={calibrationTabPath(tab.id)}
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
