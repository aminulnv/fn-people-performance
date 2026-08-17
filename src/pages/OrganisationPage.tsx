import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Users,
  UsersRound,
} from 'lucide-react'
import { OrgChartLink } from '@/components/OrgChartLink'
import {
  tableDensityWrapClass,
  TableDensityToggle,
} from '@/components/TableDensityToggle'
import {
  Avatar,
  ResizableTable,
  type ResizableColumn,
} from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { avatarStyle } from '@/lib/employees/avatar'
import { listDepartments } from '@/lib/employees/store'
import type {
  PlatformDepartment,
  PlatformEmployee,
} from '@/lib/employees/types'
import { useOrganisation } from '@/lib/employees/useEmployees'
import {
  departmentDetailPath,
  teamDetailPath,
} from '@/lib/organisation/paths'
import type { OrgDepartment, OrgPersonRef, OrgTeam } from '@/lib/organisation/types'
import {
  readTableDensity,
  writeTableDensity,
  type TableDensity,
} from '@/pages/people/prefs'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

type StructureView = 'departments' | 'teams'

function PersonCell({
  person,
  size = 'md',
}: {
  person: OrgPersonRef | null
  size?: 'sm' | 'md'
}) {
  if (!person) {
    return <span className="pd-org__muted">—</span>
  }

  const label = person.employeeId != null ? (
    <Link
      to={`/people/${person.employeeId}`}
      className="pd-people__person-link"
    >
      {person.fullName}
    </Link>
  ) : (
    <span className="pd-people__person-name">{person.fullName}</span>
  )

  return (
    <div className="pd-people__person">
      <Avatar
        name={person.fullName}
        src={person.avatarUrl || undefined}
        size={size}
        className="pd-people__avatar"
        style={avatarStyle(person.fullName)}
      />
      {label}
    </div>
  )
}

function departmentMatchesQuery(department: OrgDepartment, q: string): boolean {
  if (!q) return true
  const haystack = [
    department.name,
    department.head?.fullName ?? '',
    ...department.teams.map((team) =>
      [team.name, team.manager?.fullName ?? ''].join(' '),
    ),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

function teamMatchesQuery(team: OrgTeam, q: string): boolean {
  if (!q) return true
  const haystack = [
    team.name,
    team.departmentName,
    team.manager?.fullName ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

function isMyDepartment(
  department: OrgDepartment,
  user: { email?: string | null; name?: string | null } | null,
  employees: PlatformEmployee[],
): boolean {
  if (!user) return false
  const email = user.email?.trim().toLowerCase()
  const name = user.name?.trim().toLowerCase()
  const me = email
    ? employees.find((e) => e.email.toLowerCase() === email)
    : undefined

  if (me && department.memberIds.includes(me.employeeId)) return true
  if (
    me &&
    department.head?.employeeId != null &&
    department.head.employeeId === me.employeeId
  ) {
    return true
  }
  if (
    name &&
    department.head?.fullName.trim().toLowerCase() === name
  ) {
    return true
  }
  return false
}

function isMyTeam(
  team: OrgTeam,
  user: { email?: string | null; name?: string | null } | null,
  employees: PlatformEmployee[],
): boolean {
  if (!user) return false
  const email = user.email?.trim().toLowerCase()
  const name = user.name?.trim().toLowerCase()
  const me = email
    ? employees.find((e) => e.email.toLowerCase() === email)
    : undefined

  if (me && team.memberIds.includes(me.employeeId)) return true
  if (
    me &&
    team.manager?.employeeId != null &&
    team.manager.employeeId === me.employeeId
  ) {
    return true
  }
  if (name && team.manager?.fullName.trim().toLowerCase() === name) {
    return true
  }
  return false
}

export default function OrganisationPage() {
  const { user } = useAuth()
  const [catalog, setCatalog] = useState<PlatformDepartment[]>([])
  const {
    employees,
    organisation: snapshot,
    loadState,
    loadError,
  } = useOrganisation(catalog)
  const [structureView, setStructureView] = useState<StructureView | null>(null)
  const [query, setQuery] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [tableDensity, setTableDensityState] =
    useState<TableDensity>(readTableDensity)

  function setTableDensity(next: TableDensity) {
    setTableDensityState(next)
    writeTableDensity(next)
  }

  function toggleStructureView(next: StructureView) {
    setStructureView((current) => (current === next ? null : next))
  }

  useEffect(() => {
    let cancelled = false
    void listDepartments()
      .then((rows) => {
        if (!cancelled) setCatalog(rows)
      })
      .catch(() => {
        if (!cancelled) setCatalog([])
      })
    return () => {
      cancelled = true
    }
  }, [employees])

  const q = query.trim().toLowerCase()

  const filteredDepartments = useMemo(() => {
    return snapshot.departments
      .filter((department) => {
        if (mineOnly && !isMyDepartment(department, user, employees)) {
          return false
        }
        return departmentMatchesQuery(department, q)
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
  }, [employees, mineOnly, q, snapshot.departments, user])

  const filteredTeams = useMemo(() => {
    return snapshot.teams
      .filter((team) => {
        if (mineOnly && !isMyTeam(team, user, employees)) return false
        return teamMatchesQuery(team, q)
      })
      .sort((a, b) => {
        const byDept = a.departmentName.localeCompare(b.departmentName, undefined, {
          sensitivity: 'base',
        })
        if (byDept !== 0) return byDept
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })
  }, [employees, mineOnly, q, snapshot.teams, user])

  function toggleExpanded(departmentId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(departmentId)) next.delete(departmentId)
      else next.add(departmentId)
      return next
    })
  }

  const hasPeople = employees.some((e) => e.isActive)
  const hasStructure = hasPeople || snapshot.departments.length > 0
  const peopleCount = useMemo(
    () =>
      snapshot.departments.reduce(
        (total, department) => total + department.headcount,
        0,
      ),
    [snapshot.departments],
  )
  const activeView = structureView ?? 'departments'
  const mineLabel =
    activeView === 'departments' ? 'My Department' : 'My Teams'
  const departmentColumns = useMemo<ResizableColumn[]>(
    () => [
      {
        id: 'department',
        label: (
          <span className="pd-people__th">
            Department
            <span className="pd-people__th-count">
              {filteredDepartments.length}
            </span>
          </span>
        ),
        name: 'Department',
        grow: true,
      },
      { id: 'owner', label: 'Owner' },
      { id: 'teams', label: 'Teams' },
      { id: 'headcount', label: 'Headcount' },
    ],
    [filteredDepartments.length],
  )
  const teamColumns = useMemo<ResizableColumn[]>(
    () => [
      {
        id: 'team',
        label: (
          <span className="pd-people__th">
            Team
            <span className="pd-people__th-count">{filteredTeams.length}</span>
          </span>
        ),
        name: 'Team',
        grow: true,
      },
      { id: 'department', label: 'Department' },
      { id: 'manager', label: 'Manager' },
      { id: 'headcount', label: 'Headcount' },
    ],
    [filteredTeams.length],
  )

  return (
    <div
      className="pd-page pd-page--pane pd-people pd-org"
      aria-label="Organisation"
    >
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Structure totals"
      >
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            structureView === 'departments' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={structureView === 'departments'}
          onClick={() => toggleStructureView('departments')}
        >
          <span className="pd-people__summary-label">
            <Building2 size={14} strokeWidth={1.75} aria-hidden />
            Departments
          </span>
          <span className="pd-people__summary-value">
            {snapshot.departments.length}
          </span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            structureView === 'teams' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={structureView === 'teams'}
          onClick={() => toggleStructureView('teams')}
        >
          <span className="pd-people__summary-label">
            <UsersRound size={14} strokeWidth={1.75} aria-hidden />
            Teams
          </span>
          <span className="pd-people__summary-value">
            {snapshot.teams.length}
          </span>
        </button>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">
            <Users size={14} strokeWidth={1.75} aria-hidden />
            People
          </span>
          <span className="pd-people__summary-value">{peopleCount}</span>
        </div>
      </div>

      <div className="pd-people__header pd-people__header--row">
        <div className="pd-people__filters" role="toolbar" aria-label="Organisation filters">
          <label className="pd-people__search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <span className="pd-sr-only">Search organisation</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeView === 'departments'
                  ? 'Search departments…'
                  : 'Search teams…'
              }
              className="pd-people__search-input"
            />
          </label>
          <button
            type="button"
            className={[
              'pd-people__chip',
              mineOnly ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={mineOnly}
            onClick={() => setMineOnly((v) => !v)}
          >
            {mineLabel}
          </button>
        </div>

        <div className="pd-people__toolbar">
          <TableDensityToggle
            className="pd-people__density"
            buttonClassName="pd-people__density-btn"
            value={tableDensity}
            onChange={setTableDensity}
          />
          <OrgChartLink />
          <Link
            to="/organisation/departments/new"
            className="pd-people__create-btn"
          >
            <Plus size={18} strokeWidth={2} aria-hidden />
            Add Department
          </Link>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="org-structure-heading"
      >
        <h2 id="org-structure-heading" className="pd-sr-only">
          {activeView === 'departments' ? 'Departments' : 'Teams'}
        </h2>

            {loadState === 'loading' && !hasStructure ? (
              <p className="pd-people__empty">
                Loading organisation from the live database…
              </p>
            ) : loadState === 'error' && !hasStructure ? (
              <p className="pd-people__empty">
                {loadError ?? 'Failed to load organisation.'}
              </p>
            ) : !hasStructure ? (
              <div className="pd-people__empty-state">
                <p className="pd-people__empty">
                  Organisation is built from departments and teams. Add a
                  department to get started, then assign people from the People
                  directory.
                </p>
            <Link
              to="/organisation/departments/new"
              className="pd-people__create-btn pd-people__create-btn--secondary"
            >
              <Plus size={18} strokeWidth={2} aria-hidden />
              Add Department
            </Link>
          </div>
        ) : activeView === 'departments' ? (
          filteredDepartments.length === 0 ? (
            <p className="pd-people__empty">
              No departments match your filters.
            </p>
          ) : (
            <div className={tableDensityWrapClass(tableDensity)}>
              <ResizableTable
                className="pd-people__table"
                storageKey="organisation-departments-column-widths"
                columns={departmentColumns}
              >
                <tbody>
                  {filteredDepartments.map((department) => {
                    const isOpen = expanded.has(department.id)
                    const teamsInView = department.teams.filter((team) =>
                      teamMatchesQuery(team, q),
                    )
                    return (
                      <Fragment key={department.id}>
                        <tr>
                          <td>
                            <div className="pd-org__name-cell">
                              <button
                                type="button"
                                className="pd-org__expand"
                                aria-expanded={isOpen}
                                aria-label={
                                  isOpen
                                    ? `Collapse ${department.name}`
                                    : `Expand ${department.name}`
                                }
                                onClick={() =>
                                  toggleExpanded(department.id)
                                }
                              >
                                {isOpen ? (
                                  <ChevronDown
                                    size={16}
                                    strokeWidth={1.75}
                                    aria-hidden
                                  />
                                ) : (
                                  <ChevronRight
                                    size={16}
                                    strokeWidth={1.75}
                                    aria-hidden
                                  />
                                )}
                              </button>
                              <Link
                                to={departmentDetailPath(department.id)}
                                className="pd-org__unit-link"
                              >
                                <span className="pd-org__unit-icon" aria-hidden>
                                  <Building2 size={16} strokeWidth={1.75} />
                                </span>
                                <span className="pd-org__unit-name">
                                  {department.name}
                                </span>
                              </Link>
                            </div>
                          </td>
                          <td>
                            <PersonCell person={department.head} />
                          </td>
                          <td>{department.teams.length}</td>
                          <td>{department.headcount}</td>
                        </tr>
                        {isOpen
                          ? teamsInView.map((team) => (
                              <tr
                                key={team.id}
                                className="pd-org__team-row"
                              >
                                <td>
                                  <div className="pd-org__name-cell">
                                    <span
                                      className="pd-org__expand-spacer"
                                      aria-hidden
                                    />
                                    <Link
                                      to={teamDetailPath(team.id)}
                                      className="pd-org__unit-link"
                                    >
                                      <span
                                        className="pd-org__unit-icon"
                                        aria-hidden
                                      >
                                        <UsersRound
                                          size={16}
                                          strokeWidth={1.75}
                                        />
                                      </span>
                                      <span className="pd-org__unit-name">
                                        {team.name}
                                      </span>
                                    </Link>
                                  </div>
                                </td>
                                <td>
                                  <PersonCell
                                    person={team.manager}
                                    size="sm"
                                  />
                                </td>
                                <td className="pd-org__muted">Team</td>
                                <td>{team.headcount}</td>
                              </tr>
                            ))
                          : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </ResizableTable>
            </div>
          )
        ) : filteredTeams.length === 0 ? (
          <p className="pd-people__empty">No teams match your filters.</p>
        ) : (
          <div className={tableDensityWrapClass(tableDensity)}>
            <ResizableTable
              className="pd-people__table"
              storageKey="organisation-teams-column-widths"
              columns={teamColumns}
            >
              <tbody>
                {filteredTeams.map((team) => (
                  <tr key={team.id}>
                    <td>
                      <div className="pd-org__name-cell">
                        <Link
                          to={teamDetailPath(team.id)}
                          className="pd-org__unit-link"
                        >
                          <span className="pd-org__unit-icon" aria-hidden>
                            <UsersRound size={16} strokeWidth={1.75} />
                          </span>
                          <span className="pd-org__unit-name">{team.name}</span>
                        </Link>
                      </div>
                    </td>
                    <td>
                      <Link
                        to={departmentDetailPath(
                          team.departmentName.trim().toLowerCase() ||
                            'unassigned',
                        )}
                        className="pd-org__unit-link pd-org__unit-link--plain"
                      >
                        {team.departmentName}
                      </Link>
                    </td>
                    <td>
                      <PersonCell person={team.manager} />
                    </td>
                    <td>{team.headcount}</td>
                  </tr>
                ))}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </section>
    </div>
  )
}
