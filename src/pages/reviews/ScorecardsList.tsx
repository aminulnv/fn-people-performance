import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Award,
  CircleCheck,
  CircleDashed,
  Clock3,
  Columns3,
  Eye,
  EyeOff,
  MoreHorizontal,
  Search,
  Settings2,
} from 'lucide-react'
import {
  Avatar,
  CycleSelect,
  EmptyState,
  ResizableTable,
  type CycleSelectOption,
  type ResizableColumn,
} from '@/components/ui'
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
import { cycleStatusLabel, resolveCycleStatus } from '@/lib/reviews/status'
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

  const cycleOptions = useMemo<CycleSelectOption[]>(() => {
    const fromStore = cycles
      .filter((cycle) => cycle.type === 'regular')
      .map((cycle) => {
        const status = resolveCycleStatus(cycle)
        return {
          id: cycle.id,
          label: cycle.name,
          status,
          statusLabel: cycleStatusLabel(status),
        }
      })
    return fromStore.length > 0
      ? fromStore
      : [{ id: 'q3-2026', label: 'Q3 2026' }]
  }, [cycles])

  const [cycleKey, setCycleKey] = useState('q3-2026')

  useEffect(() => {
    if (cycleOptions.some((option) => option.id === cycleKey)) return
    setCycleKey(cycleOptions[0]?.id ?? 'q3-2026')
  }, [cycleKey, cycleOptions])

  const rows = useMemo(
    () => buildScorecardsForCycle(cycleKey, employees, user?.email),
    [cycleKey, employees, user?.email],
  )

  const managerRows = useMemo(
    () => rows.filter((row) => row.isMine),
    [rows],
  )

  const hasDirectReports = managerRows.length > 0

  const queueRows = useMemo(
    () => (mineOnly ? managerRows : rows),
    [managerRows, mineOnly, rows],
  )

  const stats = useMemo(() => {
    let completed = 0
    let inProgress = 0
    let notStarted = 0
    for (const row of queueRows) {
      if (row.status === 'completed') completed += 1
      else if (row.status === 'in_progress') inProgress += 1
      else notStarted += 1
    }
    return {
      total: queueRows.length,
      completed,
      inProgress,
      notStarted,
    }
  }, [queueRows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return queueRows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!q) return true
      const haystack = [
        row.employeeName,
        row.reviewerName,
        row.role,
        row.seniority,
        row.team,
        row.department,
        SCORECARD_STATUS_LIST_LABEL[row.status],
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [query, queueRows, statusFilter])

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

  function toggleStatusFilter(next: StatusFilter) {
    setStatusFilter((current) => (current === next ? 'all' : next))
  }

  const scorecardColumns: ResizableColumn[] = [
    { id: 'employee', label: 'Employee', minWidth: 150 },
    { id: 'role', label: 'Role' },
    { id: 'seniority', label: 'Seniority' },
    { id: 'team', label: 'Team' },
    { id: 'department', label: 'Department' },
    { id: 'reviewer', label: 'Reviewer' },
    {
      id: 'grade',
      label: (
        <span className="pd-people__th pd-reviews-scorecards__grade-th">
          Grade
          <button
            type="button"
            className="pd-reviews-scorecards__grade-toggle"
            aria-label={
              allGradesVisible ? 'Hide all grades' : 'Show all grades'
            }
            title={allGradesVisible ? 'Hide all grades' : 'Show all grades'}
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
      ),
      name: 'Grade',
    },
    { id: 'status', label: 'Status' },
  ]

  const summaryItems: {
    id: StatusFilter
    label: string
    value: number
    icon: typeof Award
  }[] = [
    { id: 'all', label: 'Performance reviews', value: stats.total, icon: Award },
    {
      id: 'completed',
      label: 'Completed',
      value: stats.completed,
      icon: CircleCheck,
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      value: stats.inProgress,
      icon: Clock3,
    },
    {
      id: 'not_started',
      label: 'Not Started',
      value: stats.notStarted,
      icon: CircleDashed,
    },
  ]

  return (
    <div className="pd-reviews-scorecards">
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Performance review totals"
      >
        {summaryItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={[
                'pd-people__summary-btn',
                statusFilter === item.id ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={statusFilter === item.id}
              onClick={() => toggleStatusFilter(item.id)}
            >
              <span className="pd-people__summary-label">
                <Icon size={14} strokeWidth={1.75} aria-hidden />
                {item.label}
              </span>
              <span className="pd-people__summary-value">{item.value}</span>
            </button>
          )
        })}
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

          <CycleSelect
            label="Cycle"
            options={cycleOptions}
            value={cycleKey}
            onChange={setCycleKey}
          />

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
            My performance reviews
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
            Manage performance reviews
          </button>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="scorecards-heading"
      >
        <h2 id="scorecards-heading" className="pd-sr-only">
          Performance reviews
        </h2>

        {loadState === 'loading' && employees.length === 0 ? (
          <p className="pd-people__empty">Loading performance reviews…</p>
        ) : loadState === 'error' && employees.length === 0 ? (
          <p className="pd-people__empty">
            {loadError ?? 'Failed to load people for performance reviews.'}
          </p>
        ) : filtered.length === 0 ? (
          <div className="pd-people__empty-state">
            <EmptyState
              className="pd-empty--inline"
              icon={Award}
              title={queueRows.length === 0 ? 'No performance reviews yet' : 'No matches'}
              description={
                queueRows.length === 0
                  ? mineOnly
                    ? hasDirectReports
                      ? 'No direct reports match this cycle.'
                      : 'You have no direct reports to review for this cycle.'
                    : 'Add people in the directory to show performance reviews for this cycle.'
                  : statusFilter !== 'all'
                    ? 'No performance reviews match this status. Try another filter or clear it.'
                    : 'Try a different search or cycle.'
              }
            />
          </div>
        ) : (
          <div className="pd-people__table-wrap">
            <ResizableTable
              className="pd-people__table pd-reviews-scorecards__table"
              storageKey="reviews-scorecards-column-widths"
              columns={scorecardColumns}
            >
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
            </ResizableTable>
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
