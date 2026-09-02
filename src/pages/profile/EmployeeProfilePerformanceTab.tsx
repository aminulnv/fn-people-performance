import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Layers,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { Badge, EmptyState, type BadgeVariant } from '@/components/ui'
import { cx } from '@/lib/cx'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { PlatformEmployee } from '@/lib/employees/types'
import { formatLocalDateRange } from '@/lib/dates/timezone'
import { PURPOSE_SHORT_LABEL, cyclePurposeOf } from '@/lib/reviews/purpose'
import {
  SCORECARD_STATUS_LIST_LABEL,
  buildEmployeeScorecardHistory,
  gradeLabel,
  scorecardDetailPath,
  type ScorecardRow,
  type ScorecardStatus,
} from '@/lib/reviews/scorecards'
import { cycleStatusLabel, resolveCycleStatus } from '@/lib/reviews/status'
import type { CyclePurpose, ReviewCycle } from '@/lib/reviews/types'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
} from '@/lib/reviews/useReviews'
import { useAuth } from '@/lib/useAuth'

const PURPOSE_ICON: Record<CyclePurpose, LucideIcon> = {
  quarterly_checkin: CalendarDays,
  annual_appraisal: Layers,
  custom: Building2,
}

function statusVariant(status: ScorecardStatus): BadgeVariant {
  if (status === 'completed') return 'completed'
  if (status === 'in_progress') return 'in-progress'
  return 'draft'
}

function gradeCopy(row: ScorecardRow): string {
  if (row.grade) return gradeLabel(row.grade)
  if (row.status === 'in_progress') return 'Pending'
  if (row.status === 'completed') return 'Ungraded'
  return 'No grade'
}

function cycleForRow(
  cycles: ReviewCycle[],
  cycleKey: string,
): ReviewCycle | undefined {
  return cycles.find(
    (cycle) => cycle.id === cycleKey || cycle.periodKey === cycleKey,
  )
}

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
  const rows = useMemo(
    () =>
      buildEmployeeScorecardHistory(employee, employees, user?.email),
    [cycles, employee, employees, user?.email],
  )

  if (!cyclesHydrated && rows.length === 0) {
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
    <section className="pd-profile__panel" aria-label="Performance history">
      <header className="pd-profile__panel-head pd-profile__panel-head--stack">
        <h2 className="pd-profile__panel-title">Performance History</h2>
        <p className="pd-profile__panel-lede">
          Review status and grades across recent cycles
        </p>
        <p className="pd-profile__panel-meta">
          {rows.length} {rows.length === 1 ? 'cycle' : 'cycles'}
        </p>
      </header>
      <p className="pd-profile__scorecard-cols" aria-hidden>
        <span>Cycle</span>
        <span>Status</span>
        <span>Grade</span>
      </p>
      <ul className="pd-profile__scorecard-list">
        {rows.map((row) => (
          <ScorecardHistoryRow
            key={row.id}
            row={row}
            cycle={cycleForRow(cycles, row.cycleKey)}
          />
        ))}
      </ul>
    </section>
  )
}

function ScorecardHistoryRow({
  row,
  cycle,
}: {
  row: ScorecardRow
  cycle?: ReviewCycle
}) {
  const purpose = cyclePurposeOf(cycle)
  const Icon = PURPOSE_ICON[purpose]
  const windowLabel = cycle
    ? formatLocalDateRange(cycle.startDate, cycle.endDate)
    : ''
  const cycleWindow = cycle ? resolveCycleStatus(cycle) : null
  const reviewer =
    row.reviewerName && row.reviewerName !== '-' ? row.reviewerName : ''
  const grade = gradeCopy(row)
  const statusLabel = SCORECARD_STATUS_LIST_LABEL[row.status]
  const meta = [
    PURPOSE_SHORT_LABEL[purpose],
    windowLabel,
    reviewer && `Reviewer ${reviewer}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li>
      <Link
        to={scorecardDetailPath(row.cycleKey, row.employeeId)}
        className="pd-profile__scorecard-row"
        aria-label={`${row.cycleLabel}, ${statusLabel}, ${grade}`}
      >
        <span
          className={`pd-profile__scorecard-icon pd-profile__scorecard-icon--${purpose}`}
          aria-hidden
        >
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <span className="pd-profile__scorecard-main">
          <span className="pd-profile__scorecard-cycle">
            {row.cycleLabel}
            {cycleWindow === 'current' ? (
              <Badge variant="in-progress" className="pd-profile__scorecard-now">
                {cycleStatusLabel(cycleWindow)}
              </Badge>
            ) : null}
          </span>
          {meta ? (
            <span className="pd-profile__scorecard-meta">{meta}</span>
          ) : null}
        </span>
        <Badge
          variant={statusVariant(row.status)}
          className="pd-profile__scorecard-status"
        >
          {statusLabel}
        </Badge>
        <span
          className={cx(
            'pd-profile__scorecard-grade',
            row.grade && `pd-profile__scorecard-grade--${row.grade}`,
            row.grade ? 'is-set' : 'is-empty',
          )}
        >
          {grade}
        </span>
        <ChevronRight
          className="pd-profile__scorecard-chevron"
          size={16}
          strokeWidth={1.75}
          aria-hidden
        />
      </Link>
    </li>
  )
}
