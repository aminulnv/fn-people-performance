import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Award,
  Briefcase,
  Building2,
  CalendarDays,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Clock3,
  Eye,
  EyeOff,
  Layers,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  AttributeFilters,
  Avatar,
  CycleSelect,
  EmptyState,
  ResizableTable,
  sanitizeCycleSelection,
  SegmentedControl,
  type CycleSelectOption,
  type ResizableColumn,
} from '@/components/ui'
import {
  matchesAttributeFilters,
  uniqueAttributeValues,
  uniqueLabeledAttributeValues,
  type AttributeFilterMap,
  type AttributeValue,
} from '@/lib/filters/attributeFilters'
import { useAuth } from '@/lib/auth'
import { viewerHasEffectiveReports } from '@/lib/delegations/roles'
import {
  useHydrateManagerDelegations,
  useManagerDelegationsRevision,
} from '@/lib/delegations/useManagerDelegations'
import { avatarStyle } from '@/lib/employees/avatar'
import { useEmployees } from '@/lib/employees/useEmployees'
import { fetchReviewPackets } from '@/lib/reviews/packetsApi'
import { useLiveTopic } from '@/lib/realtime/useLiveTopic'
import {
  defaultScorecardScope,
  hashForScorecardScope,
  resolveScorecardScope,
  scorecardMatchesScope,
  scorecardScopeFromHash,
  visibleScorecardScopes,
} from '@/lib/reviews/scorecardScope'
import {
  buildScorecardsForCycle,
  gradeLabel,
  SCORECARD_STATUS_LIST_LABEL,
  scorecardDetailPath,
  type ScorecardRow,
  type ScorecardStatus,
} from '@/lib/reviews/scorecards'
import { useUrlHashTab } from '@/lib/routing/urlHash'
import type { ReviewPacket } from '@/lib/reviews/types'
import { cycleStatusLabel, resolveCycleStatus } from '@/lib/reviews/status'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
} from '@/lib/reviews/useReviews'

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
  const cyclesHydrated = useReviewCyclesHydrated()
  const [query, setQuery] = useState('')
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilterMap>(
    {},
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const coversRevision = useManagerDelegationsRevision()
  useHydrateManagerDelegations(user?.employeeId ?? undefined)

  const me = useMemo(() => {
    const email = user?.email?.trim().toLowerCase()
    if (!email) return null
    return (
      employees.find(
        (employee) => employee.email.trim().toLowerCase() === email,
      ) ?? null
    )
  }, [employees, user?.email])

  const hasDirectReports = useMemo(
    () => (me ? viewerHasEffectiveReports(me, employees) : false),
    [coversRevision, employees, me],
  )
  const defaultScope = defaultScorecardScope(hasDirectReports)
  const [scope, setScope] = useUrlHashTab({
    defaultTab: defaultScope,
    tabFromHash: scorecardScopeFromHash,
    hashFromTab: hashForScorecardScope,
    enabled: Boolean(me),
  })
  const overviewScopes = visibleScorecardScopes({
    hasViewer: Boolean(me),
    hasDirectReports,
  })
  const visibleScope = resolveScorecardScope(scope, overviewScopes)

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

  const [cycleKeys, setCycleKeys] = useState<string[]>(['q3-2026'])
  const [packets, setPackets] = useState<ReviewPacket[]>([])

  useEffect(() => {
    const availableIds = cycleOptions.map((option) => option.id)
    const next = sanitizeCycleSelection(
      cycleKeys,
      availableIds,
      cycleOptions[0]?.id ?? 'q3-2026',
    )
    if (
      next.length === cycleKeys.length &&
      next.every((id, index) => id === cycleKeys[index])
    ) {
      return
    }
    setCycleKeys(next)
  }, [cycleKeys, cycleOptions])

  const loadPackets = useCallback((keys: string[]) => {
    return Promise.all(keys.map((cycleKey) => fetchReviewPackets(cycleKey)))
  }, [])

  useEffect(() => {
    let cancelled = false
    setPackets([])
    void loadPackets(cycleKeys)
      .then((groups) => {
        if (!cancelled) setPackets(groups.flat())
      })
      .catch(() => {
        if (!cancelled) setPackets([])
      })
    return () => {
      cancelled = true
    }
  }, [cycleKeys, loadPackets])

  const refreshLivePackets = useCallback(
    (event: { cycleId?: string }) => {
      const keys = event.cycleId ? [event.cycleId] : cycleKeys
      if (keys.length === 0) return
      void loadPackets(keys)
        .then((groups) => {
          const incoming = groups.flat()
          setPackets((current) => {
            if (!event.cycleId) return incoming
            return [
              ...current.filter((packet) => packet.cycleId !== event.cycleId),
              ...incoming,
            ]
          })
        })
        .catch(() => {
          /* Keep the current list until the next event. */
        })
    },
    [cycleKeys, loadPackets],
  )
  useLiveTopic('packets', refreshLivePackets)

  const rows = useMemo(
    () =>
      cycleKeys.flatMap((cycleKey) =>
        buildScorecardsForCycle(
          cycleKey,
          employees,
          user?.email,
          packets.filter((packet) => packet.cycleId === cycleKey),
        ),
      ),
    [coversRevision, cycleKeys, employees, packets, user?.email],
  )

  const queueRows = useMemo(
    () =>
      rows.filter((row) =>
        scorecardMatchesScope(row, visibleScope, me?.employeeId ?? null),
      ),
    [me?.employeeId, rows, visibleScope],
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

  const scorecardAttributes = useMemo(
    () => [
      { id: 'employee', label: 'Employee', icon: UserRound },
      { id: 'cycle', label: 'Cycle', icon: CalendarDays },
      { id: 'role', label: 'Role', icon: Briefcase },
      { id: 'seniority', label: 'Seniority', icon: Layers },
      { id: 'team', label: 'Team', icon: UsersRound },
      { id: 'department', label: 'Department', icon: Building2 },
      { id: 'reviewer', label: 'Reviewer', icon: UserRound },
      { id: 'grade', label: 'Grade', icon: Award },
      { id: 'status', label: 'Status', icon: CircleDot },
    ],
    [],
  )

  const scorecardAttributeValues = useMemo(
    (): Record<string, AttributeValue[]> => ({
      employee: uniqueAttributeValues(queueRows.map((row) => row.employeeName)),
      cycle: uniqueAttributeValues(queueRows.map((row) => row.cycleLabel)),
      role: uniqueAttributeValues(queueRows.map((row) => row.role)),
      seniority: uniqueAttributeValues(queueRows.map((row) => row.seniority)),
      team: uniqueAttributeValues(queueRows.map((row) => row.team)),
      department: uniqueAttributeValues(queueRows.map((row) => row.department)),
      reviewer: uniqueAttributeValues(queueRows.map((row) => row.reviewerName)),
      grade: uniqueLabeledAttributeValues(
        queueRows.map((row) =>
          row.grade
            ? { value: row.grade, label: gradeLabel(row.grade) }
            : { value: '', label: 'None' },
        ),
      ),
      status: [
        { value: 'completed', label: SCORECARD_STATUS_LIST_LABEL.completed },
        { value: 'in_progress', label: SCORECARD_STATUS_LIST_LABEL.in_progress },
        { value: 'not_started', label: SCORECARD_STATUS_LIST_LABEL.not_started },
      ],
    }),
    [queueRows],
  )

  const selectedScorecardFilters = useMemo(
    () => ({
      ...attributeFilters,
      status: statusFilter === 'all' ? [] : [statusFilter],
    }),
    [attributeFilters, statusFilter],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return queueRows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (
        !matchesAttributeFilters(attributeFilters, {
          employee: row.employeeName.trim(),
          cycle: row.cycleLabel.trim(),
          role: row.role.trim(),
          seniority: row.seniority.trim(),
          team: row.team.trim(),
          department: row.department.trim(),
          reviewer: row.reviewerName.trim(),
          grade: row.grade ?? '',
        })
      ) {
        return false
      }
      if (!q) return true
      const haystack = [
        row.employeeName,
        row.reviewerName,
        row.role,
        row.seniority,
        row.team,
        row.department,
        SCORECARD_STATUS_LIST_LABEL[row.status],
        row.cycleLabel,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [attributeFilters, query, queueRows, statusFilter])

  const [gradesRevealed, setGradesRevealed] = useState(false)
  const [gradeOverrides, setGradeOverrides] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    setGradesRevealed(false)
    setGradeOverrides({})
    setStatusFilter('all')
    setAttributeFilters({})
  }, [cycleKeys])

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

  const scorecardColumns: ResizableColumn[] = useMemo(
    () => [
      { id: 'employee', label: 'Employee', grow: true },
      { id: 'cycle', label: 'Cycle' },
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
    ],
    [allGradesVisible],
  )

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
            multiple
            options={cycleOptions}
            value={cycleKeys}
            onChange={setCycleKeys}
          />

          {overviewScopes.length > 1 ? (
            <SegmentedControl
              className="pd-people__scope"
              buttonClassName="pd-people__scope-btn"
              options={overviewScopes}
              value={visibleScope}
              onChange={setScope}
              aria-label="Reviews scope"
            />
          ) : null}
        </div>

        <div className="pd-people__bar-end">
          {filtered.length !== queueRows.length ||
          statusFilter !== 'all' ||
          Object.keys(attributeFilters).length > 0 ? (
            <p className="pd-people__stat">{filtered.length} shown</p>
          ) : null}
          <AttributeFilters
            attributes={scorecardAttributes}
            valuesFor={(id) => scorecardAttributeValues[id] ?? []}
            selected={selectedScorecardFilters}
            onChange={(next) => {
              const { status, ...rest } = next
              if (status?.length === 1) {
                setStatusFilter(status[0] as StatusFilter)
              } else {
                setStatusFilter('all')
              }
              setAttributeFilters(rest)
            }}
            sectionLabel="Review attributes"
          />
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="scorecards-heading"
      >
        <h2 id="scorecards-heading" className="pd-sr-only">
          {visibleScope === 'mine'
            ? 'My reviews'
            : visibleScope === 'reports'
              ? "My Reports' reviews"
              : "Everyone's reviews"}
        </h2>

        {(loadState === 'loading' && employees.length === 0) ||
        (!cyclesHydrated && cycles.length === 0) ? (
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
                  ? visibleScope === 'mine'
                    ? cycleKeys.length > 1
                    ? 'You do not have a performance review in the selected cycles yet.'
                    : 'You do not have a performance review in this cycle yet.'
                    : visibleScope === 'reports'
                      ? hasDirectReports
                        ? cycleKeys.length > 1
                          ? 'No direct reports match the selected cycles.'
                          : 'No direct reports match this cycle.'
                        : cycleKeys.length > 1
                          ? 'You have no direct reports to review for the selected cycles.'
                          : 'You have no direct reports to review for this cycle.'
                      : cycleKeys.length > 1
                        ? 'Add people to a group on the cycle settings page to open reviews for the selected cycles.'
                        : 'Add people to a group on the cycle settings page to open reviews for this cycle.'
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
      <td className="pd-reviews-scorecards__muted">{row.cycleLabel}</td>
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
