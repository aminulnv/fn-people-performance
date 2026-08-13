import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpDown,
  Network,
  Plus,
  Search,
  Settings,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { avatarStyle } from '@/lib/employees/avatar'
import { useEmployees } from '@/lib/employees/useEmployees'
import '@/styles/layout-people.css'

type DirectoryScope = 'all' | 'reports' | 'department'

const SCOPES: { id: DirectoryScope; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'reports', label: 'My reports' },
  { id: 'department', label: 'My department' },
]

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
  /** Soft-rect radius preview — compare with default pill `/people`. */
  variant?: 'v3'
}

export default function PeoplePage({ variant }: PeoplePageProps = {}) {
  const { user } = useAuth()
  const { employees, loadState, loadError } = useEmployees()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<DirectoryScope>('all')

  const activeCount = employees.filter((e) => e.isActive).length
  const isV3 = variant === 'v3'

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
      .sort((a, b) => a.employeeId - b.employeeId)
  }, [employees, me, query, scope])

  return (
    <div
      className={['pd-page', 'pd-people', isV3 ? 'pd-people--v3' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="People"
    >
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
            <div
              className="pd-people__scope"
              role="group"
              aria-label="Directory scope"
            >
              {SCOPES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={[
                    'pd-people__scope-btn',
                    scope === option.id ? 'is-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={scope === option.id}
                  onClick={() => setScope(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pd-people__bar-end">
          <p className="pd-people__stat">
            {filtered.length === employees.length
              ? `${activeCount} Active`
              : `${filtered.length} shown`}
            {employees.length !== activeCount &&
              filtered.length === employees.length
              ? ` · ${employees.length} total`
              : null}
          </p>

          <div
            className="pd-people__toolbar"
            role="toolbar"
            aria-label="People actions"
          >
            <Link to="/organisation/chart" className="pd-people__ghost-btn">
              <Network size={16} strokeWidth={1.75} aria-hidden />
              Org chart
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
              Add employee
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
              Add employee
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="pd-people__empty">No people match your filters.</p>
        ) : (
          <div className="pd-people__table-wrap">
            <table className="pd-people__table">
              <thead>
                <tr>
                  <th>
                    <span className="pd-people__th">
                      Employee ID
                      <ArrowUpDown size={13} strokeWidth={1.75} aria-hidden />
                      <span className="pd-people__th-count">
                        {filtered.length}
                      </span>
                    </span>
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Start date</th>
                  <th>Job title</th>
                  <th>Department</th>
                  <th>Team</th>
                  <th>Division</th>
                  <th>Reports to</th>
                  <th>Department head</th>
                  <th>HRBP</th>
                  <th>Job Grade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => (
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
                        <PersonCell name={employee.reportsToName} size="sm" />
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
