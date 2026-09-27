import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HomeAbsence } from '@/lib/home/homeOrientation'
import { cyclesListPath, cycleDetailPath } from '@/lib/reviews/paths'

type HomeAbsencePanelProps = {
  absence: HomeAbsence
  canManageCycles: boolean
}

/** Left-rail explanation when Home has no cycle rhythm for this person. */
export function HomeAbsencePanel({
  absence,
  canManageCycles,
}: HomeAbsencePanelProps) {
  return (
    <section className="pd-home-orientation" aria-label={absence.title}>
      <div className="pd-home-orientation__hero">
        {absence.cycleLabel ? (
          <div className="pd-home-orientation__cycle-row">
            <span className="pd-home-orientation__cycle-pill">
              {absence.cycleLabel}
            </span>
          </div>
        ) : null}
        <h2 className="pd-home-orientation__title">{absence.title}</h2>
        <p className="pd-home-orientation__clear">{absence.description}</p>
      </div>
      {canManageCycles && absence.kind === 'not_in_cycle' ? (
        <div className="pd-home-orientation__cards">
          <Link
            to={
              absence.cycleId
                ? cycleDetailPath(absence.cycleId)
                : cyclesListPath()
            }
            className="pd-home-orientation__card pd-home-orientation__card--milestone"
          >
            <div className="pd-home-orientation__card-top">
              <span className="pd-home-orientation__card-label">Next step</span>
            </div>
            <span className="pd-home-orientation__card-title">
              Open cycle settings
            </span>
            <span className="pd-home-orientation__card-meta">
              Add this person to a cycle group
            </span>
            <span className="pd-home-orientation__card-go" aria-hidden>
              <ArrowUpRight size={16} strokeWidth={2} />
            </span>
          </Link>
        </div>
      ) : null}
    </section>
  )
}
