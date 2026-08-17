import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Avatar, EmptyState } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import {
  countDirectReports,
  listDirectReports,
} from '@/lib/employees/relationships'
import type { PlatformEmployee } from '@/lib/employees/types'

export function EmployeeProfileTeamTab({
  employee,
  isSelf = false,
}: {
  employee: PlatformEmployee
  isSelf?: boolean
}) {
  const reports = listDirectReports(employee)

  if (reports.length === 0) {
    return (
      <div className="pd-profile__placeholder">
        <EmptyState
          className="pd-empty--inline"
          icon={Users}
          title={isSelf ? 'No direct reports' : 'Individual contributor'}
          description={
            isSelf
              ? 'People who report to you will appear here once reporting lines are set.'
              : 'This person has no direct reports in the directory.'
          }
        />
      </div>
    )
  }

  return (
    <section className="pd-profile__panel" aria-label="Direct reports">
      <header className="pd-profile__panel-head">
        <h2 className="pd-profile__panel-title">Direct reports</h2>
        <p className="pd-profile__panel-meta">
          {reports.length} {reports.length === 1 ? 'person' : 'people'}
        </p>
      </header>
      <ul className="pd-profile__people-list">
        {reports.map((report) => {
          const reportCount = countDirectReports(report)
          const meta = [report.jobTitle, report.team || report.department]
            .filter(Boolean)
            .join(' · ')
          return (
            <li key={report.employeeId}>
              <Link
                to={`/people/${report.employeeId}`}
                className="pd-profile__people-row"
              >
                <Avatar
                  name={report.fullName}
                  src={report.avatarUrl || undefined}
                  size="md"
                  style={avatarStyle(report.fullName)}
                />
                <span className="pd-profile__people-text">
                  <span className="pd-profile__people-name">
                    {report.fullName}
                  </span>
                  <span className="pd-profile__people-meta">
                    {meta || 'No role details yet'}
                  </span>
                </span>
                {reportCount > 0 ? (
                  <span className="pd-profile__people-count">
                    {reportCount} report{reportCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
