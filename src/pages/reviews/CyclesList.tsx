import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
} from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { formatDateRange } from '@/lib/reviews/periods'
import { cycleDetailPath } from '@/lib/reviews/paths'
import { sortCyclesForList } from '@/lib/reviews/store'
import {
  cycleStatusLabel,
  resolveCycleStatus,
} from '@/lib/reviews/status'
import type { ReviewCycle } from '@/lib/reviews/types'
import { useReviewsSnapshot } from '@/lib/reviews/useReviews'
import { AddReviewCycleModal } from './AddReviewCycleModal'

export function CyclesList() {
  const navigate = useNavigate()
  const { cycles } = useReviewsSnapshot()
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const existingPeriodKeys = useMemo(
    () =>
      new Set(
        cycles
          .filter((c) => c.type === 'regular' && c.periodKey)
          .map((c) => c.periodKey as string),
      ),
    [cycles],
  )

  const sorted = useMemo(
    () =>
      sortCyclesForList(cycles, (cycle) => resolveCycleStatus(cycle)),
    [cycles],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((cycle) => {
      const status = cycleStatusLabel(resolveCycleStatus(cycle))
      const haystack = [
        cycle.name,
        cycle.type,
        status,
        formatDateRange(cycle.startDate, cycle.endDate),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [query, sorted])

  return (
    <div className="pd-reviews-cycles">
      <div className="pd-people__header pd-people__header--bar">
        <div className="pd-people__bar-start">
          <label className="pd-people__search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <span className="pd-sr-only">Search cycles</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cycles…"
              className="pd-people__search-input"
            />
          </label>
        </div>

        <div className="pd-people__toolbar">
          <button
            type="button"
            className="pd-people__icon-btn"
            aria-label="More actions"
            title="More actions"
          >
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="pd-people__ghost-btn"
            title="Cycle list settings"
          >
            <Settings size={16} strokeWidth={1.75} aria-hidden />
            Settings
          </button>
          <button
            type="button"
            className="pd-people__create-btn"
            onClick={() => setAddOpen(true)}
          >
            <Plus size={18} strokeWidth={2} aria-hidden />
            Add Review Cycle
          </button>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="reviews-cycles-heading"
      >
        <h2 id="reviews-cycles-heading" className="pd-sr-only">
          Review cycles
        </h2>

        {filtered.length === 0 ? (
          <div className="pd-people__empty-state">
            <EmptyState
              className="pd-empty--inline"
              icon={CalendarDays}
              title={cycles.length === 0 ? 'No review cycles yet' : 'No matches'}
              description={
                cycles.length === 0
                  ? 'Create a regular or ad-hoc cycle to start performance reviews.'
                  : 'Try a different search, or clear the filter.'
              }
              action={
                cycles.length === 0 ? (
                  <button
                    type="button"
                    className="pd-people__create-btn"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus size={18} strokeWidth={2} aria-hidden />
                    Add Review Cycle
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="pd-people__table-wrap">
            <table className="pd-people__table pd-reviews-cycles__table">
              <thead>
                <tr>
                  <th>
                    <span className="pd-people__th">
                      Cycle name
                      <span className="pd-people__th-count">
                        {filtered.length}
                      </span>
                    </span>
                  </th>
                  <th>Cycle type</th>
                  <th>Timeframe</th>
                  <th>
                    <span className="pd-sr-only">Status</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cycle) => (
                  <CycleRow key={cycle.id} cycle={cycle} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AddReviewCycleModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingPeriodKeys={existingPeriodKeys}
        onCreated={(cycle) => {
          setAddOpen(false)
          navigate(cycleDetailPath(cycle.id, 'settings'))
        }}
      />
    </div>
  )
}

function CycleRow({ cycle }: { cycle: ReviewCycle }) {
  const status = resolveCycleStatus(cycle)
  const Icon = cycle.type === 'ad-hoc' ? Building2 : CalendarDays

  return (
    <tr>
      <td>
        <Link
          to={cycleDetailPath(cycle.id, 'settings')}
          className="pd-reviews-cycle-link"
        >
          <span className="pd-reviews-cycle-link__icon" aria-hidden>
            <Icon size={16} strokeWidth={1.75} />
          </span>
          <span className="pd-reviews-cycle-link__name">{cycle.name}</span>
        </Link>
      </td>
      <td className="pd-reviews-cycles__muted">
        {cycle.type === 'regular' ? 'Regular' : 'Ad-hoc'}
      </td>
      <td className="pd-reviews-cycles__muted">
        {formatDateRange(cycle.startDate, cycle.endDate)}
      </td>
      <td className="pd-reviews-cycles__status">
        <span
          className={`pd-reviews-status pd-reviews-status--${status}`}
        >
          {cycleStatusLabel(status)}
        </span>
      </td>
    </tr>
  )
}
