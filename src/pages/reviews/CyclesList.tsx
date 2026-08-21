import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  CircleCheck,
  Clock3,
  History,
  Plus,
  Search,
} from 'lucide-react'
import {
  tableDensityWrapClass,
  TableDensityToggle,
} from '@/components/TableDensityToggle'
import {
  EmptyState,
  ResizableTable,
  type ResizableColumn,
} from '@/components/ui'
import { formatDateRange } from '@/lib/reviews/periods'
import { PURPOSE_LABEL } from '@/lib/reviews/purpose'
import { cycleDetailPath } from '@/lib/reviews/paths'
import { sortCyclesForList } from '@/lib/reviews/store'
import {
  cycleStatusLabel,
  resolveCycleStatus,
} from '@/lib/reviews/status'
import type { ReviewCycle, ReviewCycleStatus } from '@/lib/reviews/types'
import { useReviewsSnapshot } from '@/lib/reviews/useReviews'
import {
  readTableDensity,
  writeTableDensity,
  type TableDensity,
} from '@/pages/people/prefs'
import { AddReviewCycleModal } from './AddReviewCycleModal'

type CycleStatusFilter = 'all' | ReviewCycleStatus

export function CyclesList() {
  const navigate = useNavigate()
  const { cycles } = useReviewsSnapshot()
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<CycleStatusFilter | null>(
    null,
  )
  const [tableDensity, setTableDensityState] =
    useState<TableDensity>(readTableDensity)

  function setTableDensity(next: TableDensity) {
    setTableDensityState(next)
    writeTableDensity(next)
  }

  function toggleStatusFilter(next: CycleStatusFilter) {
    setStatusFilter((current) => (current === next ? null : next))
  }

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

  const stats = useMemo(() => {
    const statuses = sorted.map((cycle) => resolveCycleStatus(cycle))
    return {
      total: sorted.length,
      current: statuses.filter((status) => status === 'current').length,
      future: statuses.filter((status) => status === 'future').length,
      previous: statuses.filter((status) => status === 'previous').length,
      manual: statuses.filter((status) => status === 'manual').length,
    }
  }, [sorted])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted.filter((cycle) => {
      const status = resolveCycleStatus(cycle)
      if (statusFilter && statusFilter !== 'all' && status !== statusFilter) {
        return false
      }
      if (!q) return true
      const statusLabel = cycleStatusLabel(status)
      const haystack = [
        cycle.name,
        cycle.type,
        statusLabel,
        formatDateRange(cycle.startDate, cycle.endDate),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [query, sorted, statusFilter])

  const cycleColumns = useMemo<ResizableColumn[]>(
    () => [
      {
        id: 'cycle-name',
        label: (
          <span className="pd-people__th">
            Cycle name
            <span className="pd-people__th-count">{filtered.length}</span>
          </span>
        ),
        name: 'Cycle name',
        grow: true,
      },
      { id: 'purpose', label: 'Purpose' },
      { id: 'cycle-type', label: 'Kind' },
      { id: 'timeframe', label: 'Timeframe' },
      { id: 'status', label: 'Status' },
    ],
    [filtered.length],
  )

  return (
    <div className="pd-reviews-cycles">
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Cycle totals"
      >
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'all' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'all'}
          onClick={() => toggleStatusFilter('all')}
        >
          <span className="pd-people__summary-label">
            <CalendarDays size={14} strokeWidth={1.75} aria-hidden />
            Cycles
          </span>
          <span className="pd-people__summary-value">{stats.total}</span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'current' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'current'}
          onClick={() => toggleStatusFilter('current')}
        >
          <span className="pd-people__summary-label">
            <CircleCheck size={14} strokeWidth={1.75} aria-hidden />
            Current
          </span>
          <span className="pd-people__summary-value">{stats.current}</span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'future' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'future'}
          onClick={() => toggleStatusFilter('future')}
        >
          <span className="pd-people__summary-label">
            <Clock3 size={14} strokeWidth={1.75} aria-hidden />
            Future
          </span>
          <span className="pd-people__summary-value">{stats.future}</span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'previous' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'previous'}
          onClick={() => toggleStatusFilter('previous')}
        >
          <span className="pd-people__summary-label">
            <History size={14} strokeWidth={1.75} aria-hidden />
            Previous
          </span>
          <span className="pd-people__summary-value">{stats.previous}</span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'manual' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'manual'}
          onClick={() => toggleStatusFilter('manual')}
        >
          <span className="pd-people__summary-label">
            <Building2 size={14} strokeWidth={1.75} aria-hidden />
            Ad-hoc
          </span>
          <span className="pd-people__summary-value">{stats.manual}</span>
        </button>
      </div>

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

        <div className="pd-people__bar-end">
          {filtered.length !== sorted.length || statusFilter ? (
            <p className="pd-people__stat">{filtered.length} shown</p>
          ) : null}

          <div className="pd-people__toolbar">
            <TableDensityToggle
              className="pd-people__density"
              buttonClassName="pd-people__density-btn"
              value={tableDensity}
              onChange={setTableDensity}
            />
            <button
              type="button"
              className="pd-people__create-btn"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={18} strokeWidth={2} aria-hidden />
              Add Cycle
            </button>
          </div>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="reviews-cycles-heading"
      >
        <h2 id="reviews-cycles-heading" className="pd-sr-only">
          Cycles
        </h2>

        {filtered.length === 0 ? (
          <div className="pd-people__empty-state">
            <EmptyState
              className="pd-people__empty-panel"
              icon={CalendarDays}
              title={
                cycles.length === 0 ? 'No cycles yet' : 'No matches'
              }
              description={
                cycles.length === 0
                  ? 'Create a regular or ad-hoc cycle to start performance reviews.'
                  : query.trim()
                    ? `No cycles match “${query.trim()}” with the filters you have applied.`
                    : 'These filters exclude every cycle. Try clearing them to see the full list.'
              }
              action={
                cycles.length === 0 ? (
                  <button
                    type="button"
                    className="pd-people__create-btn"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus size={18} strokeWidth={2} aria-hidden />
                    Add Cycle
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pd-people__create-btn"
                    onClick={() => {
                      setQuery('')
                      setStatusFilter(null)
                    }}
                  >
                    Clear Filters
                  </button>
                )
              }
            />
          </div>
        ) : (
          <div className={tableDensityWrapClass(tableDensity)}>
            <ResizableTable
              className="pd-people__table pd-reviews-cycles__table"
              storageKey="reviews-cycles-column-widths"
              columns={cycleColumns}
            >
              <tbody>
                {filtered.map((cycle) => (
                  <CycleRow key={cycle.id} cycle={cycle} />
                ))}
              </tbody>
            </ResizableTable>
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
  const navigate = useNavigate()
  const status = resolveCycleStatus(cycle)
  const Icon = cycle.type === 'ad-hoc' ? Building2 : CalendarDays
  const to = cycleDetailPath(cycle.id, 'settings')

  return (
    <tr
      className="pd-people__row-link"
      tabIndex={0}
      onClick={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('a, button')) return
        navigate(to)
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        navigate(to)
      }}
    >
      <td>
        <Link to={to} className="pd-reviews-cycle-link">
          <span className="pd-reviews-cycle-link__icon" aria-hidden>
            <Icon size={16} strokeWidth={1.75} />
          </span>
          <span className="pd-reviews-cycle-link__name">{cycle.name}</span>
        </Link>
      </td>
      <td className="pd-reviews-cycles__muted">
        {PURPOSE_LABEL[cycle.purpose ?? 'quarterly_checkin']}
      </td>
      <td className="pd-reviews-cycles__muted">
        {cycle.type === 'regular' ? 'Scheduled' : 'Custom dates'}
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
