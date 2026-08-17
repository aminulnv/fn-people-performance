import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpDown,
  Building2,
  Network,
  Plus,
  Search,
  Settings,
  UserCheck,
  UserX,
  Users,
  UsersRound,
} from 'lucide-react'
import {
  Avatar,
  EmptyState,
  ResizableTable,
  SegmentedControl,
  type ResizableColumn,
} from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { avatarStyle } from '@/lib/employees/avatar'
import { useEmployees } from '@/lib/employees/useEmployees'
import '@/styles/layout-people.css'

type DirectoryScope = 'all' | 'reports' | 'department'
type StatusFilter = 'all' | 'active' | 'inactive'

const SCOPES: { id: DirectoryScope; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'reports', label: 'My Reports' },
  { id: 'department', label: 'My Department' },
]

const PEOPLE_COLUMNS: ResizableColumn[] = [
  {
    id: 'employee-id',
    label: (
      <span className="pd-people__th">
        Employee ID
        <ArrowUpDown size={13} strokeWidth={1.75} aria-hidden />
      </span>
    ),
    name: 'Employee ID',
  },
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'start-date', label: 'Start date' },
  { id: 'job-title', label: 'Job title' },
  { id: 'department', label: 'Department' },
  { id: 'team', label: 'Team' },
  { id: 'division', label: 'Division' },
  { id: 'reports-to', label: 'Reports to' },
  { id: 'department-head', label: 'Department head' },
  { id: 'hrbp', label: 'HRBP' },
  { id: 'job-grade', label: 'Job Grade' },
  { id: 'status', label: 'Status' },
]

function uniqueNonEmpty(values: string[]): number {
  return new Set(values.map((v) => v.trim()).filter(Boolean)).size
}

function PersonCell({
  name,
  size = 'md',
  to,
  avatarUrl,
}: {
  name: string
  size?: 'sm' | 'md'
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
        size={size}
        className="pd-people__avatar"
        style={avatarStyle(name)}
      />
      {label}
    </div>
  )
}

export type PeoplePageProps = {
  /** Soft-rect radius preview at `/people-v3` (canonical `/people` uses Org pills). */
  variant?: 'v3'
}

export default function PeoplePage({ variant }: PeoplePageProps = {}) {
  const { user } = useAuth()
  const { employees, loadState, loadError } = useEmployees()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<DirectoryScope>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null)

  const isV3 = variant === 'v3'
  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.employeeId, employee])),
    [employees],
  )
  const employeesByName = useMemo(
    () =>
      new Map(
        employees.map((employee) => [
          employee.fullName.trim().toLocaleLowerCase(),
          employee,
        ]),
      ),
    [employees],
  )

  function toggleStatusFilter(next: StatusFilter) {
    setStatusFilter((current) => (current === next ? null : next))
  }

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.isActive).length
    return {
      total: employees.length,
      active,
      inactive: employees.length - active,
      departments: uniqueNonEmpty(employees.map((e) => e.department)),
      teams: uniqueNonEmpty(employees.map((e) => e.team)),
    }
  }, [employees])

  const me = useMemo(() => {
    const email = user?.email?.trim().toLowerCase()
    if (!email) return null
    return (
      employees.find(
        (employee) => employee.email.trim().toLowerCase() === email,
      ) ?? null
    )
  }, [employees, user?.email])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const myEmail = me?.email.trim().toLowerCase() ?? ''
    const myDepartment = me?.department.trim() ?? ''

    return [...employees]
      .filter((employee) => {
        if (statusFilter === 'active' && !employee.isActive) return false
        if (statusFilter === 'inactive' && employee.isActive) return false
        if (me && scope === 'reports') {
          if (employee.managerEmail.trim().toLowerCase() !== myEmail) {
            return false
          }
        }
        if (me && scope === 'department') {
          if (!myDepartment || employee.department.trim() !== myDepartment) {
            return false
          }
        }
        if (!q) return true
        const haystack = [
          String(employee.employeeId),
          employee.fullName,
          employee.email,
          employee.startDate,
          employee.jobTitle,
          employee.department,
          employee.team,
          employee.division,
          employee.reportsToName,
          employee.departmentHeadName,
          employee.hrbpName,
          employee.jobGrade,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => {
        const aDept = a.department.trim()
        const bDept = b.department.trim()
        const aBlank = aDept === ''
        const bBlank = bDept === ''
        if (aBlank !== bBlank) return aBlank ? 1 : -1
        const byDept = aDept.localeCompare(bDept, undefined, {
          sensitivity: 'base',
        })
        if (byDept !== 0) return byDept
        return a.fullName.localeCompare(b.fullName, undefined, {
          sensitivity: 'base',
        })
      })
  }, [employees, me, query, scope, statusFilter])

  return (
    <div
      className={[
        'pd-page',
        'pd-page--pane',
        'pd-people',
        isV3 ? 'pd-people--v3' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="People"
    >
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Directory totals"
      >
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'all' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'all'}
          onClick={() => toggleStatusFilter('all')}
        >
          <span className="pd-people__summary-label">
            <Users size={14} strokeWidth={1.75} aria-hidden />
            People
          </span>
          <span className="pd-people__summary-value">{stats.total}</span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'active' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'active'}
          onClick={() => toggleStatusFilter('active')}
        >
          <span className="pd-people__summary-label">
            <UserCheck size={14} strokeWidth={1.75} aria-hidden />
            Active
          </span>
          <span className="pd-people__summary-value">{stats.active}</span>
        </button>
        <button
          type="button"
          className={[
            'pd-people__summary-btn',
            statusFilter === 'inactive' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={statusFilter === 'inactive'}
          onClick={() => toggleStatusFilter('inactive')}
        >
          <span className="pd-people__summary-label">
            <UserX size={14} strokeWidth={1.75} aria-hidden />
            Inactive
          </span>
          <span className="pd-people__summary-value">{stats.inactive}</span>
        </button>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">
            <Building2 size={14} strokeWidth={1.75} aria-hidden />
            Departments
          </span>
          <span className="pd-people__summary-value">{stats.departments}</span>
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">
            <UsersRound size={14} strokeWidth={1.75} aria-hidden />
            Teams
          </span>
          <span className="pd-people__summary-value">{stats.teams}</span>
        </div>
      </div>

      <div className="pd-people__header pd-people__header--bar">
        <div className="pd-people__bar-start">
          <label className="pd-people__search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <span className="pd-sr-only">Search people</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="pd-people__search-input"
            />
          </label>

          {me ? (
            <SegmentedControl
              className="pd-people__scope"
              buttonClassName="pd-people__scope-btn"
              options={SCOPES}
              value={scope}
              onChange={setScope}
              aria-label="Directory scope"
            />
          ) : null}
        </div>

        <div className="pd-people__bar-end">
          {filtered.length !== employees.length ||
          statusFilter === 'active' ||
          statusFilter === 'inactive' ? (
            <p className="pd-people__stat">{filtered.length} shown</p>
          ) : null}

          <div
            className="pd-people__toolbar"
            role="toolbar"
            aria-label="People actions"
          >
            <Link to="/organisation/chart" className="pd-people__ghost-btn">
              <Network size={16} strokeWidth={1.75} aria-hidden />
              Org Chart
            </Link>
            <button
              type="button"
              className="pd-people__ghost-btn"
              title="People settings"
            >
              <Settings size={16} strokeWidth={1.75} aria-hidden />
              Settings
            </button>
            <Link to="/people/new" className="pd-people__create-btn">
              <Plus size={18} strokeWidth={2} aria-hidden />
              Add Employee
            </Link>
          </div>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="directory-heading"
      >
        <h2 id="directory-heading" className="pd-sr-only">
          People directory
        </h2>

        {loadState === 'loading' && employees.length === 0 ? (
          <p className="pd-people__empty">
            Loading people from the live database…
          </p>
        ) : loadState === 'error' && employees.length === 0 ? (
          <p className="pd-people__empty">
            {loadError ?? 'Failed to load people.'}
          </p>
        ) : employees.length === 0 ? (
          <div className="pd-people__empty-state">
            <p className="pd-people__empty">No employees yet.</p>
            <Link
              to="/people/new"
              className="pd-people__create-btn pd-people__create-btn--secondary"
            >
              <Plus size={18} strokeWidth={2} aria-hidden />
              Add Employee
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            className="pd-people__empty-panel"
            icon={Users}
            title="No people match your filters"
            description={
              query.trim()
                ? `No one matches “${query.trim()}” with the filters you have applied. Try a different search or clear filters.`
                : 'These filters exclude everyone. Try clearing them to see the full directory.'
            }
            action={
              <button
                type="button"
                className="pd-people__create-btn"
                onClick={() => {
                  setQuery('')
                  setScope('all')
                  setStatusFilter(null)
                }}
              >
                Clear Filters
              </button>
            }
          />
        ) : (
          <div className="pd-people__table-wrap">
            <ResizableTable
              className="pd-people__table"
              storageKey="people-directory-column-widths"
              columns={PEOPLE_COLUMNS}
            >
              <tbody>
                {filtered.map((employee) => {
                  const manager =
                    (employee.reportsToId != null
                      ? employeesById.get(employee.reportsToId)
                      : undefined) ??
                    employeesByName.get(
                      employee.reportsToName.trim().toLocaleLowerCase(),
                    )

                  return (
                    <tr key={employee.employeeId}>
                      <td className="pd-people__id">{employee.employeeId}</td>
                      <td>
                        <PersonCell
                          name={employee.fullName}
                          avatarUrl={employee.avatarUrl}
                          to={`/people/${employee.employeeId}`}
                        />
                      </td>
                      <td>{employee.email || '—'}</td>
                      <td>{employee.startDate || '—'}</td>
                      <td>{employee.jobTitle || '—'}</td>
                      <td>{employee.department || '—'}</td>
                      <td>{employee.team || '—'}</td>
                      <td>{employee.division || '—'}</td>
                      <td>
                        {employee.reportsToName ? (
                          <PersonCell
                            name={employee.reportsToName}
                            size="sm"
                            avatarUrl={manager?.avatarUrl}
                            to={
                              manager
                                ? `/people/${manager.employeeId}`
                                : undefined
                            }
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{employee.departmentHeadName || '—'}</td>
                      <td>{employee.hrbpName || '—'}</td>
                      <td>{employee.jobGrade || '—'}</td>
                      <td>
                        <span
                          className={[
                            'pd-people__status',
                            employee.isActive
                              ? 'pd-people__status--active'
                              : 'pd-people__status--inactive',
                          ].join(' ')}
                        >
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </section>
    </div>
  )
}
