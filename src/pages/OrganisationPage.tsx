import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useMatch, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react'
import { OrgChartLink } from '@/components/OrgChartLink'
import {
  AttributeFilters,
  Avatar,
  EmptyState,
  PageStatus,
  PageStatusRetry,
  ResizableTable,
  type ResizableColumn,
} from '@/components/ui'
import {
  matchesAttributeFilters,
  uniqueAttributeValues,
  type AttributeFilterMap,
  type AttributeValue,
} from '@/lib/filters/attributeFilters'
import { useAuth } from '@/lib/auth'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'
import { useOrganisation, useOrganisationCatalogs } from '@/lib/employees/useEmployees'
import {
  departmentDetailPath,
  organisationTabPath,
  roleCreatePath,
  roleDetailPath,
  teamCreatePath,
  teamDetailPath,
  type OrganisationTabId,
} from '@/lib/organisation/paths'
import { listRolesWithHeadcount } from '@/lib/roles/inheritedSkills'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useRolesCatalog } from '@/lib/roles/useRoles'
import type { OrgDepartment, OrgPersonRef, OrgTeam } from '@/lib/organisation/types'
import { RoleFormFields } from '@/pages/org/RoleFormEditor'
import { SettingsSidePanel } from '@/pages/reviews/SettingsSidePanel'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

type StructureView = OrganisationTabId

function tabFromPathname(pathname: string): StructureView {
  if (pathname.startsWith('/organisation/roles')) return 'roles'
  if (pathname.startsWith('/organisation/teams')) return 'teams'
  return 'departments'
}

function PersonCell({
  person,
  size = 'md',
}: {
  person: OrgPersonRef | null
  size?: 'sm' | 'md'
}) {
  if (!person) {
    return <span className="pd-org__muted">-</span>
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

function departmentTeamNames(department: OrgDepartment): string[] {
  if (department.teams.length === 0) return ['']
  return department.teams.map((team) => team.name.trim())
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
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const createRoleMatch = useMatch('/organisation/roles/new')
  const isCreatingRole = Boolean(createRoleMatch)
  const canCreateRole = hasSystemPermission(
    user?.permissions,
    'platform.write_all',
  )
  const catalogs = useOrganisationCatalogs()
  const { roles } = useRolesCatalog()
  const {
    employees,
    organisation: snapshot,
    loadState,
    loadError,
    isLoading,
  } = useOrganisation(catalogs.departments, { teams: catalogs.teams })
  const activeView = tabFromPathname(pathname)
  const [query, setQuery] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilterMap>(
    {},
  )
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (isCreatingRole && !canCreateRole) {
      navigate(organisationTabPath('roles'), { replace: true })
    }
  }, [canCreateRole, isCreatingRole, navigate])

  function closeCreateRolePanel() {
    navigate(organisationTabPath('roles'), { replace: true })
  }

  const q = query.trim().toLowerCase()

  const filteredDepartments = useMemo(() => {
    return snapshot.departments
      .filter((department) => {
        if (mineOnly && !isMyDepartment(department, user, employees)) {
          return false
        }
        if (
          !matchesAttributeFilters(attributeFilters, {
            name: department.name.trim(),
            owner: department.head?.fullName.trim() ?? '',
            team: departmentTeamNames(department),
          })
        ) {
          return false
        }
        return departmentMatchesQuery(department, q)
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
  }, [attributeFilters, employees, mineOnly, q, snapshot.departments, user])

  const filteredTeams = useMemo(() => {
    return snapshot.teams
      .filter((team) => {
        if (mineOnly && !isMyTeam(team, user, employees)) return false
        if (
          !matchesAttributeFilters(attributeFilters, {
            name: team.name.trim(),
            department: team.departmentName.trim(),
            owner: team.manager?.fullName.trim() ?? '',
          })
        ) {
          return false
        }
        return teamMatchesQuery(team, q)
      })
      .sort((a, b) => {
        const byDept = a.departmentName.localeCompare(b.departmentName, undefined, {
          sensitivity: 'base',
        })
        if (byDept !== 0) return byDept
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })
  }, [attributeFilters, employees, mineOnly, q, snapshot.teams, user])

  const rolesWithHeadcount = useMemo(
    () => listRolesWithHeadcount(),
    [employees, roles],
  )

  const filteredRoles = useMemo(() => {
    const myRoleId = (() => {
      if (!user) return null
      const email = user.email?.trim().toLowerCase()
      const me = email
        ? employees.find((employee) => employee.email.toLowerCase() === email)
        : undefined
      return me?.roleId ?? null
    })()
    return rolesWithHeadcount
      .filter((role) => {
        if (mineOnly && myRoleId && role.id !== myRoleId) return false
        if (
          !matchesAttributeFilters(attributeFilters, {
            name: role.name.trim(),
            department: role.departmentName.trim(),
          })
        ) {
          return false
        }
        if (!q) return true
        return [
          role.name,
          role.departmentName,
          ...role.skills.map((skill) => skill.skillName),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
      )
  }, [attributeFilters, employees, mineOnly, q, rolesWithHeadcount, user])

  function toggleExpanded(departmentId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(departmentId)) next.delete(departmentId)
      else next.add(departmentId)
      return next
    })
  }

  const hasPeople = employees.some((e) => e.isActive)
  const hasStructure =
    hasPeople || snapshot.departments.length > 0 || rolesWithHeadcount.length > 0
  /** Hold totals until catalog merges — otherwise employee-only counts flash first. */
  const structurePending = isLoading || !catalogs.ready
  const peopleCount = useMemo(
    () =>
      snapshot.departments.reduce(
        (total, department) => total + department.headcount,
        0,
      ),
    [snapshot.departments],
  )
  const departmentTotal = structurePending ? '…' : snapshot.departments.length
  const teamTotal = structurePending ? '…' : snapshot.teams.length
  const roleTotal = structurePending ? '…' : rolesWithHeadcount.length
  const peopleTotal = structurePending ? '…' : peopleCount

  useEffect(() => {
    setAttributeFilters({})
  }, [activeView])

  const orgAttributes = useMemo(() => {
    if (activeView === 'roles') {
      return [
        { id: 'name', label: 'Role name', icon: Briefcase },
        { id: 'department', label: 'Department', icon: Building2 },
      ]
    }
    if (activeView === 'departments') {
      return [
        { id: 'name', label: 'Department name', icon: Building2 },
        { id: 'team', label: 'Team', icon: UsersRound },
        { id: 'owner', label: 'Owner', icon: UserRound },
      ]
    }
    return [
      { id: 'name', label: 'Team name', icon: UsersRound },
      { id: 'department', label: 'Department', icon: Building2 },
      { id: 'owner', label: 'Owner', icon: UserRound },
    ]
  }, [activeView])

  const orgAttributeValues = useMemo((): Record<string, AttributeValue[]> => {
    if (activeView === 'roles') {
      return {
        name: uniqueAttributeValues(rolesWithHeadcount.map((role) => role.name)),
        department: uniqueAttributeValues(
          rolesWithHeadcount.map((role) => role.departmentName),
        ),
      }
    }
    if (activeView === 'departments') {
      return {
        name: uniqueAttributeValues(
          snapshot.departments.map((department) => department.name),
        ),
        team: uniqueAttributeValues(
          snapshot.departments.flatMap((department) =>
            departmentTeamNames(department),
          ),
        ),
        owner: uniqueAttributeValues(
          snapshot.departments.map(
            (department) => department.head?.fullName ?? '',
          ),
        ),
      }
    }
    return {
      name: uniqueAttributeValues(snapshot.teams.map((team) => team.name)),
      department: uniqueAttributeValues(
        snapshot.teams.map((team) => team.departmentName),
      ),
      owner: uniqueAttributeValues(
        snapshot.teams.map((team) => team.manager?.fullName ?? ''),
      ),
    }
  }, [activeView, rolesWithHeadcount, snapshot.departments, snapshot.teams])
  const selectedTeams = attributeFilters.team ?? []
  const mineLabel =
    activeView === 'departments'
      ? 'My Department'
      : activeView === 'teams'
        ? 'My Teams'
        : 'My Role'
  const departmentColumns = useMemo<ResizableColumn[]>(
    () => [
      {
        id: 'department',
        label: 'Department',
        name: 'Department',
        grow: true,
      },
      { id: 'owner', label: 'Owner' },
      { id: 'teams', label: 'Teams' },
      { id: 'headcount', label: 'Headcount' },
    ],
    [],
  )
  const teamColumns = useMemo<ResizableColumn[]>(
    () => [
      {
        id: 'team',
        label: 'Team',
        name: 'Team',
        grow: true,
      },
      { id: 'department', label: 'Department' },
      { id: 'owner', label: 'Owner' },
      { id: 'headcount', label: 'Headcount' },
    ],
    [],
  )
  const roleColumns = useMemo<ResizableColumn[]>(
    () => [
      { id: 'role', label: 'Role', name: 'Role', grow: true },
      { id: 'department', label: 'Department' },
      { id: 'headcount', label: 'Headcount' },
      { id: 'skills', label: 'Skills' },
    ],
    [],
  )

  if (catalogs.ready && catalogs.error) {
    return (
      <PageStatus
        variant="error"
        pageClassName="pd-people pd-org"
        aria-label="Organisation"
        title="Could not load organisation"
        description="Departments and teams did not load. This is not an empty organisation."
        action={<PageStatusRetry label="Retry" onClick={catalogs.reload} />}
      />
    )
  }

  return (
    <div
      className="pd-page pd-page--pane pd-page--wide pd-people pd-org"
      aria-label="Organisation"
    >
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Structure totals"
      >
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">
            <Building2 size={14} strokeWidth={1.75} aria-hidden />
            Departments
          </span>
          <span className="pd-people__summary-value">{departmentTotal}</span>
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">
            <UsersRound size={14} strokeWidth={1.75} aria-hidden />
            Teams
          </span>
          <span className="pd-people__summary-value">{teamTotal}</span>
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">
            <Briefcase size={14} strokeWidth={1.75} aria-hidden />
            Roles
          </span>
          <span className="pd-people__summary-value">{roleTotal}</span>
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">
            <Users size={14} strokeWidth={1.75} aria-hidden />
            People
          </span>
          <span className="pd-people__summary-value">{peopleTotal}</span>
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
                  : activeView === 'teams'
                    ? 'Search teams…'
                    : 'Search roles…'
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
          <AttributeFilters
            attributes={orgAttributes}
            valuesFor={(id) => orgAttributeValues[id] ?? []}
            selected={attributeFilters}
            onChange={setAttributeFilters}
            sectionLabel="Organisation attributes"
          />
          <OrgChartLink />
          {activeView === 'roles' ? (
            canCreateRole ? (
              <Link
                to={roleCreatePath()}
                className="pd-people__create-btn"
              >
                <Plus size={18} strokeWidth={2} aria-hidden />
                Add Role
              </Link>
            ) : null
          ) : activeView === 'teams' ? (
            canCreateRole ? (
              <Link to={teamCreatePath()} className="pd-people__create-btn">
                <Plus size={18} strokeWidth={2} aria-hidden />
                Add Team
              </Link>
            ) : null
          ) : canCreateRole ? (
            <Link
              to="/organisation/departments/new"
              className="pd-people__create-btn"
            >
              <Plus size={18} strokeWidth={2} aria-hidden />
              Add Department
            </Link>
          ) : null}
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="org-structure-heading"
      >
        <h2 id="org-structure-heading" className="pd-sr-only">
          {activeView === 'departments'
            ? 'Departments'
            : activeView === 'teams'
              ? 'Teams'
              : 'Roles'}
        </h2>

            {structurePending ? (
              <p className="pd-people__empty">
                Loading organisation from the live database…
              </p>
            ) : loadState === 'error' && !hasStructure ? (
              <p className="pd-people__empty">
                {loadError ?? 'Failed to load organisation.'}
              </p>
            ) : !hasStructure ? (
              <div className="pd-people__empty-state">
                <EmptyState
                  className="pd-people__empty-panel"
                  icon={Building2}
                  title="No Organisation Yet"
                  description="Organisation is built from departments and teams. Add a department to get started, then assign people from the People directory."
                  action={
                    canCreateRole ? (
                      <Link
                        to="/organisation/departments/new"
                        className="pd-people__create-btn"
                      >
                        <Plus size={18} strokeWidth={2} aria-hidden />
                        Add Department
                      </Link>
                    ) : undefined
                  }
                />
              </div>
            ) : activeView === 'departments' ? (
          filteredDepartments.length === 0 ? (
            <div className="pd-people__empty-state">
              <EmptyState
                className="pd-people__empty-panel"
                icon={Building2}
                title="No Matches"
                description="No departments match your filters."
              />
            </div>
          ) : (
            <div className="pd-people__table-wrap">
              <ResizableTable
                className="pd-people__table pd-org__departments-table"
                storageKey="organisation-departments-column-widths"
                columns={departmentColumns}
              >
                <tbody>
                  {filteredDepartments.map((department) => {
                    const teamsInView = department.teams.filter((team) => {
                      if (
                        selectedTeams.length > 0 &&
                        !selectedTeams.includes(team.name.trim())
                      ) {
                        return false
                      }
                      return teamMatchesQuery(team, q)
                    })
                    const isOpen =
                      expanded.has(department.id) || selectedTeams.length > 0
                    return (
                      <Fragment key={department.id}>
                        <tr
                          className={
                            isOpen && teamsInView.length > 0
                              ? 'pd-org__row--open'
                              : undefined
                          }
                        >
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
                          ? teamsInView.map((team, index) => (
                              <tr
                                key={team.id}
                                className={[
                                  'pd-org__team-row',
                                  index === teamsInView.length - 1
                                    ? 'pd-org__team-row--last'
                                    : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                              >
                                <td>
                                  <div className="pd-org__name-cell">
                                    <span
                                      className="pd-org__branch"
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
                                <td className="pd-org__muted">-</td>
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
        ) : activeView === 'roles' ? (
          filteredRoles.length === 0 ? (
            <div className="pd-people__empty-state">
              <EmptyState
                className="pd-people__empty-panel"
                icon={Briefcase}
                title="No Matches"
                description="No roles match your filters."
              />
            </div>
          ) : (
            <div className="pd-people__table-wrap">
              <ResizableTable
                className="pd-people__table"
                storageKey="organisation-roles-column-widths"
                columns={roleColumns}
              >
                <tbody>
                  {filteredRoles.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <div className="pd-org__name-cell">
                          <Link
                            to={roleDetailPath(role.id)}
                            className="pd-org__unit-link"
                          >
                            <span className="pd-org__unit-icon" aria-hidden>
                              <Briefcase size={16} strokeWidth={1.75} />
                            </span>
                            <span className="pd-org__unit-name">{role.name}</span>
                          </Link>
                        </div>
                      </td>
                      <td>{role.departmentName || '-'}</td>
                      <td>{role.headcount}</td>
                      <td>
                        {role.skills.length > 0
                          ? role.skills.map((skill) => skill.skillName).join(', ')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ResizableTable>
            </div>
          )
        ) : filteredTeams.length === 0 ? (
          <div className="pd-people__empty-state">
            <EmptyState
              className="pd-people__empty-panel"
              icon={UsersRound}
              title="No Matches"
              description="No teams match your filters."
            />
          </div>
        ) : (
          <div className="pd-people__table-wrap">
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

      {isCreatingRole && canCreateRole ? (
        <SettingsSidePanel
          label="Add Role"
          closeLabel="Close role panel"
          defaultWidth={480}
          onClose={closeCreateRolePanel}
        >
          <RoleFormFields
            onCancel={closeCreateRolePanel}
            onSaved={closeCreateRolePanel}
          />
        </SettingsSidePanel>
      ) : null}
    </div>
  )
}
