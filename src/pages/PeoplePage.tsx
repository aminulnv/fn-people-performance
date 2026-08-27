import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Plus,
  Search,
  UserCheck,
  UserX,
  Users,
  UsersRound,
} from 'lucide-react'
import { OrgChartLink } from '@/components/OrgChartLink'
import { EmptyState, SegmentedControl } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import {
  useHydrateManagerDelegations,
  useManagerDelegationsRevision,
} from '@/lib/delegations/useManagerDelegations'
import { useEmployees } from '@/lib/employees/useEmployees'
import {
  hashForPeopleScope,
  peopleScopeFromHash,
  type DirectoryScope,
} from '@/pages/people/directoryHashes'
import {
  activeDirectoryFilterCount,
  directoryStats,
  employeeSearchHaystack,
  filterDirectory,
  type DirectoryAttributeFilters,
  type StatusFilter,
} from '@/pages/people/filterDirectory'
import { PeopleDirectoryTable } from '@/pages/people/PeopleDirectoryTable'
import { PeopleFilters } from '@/pages/people/PeopleFilters'
import { PeopleProfileDrawer } from '@/pages/people/PeopleProfileDrawer'
import { useUrlHashTab } from '@/lib/routing/urlHash'
import '@/styles/layout-people.css'

const SCOPES: { id: DirectoryScope; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'reports', label: 'My Reports' },
  { id: 'department', label: 'My Department' },
]

export type PeoplePageProps = {
  /** Soft-rect radius preview at `/people-v3` (canonical `/people` uses Org pills). */
  variant?: 'v3'
}

export default function PeoplePage({ variant }: PeoplePageProps = {}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { employees, loadState, loadError } = useEmployees()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const selectedEmployeeId = useMemo(() => {
    const raw = Number(searchParams.get('employee'))
    return Number.isInteger(raw) && raw > 0 ? raw : null
  }, [searchParams])

  function setSelectedEmployeeId(next: number | null) {
    const params = new URLSearchParams(searchParams)
    if (next) params.set('employee', String(next))
    else params.delete('employee')
    const search = params.toString()
    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        hash: location.hash,
      },
      { replace: true },
    )
  }
  const [scope, setScope] = useUrlHashTab<DirectoryScope>({
    defaultTab: 'all',
    tabFromHash: peopleScopeFromHash,
    hashFromTab: hashForPeopleScope,
  })
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null)
  const [attributeFilters, setAttributeFilters] =
    useState<DirectoryAttributeFilters>({})

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
  const searchHaystacks = useMemo(
    () =>
      new Map(
        employees.map((employee) => [
          employee.employeeId,
          employeeSearchHaystack(employee),
        ]),
      ),
    [employees],
  )

  function toggleStatusFilter(next: StatusFilter) {
    setStatusFilter((current) => (current === next ? null : next))
  }

  const stats = useMemo(() => directoryStats(employees), [employees])

  const coversRevision = useManagerDelegationsRevision()
  useHydrateManagerDelegations(user?.employeeId ?? undefined)

  const me = useMemo(() => {
    const email = user?.email?.trim().toLowerCase()
    if (!email) return null
    return (
      employees.find(
        (employee) => employee.email.trim().toLowerCase() === email,
      ) ?? null
    )
  }, [employees, user?.email])

  const filtered = useMemo(
    () =>
      filterDirectory(employees, {
        query: deferredQuery,
        scope,
        statusFilter,
        me,
        haystacks: searchHaystacks,
        attributeFilters,
      }),
    [
      attributeFilters,
      coversRevision,
      deferredQuery,
      employees,
      me,
      scope,
      searchHaystacks,
      statusFilter,
    ],
  )

  const activeFilterCount = activeDirectoryFilterCount(
    statusFilter,
    attributeFilters,
  )

  return (
    <div
      className={[
        'pd-page',
        'pd-page--pane',
        'pd-page--wide',
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
          {filtered.length !== employees.length || activeFilterCount > 0 ? (
            <p className="pd-people__stat">{filtered.length} shown</p>
          ) : null}

          <div
            className="pd-people__toolbar"
            role="toolbar"
            aria-label="People actions"
          >
            <PeopleFilters
              employees={employees}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              attributeFilters={attributeFilters}
              onAttributeFiltersChange={setAttributeFilters}
            />
            <OrgChartLink />
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
          People Directory
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
            <EmptyState
              className="pd-empty--inline"
              icon={Users}
              title="No Employees Yet"
              description="Add people to the directory to get started."
              action={
                <Link to="/people/new" className="pd-people__create-btn">
                  <Plus size={18} strokeWidth={2} aria-hidden />
                  Add Employee
                </Link>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            className="pd-people__empty-panel"
            icon={Users}
            title="No People Match Your Filters"
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
                  setAttributeFilters({})
                }}
              >
                Clear Filters
              </button>
            }
          />
        ) : (
          <PeopleDirectoryTable
            employees={filtered}
            employeesById={employeesById}
            employeesByName={employeesByName}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
          />
        )}
      </section>
      {selectedEmployeeId ? (
        <PeopleProfileDrawer
          employeeId={selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
        />
      ) : null}
    </div>
  )
}
