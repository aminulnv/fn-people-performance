import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpDown,
  MoreHorizontal,
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

function PersonCell({
  name,
  size = 'md',
  to,
}: {
  name: string
  size?: 'sm' | 'md'
  to?: string
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
        size={size}
        className="pd-people__avatar"
        style={avatarStyle(name)}
      />
      {label}
    </div>
  )
}

export default function PeoplePage() {
  const { user } = useAuth()
  const { employees, loadState, loadError } = useEmployees()
  const [query, setQuery] = useState('')
  const [myReportsOnly, setMyReportsOnly] = useState(false)

  const activeCount = employees.filter((e) => e.isActive).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...employees]
      .filter((employee) => {
        if (myReportsOnly && user?.email) {
          if (
            employee.managerEmail.trim().toLowerCase() !==
            user.email.trim().toLowerCase()
          ) {
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
  }, [employees, myReportsOnly, query, user?.email])

  return (
    <div className="pd-page pd-people" aria-label="People">
      <div className="pd-people__header pd-people__header--row">
        <p className="pd-people__stat">
          {activeCount} Active
          {employees.length !== activeCount
            ? ` · ${employees.length} total`
            : null}
        </p>

        <div className="pd-people__toolbar">
          <button
            type="button"
            className="pd-people__icon-btn"
            aria-label="More actions"
            title="More actions"
          >
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
          </button>
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
          <Link to="/organisation/chart" className="pd-people__ghost-btn">
            <Network size={16} strokeWidth={1.75} aria-hidden />
            View org chart
          </Link>
        </div>
      </div>

      <div className="pd-people__filters" role="toolbar" aria-label="People filters">
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
        <button
          type="button"
          className={[
            'pd-people__chip',
            myReportsOnly ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={myReportsOnly}
          onClick={() => setMyReportsOnly((v) => !v)}
        >
          My reports
        </button>
      </div>

      <section className="pd-people__panel pd-people__panel--table" aria-labelledby="directory-heading">
        <h2 id="directory-heading" className="pd-sr-only">
          People directory
        </h2>

        {loadState === 'loading' && employees.length === 0 ? (
          <p className="pd-people__empty">Loading people from the live database…</p>
        ) : loadState === 'error' && employees.length === 0 ? (
          <p className="pd-people__empty">{loadError ?? 'Failed to load people.'}</p>
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
