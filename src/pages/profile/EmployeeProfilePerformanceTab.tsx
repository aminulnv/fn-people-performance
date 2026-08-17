import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  SCORECARD_STATUS_LIST_LABEL,
  buildEmployeeScorecardHistory,
  gradeLabel,
  scorecardDetailPath,
} from '@/lib/reviews/scorecards'
import { useAuth } from '@/lib/useAuth'

export function EmployeeProfilePerformanceTab({
  employee,
  isSelf = false,
}: {
  employee: PlatformEmployee
  isSelf?: boolean
}) {
  const { user } = useAuth()
  const { employees } = useEmployees()
  const rows = useMemo(
    () =>
      buildEmployeeScorecardHistory(employee, employees, user?.email),
    [employee, employees, user?.email],
  )

  if (rows.length === 0) {
    return (
      <div className="pd-profile__placeholder">
        <EmptyState
          className="pd-empty--inline"
          icon={Star}
          title="No performance reviews yet"
          description={
            isSelf
              ? 'Scorecards will appear here once a performance cycle is available.'
              : 'Scorecards for this employee will appear here once a performance cycle is available.'
          }
        />
      </div>
    )
  }

  return (
    <section className="pd-profile__panel" aria-label="Performance history">
      <header className="pd-profile__panel-head">
        <h2 className="pd-profile__panel-title">Performance history</h2>
        <p className="pd-profile__panel-meta">
          Performance review status across recent cycles
        </p>
      </header>
      <ul className="pd-profile__scorecard-list">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              to={scorecardDetailPath(row.cycleKey, row.employeeId)}
              className="pd-profile__scorecard-row"
            >
              <span className="pd-profile__scorecard-main">
                <span className="pd-profile__scorecard-cycle">
                  {row.cycleLabel}
                </span>
                <span className="pd-profile__scorecard-status">
                  {SCORECARD_STATUS_LIST_LABEL[row.status]}
                </span>
              </span>
              <span className="pd-profile__scorecard-grade">
                {row.grade ? gradeLabel(row.grade) : '—'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
