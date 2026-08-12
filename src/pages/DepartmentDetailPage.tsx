import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Network,
  UsersRound,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { getEmployee, listDepartments } from '@/lib/employees/store'
import type { PlatformDepartment } from '@/lib/employees/types'
import { useOrganisation } from '@/lib/employees/useEmployees'
import { teamDetailPath } from '@/lib/organisation/paths'
import { OrgMembersTable } from '@/pages/org/OrgMembersTable'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

export default function DepartmentDetailPage() {
  const { departmentId: rawId = '' } = useParams()
  const departmentId = decodeURIComponent(rawId)
  const [catalog, setCatalog] = useState<PlatformDepartment[]>([])
  const [catalogReady, setCatalogReady] = useState(false)
  const { organisation, employees, isLoading } = useOrganisation(catalog)

  useEffect(() => {
    let cancelled = false
    void listDepartments()
      .then((departments) => {
        if (cancelled) return
        setCatalog(departments)
        setCatalogReady(true)
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([])
          setCatalogReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [employees])

  const { department, members } = useMemo(() => {
    const found =
      organisation.departments.find((d) => d.id === departmentId) ?? null
    const people = found
      ? found.memberIds
          .map((id) => getEmployee(id))
          .filter((e): e is NonNullable<typeof e> => e != null)
          .sort((a, b) => a.fullName.localeCompare(b.fullName))
      : []
    return { department: found, members: people }
  }, [departmentId, organisation])

  if (isLoading || !catalogReady) {
    return (
      <div
        className="pd-page pd-people pd-org pd-org-detail"
        aria-busy="true"
        aria-label="Department"
      />
    )
  }

  if (!department) {
    return (
      <div
        className="pd-page pd-people pd-org pd-org-detail"
        aria-label="Department not found"
      >
        <p className="pd-people__empty">Department not found.</p>
        <Link to="/organisation" className="pd-people__back">
          Back to organisation
        </Link>
      </div>
    )
  }

  const head = department.head

  return (
    <div
      className="pd-page pd-people pd-org pd-org-detail"
      aria-label={department.name}
    >
      <Link to="/organisation" className="pd-org-detail__back">
        <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
        Organisation
      </Link>

      <section className="pd-org-detail__hero">
        <div className="pd-org-detail__hero-main">
          <span className="pd-org-detail__hero-icon" aria-hidden>
            <Building2 size={28} strokeWidth={1.75} />
          </span>
          <div className="pd-org-detail__hero-text">
            <p className="pd-org-detail__eyebrow">Department</p>
            <h1 className="pd-org-detail__title">{department.name}</h1>
            <p className="pd-org-detail__meta">
              {department.teams.length} team
              {department.teams.length === 1 ? '' : 's'}
              {' · '}
              {department.headcount} people
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

      <div className="pd-org-detail__stats" aria-label="Department summary">
        <div className="pd-org-detail__stat">
          <span className="pd-org-detail__stat-label">Owner</span>
          <span className="pd-org-detail__stat-value">
            {head ? (
              <span className="pd-people__person">
                <Avatar
                  name={head.fullName}
                  size="sm"
                  style={avatarStyle(head.fullName)}
                />
                {head.employeeId != null ? (
                  <Link
                    to={`/people/${head.employeeId}`}
                    className="pd-people__person-link"
                  >
                    {head.fullName}
                  </Link>
                ) : (
                  head.fullName
                )}
              </span>
            ) : (
              <span className="pd-org__muted">Unassigned</span>
            )}
          </span>
        </div>
        <div className="pd-org-detail__stat">
          <span className="pd-org-detail__stat-label">Teams</span>
          <span className="pd-org-detail__stat-value">
            {department.teams.length}
          </span>
        </div>
        <div className="pd-org-detail__stat">
          <span className="pd-org-detail__stat-label">Headcount</span>
          <span className="pd-org-detail__stat-value">
            {department.headcount}
          </span>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="dept-teams-heading"
      >
        <header className="pd-org-detail__panel-head">
          <h2 id="dept-teams-heading" className="pd-org-detail__panel-title">
            Teams
          </h2>
        </header>
        {department.teams.length === 0 ? (
          <p className="pd-people__empty">No teams in this department.</p>
        ) : (
          <div className="pd-people__table-wrap">
            <table className="pd-people__table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Owner</th>
                  <th>Headcount</th>
                </tr>
              </thead>
              <tbody>
                {department.teams.map((team) => (
                  <tr key={team.id}>
                    <td>
                      <Link
                        to={teamDetailPath(team.id)}
                        className="pd-org__unit-link"
                      >
                        <span className="pd-org__unit-icon" aria-hidden>
                          <UsersRound size={16} strokeWidth={1.75} />
                        </span>
                        <span className="pd-org__unit-name">{team.name}</span>
                      </Link>
                    </td>
                    <td>
                      {team.manager ? (
                        <span className="pd-people__person">
                          <Avatar
                            name={team.manager.fullName}
                            size="sm"
                            style={avatarStyle(team.manager.fullName)}
                          />
                          {team.manager.employeeId != null ? (
                            <Link
                              to={`/people/${team.manager.employeeId}`}
                              className="pd-people__person-link"
                            >
                              {team.manager.fullName}
                            </Link>
                          ) : (
                            team.manager.fullName
                          )}
                        </span>
                      ) : (
                        <span className="pd-org__muted">—</span>
                      )}
                    </td>
                    <td>{team.headcount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="dept-members-heading"
      >
        <header className="pd-org-detail__panel-head">
          <h2 id="dept-members-heading" className="pd-org-detail__panel-title">
            People
          </h2>
        </header>
        <OrgMembersTable members={members} extraColumn="team" />
      </section>
    </div>
  )
}
