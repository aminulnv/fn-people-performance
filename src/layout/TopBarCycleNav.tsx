import { NavLink, useParams } from 'react-router-dom'
import { Hourglass, Lock, Settings } from 'lucide-react'
import { CYCLE_SECTIONS } from '@/lib/reviews/cycleSections'
import { cycleDetailPath } from '@/lib/reviews/paths'
import type { CycleSectionId } from '@/lib/reviews/types'

function sectionIcon(id: CycleSectionId) {
  if (id === 'settings') return Settings
  if (id === 'results') return Lock
  return Hourglass
}

export function TopBarCycleNav() {
  const { cycleId = '' } = useParams()

  if (!cycleId) return null

  return (
    <nav className="pd-topbar__reviews-nav" aria-label="Cycle sections">
      {CYCLE_SECTIONS.map((section) => {
        const Icon = sectionIcon(section.id)
        return (
          <NavLink
            key={section.id}
            to={cycleDetailPath(cycleId, section.id)}
            className={({ isActive }) =>
              [
                'pd-topbar__reviews-link',
                'pd-topbar__reviews-link--cycle',
                isActive ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')
            }
          >
            <Icon size={14} strokeWidth={2} aria-hidden />
            {section.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
