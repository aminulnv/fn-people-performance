import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Award,
  ChevronDown,
  Columns3,
  Eye,
  EyeOff,
  MoreHorizontal,
  Search,
  Settings2,
} from 'lucide-react'
import { Avatar, EmptyState } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { avatarStyle } from '@/lib/employees/avatar'
import { useEmployees } from '@/lib/employees/useEmployees'
import {
  buildScorecardsForCycle,
  gradeLabel,
  SCORECARD_STATUS_LIST_LABEL,
  scorecardDetailPath,
  type ScorecardRow,
  type ScorecardStatus,
} from '@/lib/reviews/scorecards'
import { useReviewsSnapshot } from '@/lib/reviews/useReviews'

function PersonCell({
  name,
  to,
  avatarUrl,
}: {
  name: string
  to?: string
  avatarUrl?: string
}) {
  const label = to ? (
    <Link to={to} className="pd-people__person-link">
      {name}
    </Link>
  ) : (
    <span className="pd-people__person-name">{name}</span>
  )

  return (
    <div className="pd-people__person">
      <Avatar
        name={name}
        src={avatarUrl || undefined}
        size="sm"
        className="pd-people__avatar"
        style={avatarStyle(name)}
      />
      {label}
    </div>
  )
}

function statusClass(status: ScorecardStatus): string {
  switch (status) {
    case 'completed':
      return 'pd-reviews-score-status--completed'
    case 'in_progress':
      return 'pd-reviews-score-status--progress'
    case 'calibrating':
      return 'pd-reviews-score-status--calibrating'
    default:
      return 'pd-reviews-score-status--pending'
  }
}

type StatusFilter = 'all' | ScorecardStatus

export function ScorecardsList() {
  const { user } = useAuth()
  const { employees, loadState, loadError } = useEmployees()
  const { cycles } = useReviewsSnapshot()
  const [query, setQuery] = useState('')
  const [mineOnly, setMineOnly] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [cycleMenuOpen, setCycleMenuOpen] = useState(false)
  const cycleMenuRef = useRef<HTMLDivElement>(null)

  const cycleOptions = useMemo(() => {
    const fromStore = cycles
      .filter((cycle) => cycle.type === 'regular')
      .map((cycle) => ({
        key: cycle.periodKey ?? cycle.id,
        label: cycle.name,
      }))
    return fromStore.length > 0
      ? fromStore
      : [{ key: 'q3-2026', label: 'Q3 2026' }]
  }, [cycles])

  const [cycleKey, setCycleKey] = useState('q3-2026')

  useEffect(() => {
    if (cycleOptions.some((option) => option.key === cycleKey)) return
    setCycleKey(cycleOptions[0]?.key ?? 'q3-2026')
  }, [cycleKey, cycleOptions])

  useEffect(() => {
    if (!cycleMenuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (
        cycleMenuRef.current &&
        !cycleMenuRef.current.contains(event.target as Node)
      ) {
        setCycleMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [cycleMenuOpen])

  const activeCycleLabel =
    cycleOptions.find((c) => c.key === cycleKey)?.label ?? cycleKey

  const rows = useMemo(
    () => buildScorecardsForCycle(cycleKey, employees, user?.email),
    [cycleKey, employees, user?.email],
  )

  const hasMine = useMemo(() => rows.some((row) => row.isMine), [rows])

  const stats = useMemo(() => {
    let completed = 0
    let inProgress = 0
    let notStarted = 0
    let calibrating = 0
    for (const row of rows) {
      if (row.status === 'completed') completed += 1
      else if (row.status === 'in_progress') inProgress += 1
      else if (row.status === 'calibrating') calibrating += 1
      else notStarted += 1
    }
    return {
      total: rows.length,
      completed,
      inProgress,
      notStarted,
      calibrating,
    }
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (mineOnly && hasMine && !row.isMine) return false
      if (!q) return true
      const haystack = [
        row.employeeName,
        row.reviewerName,
        row.role,
        row.seniority,
        row.team,
        row.department,
        row.reviewType,
        SCORECARD_STATUS_LIST_LABEL[row.status],
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [hasMine, mineOnly, query, rows, statusFilter])

  const [gradesRevealed, setGradesRevealed] = useState(false)
  const [gradeOverrides, setGradeOverrides] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    setGradesRevealed(false)
    setGradeOverrides({})
    setStatusFilter('all')
  }, [cycleKey])

  const isGradeRevealed = (row: ScorecardRow) => {
    if (!row.gradeHidden) return true
    return gradeOverrides[row.id] ?? gradesRevealed
  }

  const allGradesVisible =
    filtered.length > 0 && filtered.every((row) => isGradeRevealed(row))

  const toggleAllGrades = () => {
    const next = !allGradesVisible
    setGradesRevealed(next)
    setGradeOverrides({})
  }

  const toggleRowGrade = (rowId: string, currentlyRevealed: boolean) => {
    setGradeOverrides((prev) => ({
      ...prev,
      [rowId]: !currentlyRevealed,
    }))
  }

  return (
    <div className="pd-reviews-scorecards">
      <div
        className="pd-people__summary"
        role="group"
        aria-label="Scorecard totals"
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
          onClick={() => setStatusFilter('all')}
        >
          <span className="pd-people__summary-value">{stats.total}</span>
          <span className="pd-people__summary-label">Scorecards</span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'completed' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'completed'}
          onClick={() => setStatusFilter('completed')}
        >
          <span className="pd-people__summary-value">{stats.completed}</span>
          <span className="pd-people__summary-label">Completed</span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'in_progress' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'in_progress'}
          onClick={() => setStatusFilter('in_progress')}
        >
          <span className="pd-people__summary-value">{stats.inProgress}</span>
          <span className="pd-people__summary-label">In Progress</span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'not_started' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'not_started'}
          onClick={() => setStatusFilter('not_started')}
        >
          <span className="pd-people__summary-value">{stats.notStarted}</span>
          <span className="pd-people__summary-label">Not Started</span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'calibrating' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'calibrating'}
          onClick={() => setStatusFilter('calibrating')}
        >
          <span className="pd-people__summary-value">{stats.calibrating}</span>
          <span className="pd-people__summary-label">Calibrating</span>
        </button>
      </div>

      <div className="pd-people__header pd-people__header--bar">
        <div className="pd-people__bar-start">
          <label className="pd-people__search pd-reviews-scorecards__search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <span className="pd-sr-only">Search scorecards</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="pd-people__search-input"
            />
          </label>

          <div className="pd-reviews-scorecards__cycle" ref={cycleMenuRef}>
            <button
              type="button"
              className="pd-reviews-scorecards__cycle-btn"
              aria-haspopup="listbox"
              aria-expanded={cycleMenuOpen}
              onClick={() => setCycleMenuOpen((open) => !open)}
            >
              <span>{activeCycleLabel}</span>
              <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
            </button>
            {cycleMenuOpen ? (
              <div
                className="pd-reviews-scorecards__cycle-menu"
                role="listbox"
                aria-label="Scorecard cycle"
              >
                {cycleOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    role="option"
                    aria-selected={option.key === cycleKey}
                    className={[
                      'pd-reviews-scorecards__cycle-option',
                      option.key === cycleKey ? 'is-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      setCycleKey(option.key)
                      setCycleMenuOpen(false)
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className={[
              'pd-people__chip',
              mineOnly ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={mineOnly}
            onClick={() => setMineOnly((value) => !value)}
          >
            My Reviews
          </button>
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
            title="Column Settings"
          >
            <Columns3 size={16} strokeWidth={1.75} aria-hidden />
            Column Settings
          </button>
          <button type="button" className="pd-people__create-btn">
            <Settings2 size={16} strokeWidth={1.75} aria-hidden />
            Manage Scorecard
          </button>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="scorecards-heading"
      >
        <h2 id="scorecards-heading" className="pd-sr-only">
          Scorecards
        </h2>

        {loadState === 'loading' && employees.length === 0 ? (
          <p className="pd-people__empty">Loading scorecards…</p>
        ) : loadState === 'error' && employees.length === 0 ? (
          <p className="pd-people__empty">
            {loadError ?? 'Failed to load people for scorecards.'}
          </p>
        ) : filtered.length === 0 ? (
          <div className="pd-people__empty-state">
            <EmptyState
              className="pd-empty--inline"
              icon={Award}
              title={rows.length === 0 ? 'No scorecards yet' : 'No matches'}
              description={
                rows.length === 0
                  ? 'Add people in the directory to generate review scorecards for this cycle.'
                  : mineOnly && hasMine
                    ? 'No reviews assigned to you in this cycle. Turn off My Reviews to see everyone.'
                    : statusFilter !== 'all'
                      ? 'No scorecards match this status. Try another filter or clear it.'
                      : 'Try a different search or cycle.'
              }
            />
          </div>
        ) : (
          <div className="pd-people__table-wrap">
            <table className="pd-people__table pd-reviews-scorecards__table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Role</th>
                  <th>Seniority</th>
                  <th>Team</th>
                  <th>Department</th>
                  <th>Reviewer</th>
                  <th>
                    <span className="pd-people__th pd-reviews-scorecards__grade-th">
                      Grade
                      <button
                        type="button"
                        className="pd-reviews-scorecards__grade-toggle"
                        aria-label={
                          allGradesVisible ? 'Hide all grades' : 'Show all grades'
                        }
                        title={
                          allGradesVisible ? 'Hide all grades' : 'Show all grades'
                        }
                        aria-pressed={allGradesVisible}
                        onClick={toggleAllGrades}
                      >
                        {allGradesVisible ? (
                          <Eye size={14} strokeWidth={1.75} aria-hidden />
                        ) : (
                          <EyeOff size={14} strokeWidth={1.75} aria-hidden />
                        )}
                      </button>
                    </span>
                  </th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <ScorecardTableRow
                    key={row.id}
                    row={row}
                    gradeRevealed={isGradeRevealed(row)}
                    onToggleGrade={() =>
                      toggleRowGrade(row.id, isGradeRevealed(row))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function ScorecardTableRow({
  row,
  gradeRevealed,
  onToggleGrade,
}: {
  row: ScorecardRow
  gradeRevealed: boolean
  onToggleGrade: () => void
}) {
  const navigate = useNavigate()
  const to = scorecardDetailPath(row.cycleKey, row.employeeId)

  return (
    <tr
      className="pd-reviews-scorecards__row"
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
        <PersonCell
          name={row.employeeName}
          avatarUrl={row.employeeAvatarUrl}
          to={to}
        />
      </td>
      <td className="pd-reviews-scorecards__muted">{row.reviewType}</td>
      <td className="pd-reviews-scorecards__muted">{row.role}</td>
      <td>
        <span className="pd-reviews-seniority">{row.seniority}</span>
      </td>
      <td className="pd-reviews-scorecards__muted">{row.team}</td>
      <td className="pd-reviews-scorecards__muted">{row.department}</td>
      <td>
        <PersonCell
          name={row.reviewerName}
          avatarUrl={row.reviewerAvatarUrl}
          to={
            row.reviewerId != null ? `/people/${row.reviewerId}` : undefined
          }
        />
      </td>
      <td>
        {gradeRevealed ? (
          <span className="pd-reviews-scorecards__grade">
            <span className="pd-reviews-scorecards__grade-value">
              {row.grade ? gradeLabel(row.grade) : '—'}
            </span>
            {row.gradeHidden ? (
              <button
                type="button"
                className="pd-reviews-scorecards__grade-toggle"
                aria-label="Hide grade"
                title="Hide grade"
                onClick={onToggleGrade}
              >
                <Eye size={14} strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
          </span>
        ) : (
          <button
            type="button"
            className="pd-reviews-scorecards__grade-toggle"
            aria-label="Show grade"
            title="Show grade"
            onClick={onToggleGrade}
          >
            <EyeOff size={14} strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </td>
      <td>
        <span
          className={[
            'pd-reviews-score-status',
            statusClass(row.status),
          ].join(' ')}
        >
          {SCORECARD_STATUS_LIST_LABEL[row.status]}
        </span>
      </td>
    </tr>
  )
}
