import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CalendarFold,
  ChevronDown,
  ChevronRight,
  Layers,
  Star,
} from 'lucide-react'
import {
  Avatar,
  Badge,
  EmptyState,
  ResizableTable,
  type BadgeVariant,
  type ResizableColumn,
} from '@/components/ui'
import { ApiError } from '@/lib/apiClient'
import { cx } from '@/lib/cx'
import { avatarStyle } from '@/lib/employees/avatar'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { PlatformEmployee } from '@/lib/employees/types'
import { ensurePersonGoalsHydrated } from '@/lib/goalsApi'
import { PACKET_STALE_MS, queryClient, queryKeys } from '@/lib/queryClient'
import { findCycleGroupForPerson } from '@/lib/reviews/cycleGroups'
import { nestCyclesForList } from '@/lib/reviews/cycleList'
import { annualSourceLinks } from '@/lib/reviews/annualQuarters'
import { fetchReviewPacketSummary } from '@/lib/reviews/packetsApi'
import { cyclePurposeOf, cycleTypeLabel } from '@/lib/reviews/purpose'
import { GradeChip } from '@/pages/reviews/GradeChip'
import {
  SCORECARD_STATUS_LIST_LABEL,
  buildEmployeeScorecardHistory,
  gradeLabel,
  scorecardDetailPath,
  type ScorecardRow,
  type ScorecardStatus,
} from '@/lib/reviews/scorecards'
import type { ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import { prefetchReviewPacket } from '@/lib/reviews/useReviewPackets'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
} from '@/lib/reviews/useReviews'
import { useLiveTopic } from '@/lib/realtime/useLiveTopic'
import { useAuth } from '@/lib/useAuth'

function statusVariant(status: ScorecardStatus): BadgeVariant {
  if (status === 'completed') return 'completed'
  if (status === 'in_progress') return 'in-progress'
  return 'draft'
}

function gradeCopy(row: ScorecardRow): string {
  if (row.grade) return gradeLabel(row.grade)
  return '—'
}

function cycleForRow(
  cycles: ReviewCycle[],
  cycleKey: string,
): ReviewCycle | undefined {
  return cycles.find(
    (cycle) => cycle.id === cycleKey || cycle.periodKey === cycleKey,
  )
}

function iconForCycle(cycle: ReviewCycle) {
  const purpose = cyclePurposeOf(cycle)
  if (purpose === 'annual_appraisal') return Layers
  if (purpose === 'custom') return CalendarFold
  return CalendarDays
}

const HISTORY_COLUMNS: ResizableColumn[] = [
  {
    id: 'cycle-name',
    label: 'Cycle Name',
    name: 'Cycle Name',
    grow: true,
    growWeight: 3,
    minWidth: 280,
  },
  { id: 'cycle-type', label: 'Type', minWidth: 116 },
  { id: 'reviewer', label: 'Reviewer', grow: true, minWidth: 140 },
  { id: 'status', label: 'Status', minWidth: 120 },
  { id: 'grade', label: 'Grade', minWidth: 120 },
]

export function EmployeeProfilePerformanceTab({
  employee,
  isSelf = false,
}: {
  employee: PlatformEmployee
  isSelf?: boolean
}) {
  const { user } = useAuth()
  const { employees } = useEmployees({ load: false })
  const { cycles } = useReviewsSnapshot()
  const cyclesHydrated = useReviewCyclesHydrated()
  const memberCycles = useMemo(
    () =>
      cycles.filter(
        (cycle) => findCycleGroupForPerson(cycle, employee.employeeId) != null,
      ),
    [cycles, employee.employeeId],
  )
  const memberCycleIds = useMemo(
    () => memberCycles.map((cycle) => cycle.id),
    [memberCycles],
  )
  const memberCycleKey = memberCycleIds.join('\0')
  const [packetLoad, setPacketLoad] = useState<{
    key: string
    packets: ReviewPacket[]
  } | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  const loadPackets = useCallback(async (cycleIds: string[], employeeId: number) => {
    const loaded = await Promise.all(
      cycleIds.map(async (cycleId) => {
        try {
          // History only needs grades/status — full packets make this tab very slow.
          return await fetchReviewPacketSummary(cycleId, employeeId)
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) return null
          throw error
        }
      }),
    )
    return loaded.filter((packet): packet is ReviewPacket => packet != null)
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadPackets(memberCycleIds, employee.employeeId)
      .then((packets) => {
        for (const packet of packets) {
          queryClient.setQueryData(
            queryKeys.reviewPacketSummary(packet.cycleId, packet.employeeId),
            packet,
          )
        }
        if (!cancelled) setPacketLoad({ key: memberCycleKey, packets })
      })
      .catch(() => {
        if (!cancelled) setPacketLoad({ key: memberCycleKey, packets: [] })
      })
    return () => {
      cancelled = true
    }
  }, [employee.employeeId, loadPackets, memberCycleIds, memberCycleKey])

  const refreshLivePackets = useCallback(
    (event: { cycleId?: string; employeeId?: string }) => {
      if (
        event.employeeId != null &&
        event.employeeId !== String(employee.employeeId)
      ) {
        return
      }
      if (event.cycleId && !memberCycleIds.includes(event.cycleId)) return
      void loadPackets(memberCycleIds, employee.employeeId)
        .then((packets) => {
          for (const packet of packets) {
            queryClient.setQueryData(
              queryKeys.reviewPacketSummary(packet.cycleId, packet.employeeId),
              packet,
            )
          }
          setPacketLoad({ key: memberCycleKey, packets })
        })
        .catch(() => {
          /* Keep the current history until the next event. */
        })
    },
    [employee.employeeId, loadPackets, memberCycleIds, memberCycleKey],
  )
  useLiveTopic('packets', refreshLivePackets, cyclesHydrated)

  const packetsReady = packetLoad?.key === memberCycleKey
  const packets = packetsReady ? packetLoad.packets : []
  const rows = useMemo(
    () =>
      buildEmployeeScorecardHistory(employee, employees, user?.email, packets),
    [employee, employees, packets, user?.email],
  )
  const rowByCycleId = useMemo(() => {
    const map = new Map<string, ScorecardRow>()
    for (const row of rows) {
      map.set(row.cycleKey, row)
      const cycle = cycleForRow(cycles, row.cycleKey)
      if (cycle) {
        map.set(cycle.id, row)
        if (cycle.periodKey) map.set(cycle.periodKey, row)
      }
    }
    return map
  }, [cycles, rows])
  const tree = useMemo(() => nestCyclesForList(memberCycles), [memberCycles])

  function toggleCollapsed(cycleId: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(cycleId)) next.delete(cycleId)
      else next.add(cycleId)
      return next
    })
  }

  if (!cyclesHydrated || !packetsReady) {
    return (
      <div
        className="pd-profile__placeholder"
        aria-busy="true"
        aria-label="Loading performance reviews"
      />
    )
  }

  if (rows.length === 0) {
    return (
      <div className="pd-profile__placeholder">
        <EmptyState
          className="pd-empty--inline"
          icon={Star}
          title="No Performance Reviews Yet"
          description={
            isSelf
              ? 'Scorecards will appear here once a cycle is available.'
              : 'Scorecards for this employee will appear here once a cycle is available.'
          }
        />
      </div>
    )
  }

  return (
    <section
      className="pd-people__panel pd-people__panel--table pd-profile__history-panel"
      aria-labelledby="profile-performance-heading"
    >
      <header className="pd-profile__history-head">
        <h2
          id="profile-performance-heading"
          className="pd-profile__panel-title"
        >
          Performance History
        </h2>
        <p className="pd-profile__panel-meta">
          {rows.length} {rows.length === 1 ? 'cycle' : 'cycles'}
        </p>
      </header>
      <div className="pd-people__table-wrap">
        <ResizableTable
          className="pd-people__table pd-reviews-cycles__table pd-profile__history-table"
          storageKey="profile-performance-history-widths-v1"
          columns={HISTORY_COLUMNS}
        >
          <tbody>
            {tree.map((node) => {
              const parentRow = rowByCycleId.get(node.cycle.id)
              if (!parentRow) return null
              const isOpen = !collapsed.has(node.cycle.id)
              const childRows = node.children
                .map((child) => ({
                  cycle: child,
                  row: rowByCycleId.get(child.id),
                }))
                .filter(
                  (
                    item,
                  ): item is { cycle: ReviewCycle; row: ScorecardRow } =>
                    item.row != null,
                )
              return (
                <Fragment key={node.cycle.id}>
                  <ScorecardHistoryRow
                    row={parentRow}
                    cycle={node.cycle}
                    cycles={cycles}
                    childCount={childRows.length}
                    isOpen={isOpen}
                    onToggle={
                      childRows.length > 0
                        ? () => toggleCollapsed(node.cycle.id)
                        : undefined
                    }
                  />
                  {isOpen
                    ? childRows.map((child, index) => (
                        <ScorecardHistoryRow
                          key={child.cycle.id}
                          row={child.row}
                          cycle={child.cycle}
                          cycles={cycles}
                          nested
                          isLastChild={index === childRows.length - 1}
                        />
                      ))
                    : null}
                </Fragment>
              )
            })}
          </tbody>
        </ResizableTable>
      </div>
    </section>
  )
}

function warmScorecardNavigation(
  cycle: ReviewCycle | undefined,
  row: ScorecardRow,
  cycles: readonly ReviewCycle[],
) {
  const cycleId = cycle?.id ?? row.cycleKey
  prefetchReviewPacket(queryClient, cycleId, row.employeeId)
  void ensurePersonGoalsHydrated(cycleId, row.employeeId)
  for (const link of annualSourceLinks(cycle, [...cycles])) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.reviewPacketSummary(
        link.sourceCycleId,
        row.employeeId,
      ),
      queryFn: () =>
        fetchReviewPacketSummary(link.sourceCycleId, row.employeeId),
      staleTime: PACKET_STALE_MS,
    })
  }
  const q4 = annualSourceLinks(cycle, [...cycles]).find((link) => {
    const source = cycles.find((item) => item.id === link.sourceCycleId)
    return /q4/i.test(source?.periodKey ?? '')
  })
  if (q4) void ensurePersonGoalsHydrated(q4.sourceCycleId, row.employeeId)
}

function ScorecardHistoryRow({
  row,
  cycle,
  cycles,
  nested = false,
  isLastChild = false,
  childCount = 0,
  isOpen = false,
  onToggle,
}: {
  row: ScorecardRow
  cycle: ReviewCycle
  cycles: readonly ReviewCycle[]
  nested?: boolean
  isLastChild?: boolean
  childCount?: number
  isOpen?: boolean
  onToggle?: () => void
}) {
  const navigate = useNavigate()
  const purpose = cyclePurposeOf(cycle)
  const Icon = iconForCycle(cycle)
  const to = scorecardDetailPath(row.cycleKey, row.employeeId)
  const grade = gradeCopy(row)
  const statusLabel = SCORECARD_STATUS_LIST_LABEL[row.status]
  const hasReviewer = Boolean(
    row.reviewerName && row.reviewerName !== '-',
  )

  return (
    <tr
      className={cx(
        'pd-people__row-link',
        nested && 'pd-reviews-cycles__row--child',
        nested && isLastChild && 'pd-reviews-cycles__row--child-last',
        !nested && childCount > 0 && isOpen && 'pd-reviews-cycles__row--open',
      )}
      tabIndex={0}
      aria-level={nested ? 2 : 1}
      aria-label={`${row.cycleLabel}, ${statusLabel}, ${grade}`}
      onMouseEnter={() => warmScorecardNavigation(cycle, row, cycles)}
      onFocus={() => warmScorecardNavigation(cycle, row, cycles)}
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
        <span className="pd-reviews-cycles__name-cell">
          {onToggle ? (
            <button
              type="button"
              className="pd-reviews-cycles__expand"
              aria-expanded={isOpen}
              aria-label={
                isOpen
                  ? `Collapse ${row.cycleLabel}`
                  : `Expand ${row.cycleLabel}`
              }
              onClick={onToggle}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {isOpen ? (
                <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
              ) : (
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              )}
            </button>
          ) : nested ? (
            <span className="pd-reviews-cycles__branch" aria-hidden />
          ) : (
            <span className="pd-reviews-cycles__expand-spacer" aria-hidden />
          )}
          <Link to={to} className="pd-reviews-cycle-link" draggable={false}>
            <span
              className={`pd-reviews-cycle-link__icon pd-reviews-cycle-link__icon--${purpose}`}
              aria-hidden
            >
              <Icon size={16} strokeWidth={1.75} />
            </span>
            <span className="pd-reviews-cycle-link__name">{row.cycleLabel}</span>
            {childCount > 0 ? (
              <span className="pd-people__th-count">{childCount}</span>
            ) : null}
          </Link>
        </span>
      </td>
      <td className="pd-reviews-cycles__muted">{cycleTypeLabel(cycle)}</td>
      <td className="pd-profile__history-reviewer">
        {hasReviewer ? (
          <span className="pd-people__person pd-profile__history-reviewer-person">
            <Avatar
              name={row.reviewerName}
              src={row.reviewerAvatarUrl || undefined}
              size="sm"
              className="pd-people__avatar"
              style={avatarStyle(row.reviewerName)}
            />
            {row.reviewerId != null ? (
              <Link
                to={`/people/${row.reviewerId}`}
                className="pd-people__person-link"
                onClick={(event) => event.stopPropagation()}
              >
                {row.reviewerName}
              </Link>
            ) : (
              <span className="pd-people__person-name">{row.reviewerName}</span>
            )}
          </span>
        ) : (
          <span className="pd-reviews-cycles__muted">—</span>
        )}
      </td>
      <td className="pd-profile__history-status">
        <Badge variant={statusVariant(row.status)}>{statusLabel}</Badge>
      </td>
      <td className="pd-profile__history-grade-cell">
        {row.grade ? (
          <GradeChip grade={row.grade} />
        ) : (
          <span className="pd-reviews-cycles__muted">—</span>
        )}
      </td>
    </tr>
  )
}
