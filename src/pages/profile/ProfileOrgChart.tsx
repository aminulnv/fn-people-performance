import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { cx } from '@/lib/cx'

type OrgChartPerson = {
  fullName: string
  jobTitle?: string | null
  avatarUrl?: string | null
}

type ProfileOrgChartProps = {
  manager?: (OrgChartPerson & { employeeId?: number }) | null
  person: OrgChartPerson
  managerReportCount?: number
  chartHref?: string
}

function OrgChartNode({
  person,
  href,
  isCurrent = false,
  fallbackRole,
}: {
  person: OrgChartPerson
  href?: string
  isCurrent?: boolean
  fallbackRole: string
}) {
  const className = cx(
    'pd-profile__org-node',
    isCurrent && 'is-current',
    href && 'is-link',
  )
  const body = (
    <>
      <Avatar
        name={person.fullName}
        src={person.avatarUrl || undefined}
        size="sm"
        className="pd-profile__org-avatar"
        style={avatarStyle(person.fullName)}
      />
      <p className="pd-profile__org-name">{person.fullName}</p>
      <p className="pd-profile__org-role">
        {person.jobTitle?.trim() || fallbackRole}
      </p>
    </>
  )

  if (href) {
    return (
      <Link to={href} className={className}>
        {body}
      </Link>
    )
  }

  return <div className={className}>{body}</div>
}

export function ProfileOrgChart({
  manager,
  person,
  managerReportCount = 0,
  chartHref,
}: ProfileOrgChartProps) {
  const showConnectorCount = Boolean(manager && managerReportCount > 0)

  return (
    <section className="pd-profile__card pd-profile__org-card">
      <header className="pd-profile__card-head">
        <h2 className="pd-profile__card-title">Org Chart</h2>
        {chartHref ? (
          <Link
            to={chartHref}
            className="pd-profile__icon-action"
            aria-label="View org chart"
          >
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden />
          </Link>
        ) : null}
      </header>
      <div className="pd-profile__org">
        {manager ? (
          <>
            <OrgChartNode
              person={manager}
              href={
                manager.employeeId
                  ? `/people/${manager.employeeId}`
                  : undefined
              }
              fallbackRole="Line manager"
            />
            <div className="pd-profile__org-connector" aria-hidden>
              {showConnectorCount ? (
                <span className="pd-profile__org-count">
                  {managerReportCount}
                </span>
              ) : null}
            </div>
          </>
        ) : null}
        <OrgChartNode
          person={person}
          isCurrent
          fallbackRole="Employee"
        />
      </div>
    </section>
  )
}
