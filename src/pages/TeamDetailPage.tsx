import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Network, UsersRound } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { getEmployee } from '@/lib/employees/store'
import { useOrganisation } from '@/lib/employees/useEmployees'
import { departmentDetailPath } from '@/lib/organisation/paths'
import { OrgMembersTable } from '@/pages/org/OrgMembersTable'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

export default function TeamDetailPage() {
  const { teamId: rawId = '' } = useParams()
  const teamId = decodeURIComponent(rawId)
  const { organisation, isLoading } = useOrganisation()

  const { team, departmentId, members } = useMemo(() => {
    const found = organisation.teams.find((t) => t.id === teamId) ?? null
    const dept =
      found != null
        ? organisation.departments.find((d) => d.name === found.departmentName)
        : null
    const people = found
      ? found.memberIds
          .map((id) => getEmployee(id))
          .filter((e): e is NonNullable<typeof e> => e != null)
          .sort((a, b) => a.fullName.localeCompare(b.fullName))
      : []
    return {
      team: found,
      departmentId: dept?.id ?? null,
      members: people,
    }
  }, [organisation, teamId])

  if (isLoading) {
    return (
      <div
        className="pd-page pd-people pd-org pd-org-detail"
        aria-busy="true"
        aria-label="Team"
      />
    )
  }

  if (!team) {
    return (
      <div
        className="pd-page pd-people pd-org pd-org-detail"
        aria-label="Team not found"
      >
        <p className="pd-people__empty">Team not found.</p>
        <Link to="/organisation" className="pd-people__back">
          Back to organisation
        </Link>
      </div>
    )
  }

  const owner = team.manager

  return (
    <div className="pd-page pd-people pd-org pd-org-detail" aria-label={team.name}>
      <div className="pd-org-detail__crumbs">
        <Link to="/organisation" className="pd-org-detail__back">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          Organisation
        </Link>
        {departmentId ? (
          <>
            <span className="pd-org-detail__crumb-sep" aria-hidden>
              /
            </span>
            <Link
              to={departmentDetailPath(departmentId)}
              className="pd-org-detail__crumb-link"
            >
              {team.departmentName}
            </Link>
          </>
        ) : null}
      </div>

      <section className="pd-org-detail__hero">
        <div className="pd-org-detail__hero-main">
          <span className="pd-org-detail__hero-icon" aria-hidden>
            <UsersRound size={28} strokeWidth={1.75} />
          </span>
          <div className="pd-org-detail__hero-text">
            <p className="pd-org-detail__eyebrow">Team</p>
            <h1 className="pd-org-detail__title">{team.name}</h1>
            <p className="pd-org-detail__meta">
              {team.departmentName}
              {' · '}
              {team.headcount} people
            </p>
          </div>
        </div>
        <div className="pd-org-detail__hero-actions">
          <Link to="/organisation/chart" className="pd-people__ghost-btn">
            <Network size={16} strokeWidth={1.75} aria-hidden />
            Org chart
          </Link>
        </div>
      </section>

      <div className="pd-org-detail__stats" aria-label="Team summary">
        <div className="pd-org-detail__stat">
          <span className="pd-org-detail__stat-label">Owner</span>
          <span className="pd-org-detail__stat-value">
            {owner ? (
              <span className="pd-people__person">
                <Avatar
                  name={owner.fullName}
                  src={owner.avatarUrl || undefined}
                  size="sm"
                  style={avatarStyle(owner.fullName)}
                />
                {owner.employeeId != null ? (
                  <Link
                    to={`/people/${owner.employeeId}`}
                    className="pd-people__person-link"
                  >
                    {owner.fullName}
                  </Link>
                ) : (
                  owner.fullName
                )}
              </span>
            ) : (
              <span className="pd-org__muted">Unassigned</span>
            )}
          </span>
        </div>
        <div className="pd-org-detail__stat">
          <span className="pd-org-detail__stat-label">Department</span>
          <span className="pd-org-detail__stat-value">
            {departmentId ? (
              <Link
                to={departmentDetailPath(departmentId)}
                className="pd-org-detail__inline-link"
              >
                <Building2 size={15} strokeWidth={1.75} aria-hidden />
                {team.departmentName}
              </Link>
            ) : (
              team.departmentName
            )}
          </span>
        </div>
        <div className="pd-org-detail__stat">
          <span className="pd-org-detail__stat-label">Headcount</span>
          <span className="pd-org-detail__stat-value">{team.headcount}</span>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="team-members-heading"
      >
        <header className="pd-org-detail__panel-head">
          <h2 id="team-members-heading" className="pd-org-detail__panel-title">
            People
          </h2>
        </header>
        <OrgMembersTable members={members} />
      </section>
    </div>
  )
}
