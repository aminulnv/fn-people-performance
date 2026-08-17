import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  CircleDot,
  GitBranch,
  Hash,
  HeartHandshake,
  Mail,
  MapPin,
  Network,
  Star,
  Target,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, EmptyState } from '@/components/ui'
import {
  findEmployeeByEmail,
  getEmployee,
  listEmployees,
} from '@/lib/employees/store'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { PlatformEmployee } from '@/lib/employees/types'
import { profileTabComingSoon } from '@/pages/ComingSoonPage'
import '@/styles/layout-people.css'
import '@/styles/layout-profile-v2.css'

const PROFILE_TABS: {
  id: 'profile' | 'performance' | 'goals' | 'team'
  label: string
  icon: LucideIcon
}[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'performance', label: 'Performance', icon: Star },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'team', label: 'Team', icon: Users },
]

function formatStartDate(iso: string): string {
  if (!iso) return ''
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTenure(iso: string): string {
  if (!iso) return ''
  const start = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(start.getTime())) return ''
  const now = new Date()
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  if (months < 0) return ''
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem}m`
  if (rem === 0) return `${years}y`
  return `${years}y ${rem}m`
}

function displayValue(value: string | null | undefined): string {
  return value?.trim() || ''
}

function findEmployeeByName(name: string): PlatformEmployee | null {
  const normalizedName = name.trim().toLocaleLowerCase()
  if (!normalizedName) return null
  return (
    listEmployees().find(
      (employee) =>
        employee.fullName.trim().toLocaleLowerCase() === normalizedName,
    ) ?? null
  )
}

function Field({
  label,
  icon: Icon,
  children,
  empty = '—',
}: {
  label: string
  icon: LucideIcon
  children?: ReactNode
  empty?: string
}) {
  const hasContent =
    children !== null &&
    children !== undefined &&
    children !== false &&
    children !== ''

  return (
    <div className="pd-profile-v2__field">
      <span className="pd-profile-v2__fkey">
        <Icon size={14} strokeWidth={1.75} aria-hidden />
        <span>{label}</span>
      </span>
      {hasContent ? (
        <span className="pd-profile-v2__fval">{children}</span>
      ) : (
        <span className="pd-profile-v2__fval is-empty">{empty}</span>
      )}
    </div>
  )
}

function resolveManager(
  employee: PlatformEmployee | null,
): PlatformEmployee | null {
  if (!employee) return null
  if (employee.reportsToId != null) {
    const match = getEmployee(employee.reportsToId)
    if (match) return match
  }
  if (employee.managerEmail) {
    const match = findEmployeeByEmail(employee.managerEmail)
    if (match) return match
  }
  return findEmployeeByName(employee.reportsToName)
}

function resolveDepartmentHead(
  employee: PlatformEmployee | null,
): PlatformEmployee | null {
  if (!employee) return null
  if (employee.departmentHeadId) {
    const match = getEmployee(employee.departmentHeadId)
    if (match) return match
  }
  return findEmployeeByName(employee.departmentHeadName)
}

function EmployeeProfileV2View({
  employee,
  manager,
  isSelf = false,
}: {
  employee: PlatformEmployee
  manager: PlatformEmployee | null
  isSelf?: boolean
}) {
  const [tab, setTab] = useState<(typeof PROFILE_TABS)[number]['id']>('profile')
  const departmentHead = resolveDepartmentHead(employee)
  const managerName = manager?.fullName || employee.reportsToName
  const departmentHeadName =
    departmentHead?.fullName || employee.departmentHeadName
  const directoryCount = listEmployees().length
  const startDate = formatStartDate(employee.startDate)
  const tenure = formatTenure(employee.startDate)

  const showDepartmentHead =
    Boolean(departmentHeadName) &&
    departmentHeadName !== managerName &&
    departmentHeadName !== employee.fullName

  return (
    <div
      className="pd-page pd-people pd-profile-v2"
      aria-label={employee.fullName}
    >
      <header className="pd-profile-v2__hd">
        <div className="pd-profile-v2__hd-inner">
          <div className="pd-profile-v2__hd-top">
            <nav className="pd-profile-v2__breadcrumb" aria-label="Breadcrumb">
              <Link to="/people-v2">People</Link>
              {employee.department ? (
                <>
                  <span className="pd-profile-v2__breadcrumb-sep" aria-hidden>
                    /
                  </span>
                  <span>{employee.department}</span>
                </>
              ) : null}
            </nav>

            <div className="pd-profile-v2__btn-group">
              <Link
                to={`/people/${employee.employeeId}/edit`}
                className="pd-profile-v2__btn pd-profile-v2__btn--primary"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          <div className="pd-profile-v2__hero">
            <div className="pd-profile-v2__av-wrap">
              <Avatar
                name={employee.fullName}
                src={employee.avatarUrl}
                size="lg"
                className="pd-profile-v2__av"
              />
              <div
                className={[
                  'pd-profile-v2__av-dot',
                  employee.isActive ? '' : 'pd-profile-v2__av-dot--inactive',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={employee.isActive ? 'Active' : 'Inactive'}
              />
            </div>

            <div className="pd-profile-v2__hero-info">
              <h1 className="pd-profile-v2__hero-name">{employee.fullName}</h1>
              <p className="pd-profile-v2__hero-title">
                {displayValue(employee.jobTitle) || 'Role not set'}
              </p>
            </div>
          </div>

          <div
            className="pd-profile-v2__tabs"
            role="tablist"
            aria-label="Employee sections"
          >
            {PROFILE_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={[
                  'pd-profile-v2__tab',
                  tab === item.id ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setTab(item.id)}
              >
                <item.icon size={15} strokeWidth={1.75} aria-hidden />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {tab === 'profile' ? (
        <div className="pd-profile-v2__body">
          <aside className="pd-profile-v2__rail" aria-label="Summary">
            <section className="pd-profile-v2__rail-block">
              <h2 className="pd-profile-v2__rail-heading">Contact</h2>
              {employee.email ? (
                <a
                  href={`mailto:${employee.email}`}
                  className="pd-profile-v2__contact"
                >
                  <Mail size={14} strokeWidth={2} aria-hidden />
                  <span>{employee.email}</span>
                </a>
              ) : (
                <p className="pd-profile-v2__rail-empty">No work email</p>
              )}
            </section>

            <section className="pd-profile-v2__rail-block">
              <h2 className="pd-profile-v2__rail-heading">Start date</h2>
              {startDate ? (
                <div className="pd-profile-v2__hire">
                  <span className="pd-profile-v2__hire-date">{startDate}</span>
                  {tenure ? (
                    <span className="pd-profile-v2__hire-tenure">{tenure}</span>
                  ) : null}
                </div>
              ) : (
                <p className="pd-profile-v2__rail-empty">Not set</p>
              )}
            </section>

            <section className="pd-profile-v2__rail-block">
              <h2 className="pd-profile-v2__rail-heading">Job</h2>
              <dl className="pd-profile-v2__rail-facts">
                <div>
                  <dt>ID</dt>
                  <dd>#{employee.employeeId}</dd>
                </div>
                <div>
                  <dt>Department</dt>
                  <dd>{displayValue(employee.department) || '—'}</dd>
                </div>
                <div>
                  <dt>Team</dt>
                  <dd>{displayValue(employee.team) || '—'}</dd>
                </div>
                <div>
                  <dt>Division</dt>
                  <dd>{displayValue(employee.division) || '—'}</dd>
                </div>
                <div>
                  <dt>Site</dt>
                  <dd>{displayValue(employee.site) || '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="pd-profile-v2__rail-block">
              <h2 className="pd-profile-v2__rail-heading">Manager</h2>
              {managerName ? (
                <div className="pd-profile-v2__person-card">
                  <Avatar
                    name={managerName}
                    src={manager?.avatarUrl}
                    size="md"
                    className="pd-profile-v2__person-av"
                  />
                  <div className="pd-profile-v2__person-text">
                    <div className="pd-profile-v2__person-name">{managerName}</div>
                    <div className="pd-profile-v2__person-role">
                      {manager?.jobTitle || 'Line manager'}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="pd-profile-v2__rail-empty">No manager set</p>
              )}
            </section>

            <nav className="pd-profile-v2__ql" aria-label="Directory links">
              <Link to="/organisation" className="pd-profile-v2__ql-item">
                Org Structures
                <span className="pd-profile-v2__ql-count">{directoryCount}</span>
                <span className="pd-profile-v2__ql-arr" aria-hidden>
                  ›
                </span>
              </Link>
              <Link
                to={isSelf ? '/organisation/chart' : '/people-v2'}
                className="pd-profile-v2__ql-item"
              >
                {isSelf ? 'View Org Chart' : 'Back to People'}
                <span className="pd-profile-v2__ql-arr" aria-hidden>
                  ›
                </span>
              </Link>
            </nav>
          </aside>

          <div className="pd-profile-v2__main">
            <section className="pd-profile-v2__section">
              <h2 className="pd-profile-v2__section-title">Employee details</h2>
              <div className="pd-profile-v2__fields">
                <Field label="Email" icon={Mail}>
                  {employee.email ? (
                    <a
                      href={`mailto:${employee.email}`}
                      className="pd-profile-v2__fval--lnk"
                    >
                      {employee.email}
                    </a>
                  ) : null}
                </Field>
                <Field label="Employee ID" icon={Hash}>
                  {employee.employeeId}
                </Field>
                <Field label="Status" icon={CircleDot}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </Field>
                <Field label="Role" icon={Briefcase}>
                  {displayValue(employee.jobTitle) || null}
                </Field>
                <Field label="Seniority" icon={Award}>
                  {displayValue(employee.jobGrade) || null}
                </Field>
                <Field label="Department" icon={Building2}>
                  {displayValue(employee.department) || null}
                </Field>
                <Field label="Team" icon={Users}>
                  {displayValue(employee.team) || null}
                </Field>
                <Field label="Division" icon={GitBranch}>
                  {displayValue(employee.division) || null}
                </Field>
                <Field label="Site" icon={MapPin}>
                  {displayValue(employee.site) || null}
                </Field>
                <Field label="Line manager" icon={UserRound}>
                  {displayValue(managerName) || null}
                </Field>
                <Field label="Department head" icon={Network}>
                  {displayValue(departmentHeadName) || null}
                </Field>
                <Field label="HRBP" icon={HeartHandshake}>
                  {displayValue(employee.hrbpName) || null}
                </Field>
                <Field label="Start date" icon={Calendar}>
                  {startDate || null}
                </Field>
              </div>
            </section>

            <section className="pd-profile-v2__section">
              <h2 className="pd-profile-v2__section-title">Reporting line</h2>
              <div className="pd-profile-v2__org-tree">
                {managerName ? (
                  <>
                    <div className="pd-profile-v2__org-node">
                      <Avatar
                        name={managerName}
                        src={manager?.avatarUrl}
                        size="md"
                        className="pd-profile-v2__org-av pd-profile-v2__org-av--mgr"
                      />
                      <div className="pd-profile-v2__org-text">
                        <div className="pd-profile-v2__org-name">{managerName}</div>
                        <div className="pd-profile-v2__org-role">
                          {manager?.jobTitle || 'Line manager'}
                        </div>
                      </div>
                      <span className="pd-profile-v2__tag pd-profile-v2__tag--mgr">
                        Mgr
                      </span>
                    </div>
                    <div className="pd-profile-v2__connector" aria-hidden />
                  </>
                ) : null}

                <div className="pd-profile-v2__org-node is-you">
                  <Avatar
                    name={employee.fullName}
                    src={employee.avatarUrl}
                    size="md"
                    className="pd-profile-v2__org-av pd-profile-v2__org-av--you"
                  />
                  <div className="pd-profile-v2__org-text">
                    <div className="pd-profile-v2__org-name">
                      {employee.fullName}
                    </div>
                    <div className="pd-profile-v2__org-role">
                      {employee.jobTitle || 'Employee'}
                    </div>
                  </div>
                  <span className="pd-profile-v2__tag pd-profile-v2__tag--you">
                    {isSelf ? 'You' : 'Profile'}
                  </span>
                </div>

                {showDepartmentHead ? (
                  <>
                    <div className="pd-profile-v2__connector" aria-hidden />
                    <div className="pd-profile-v2__org-node">
                      <Avatar
                        name={departmentHeadName}
                        src={departmentHead?.avatarUrl}
                        size="md"
                        className="pd-profile-v2__org-av pd-profile-v2__org-av--head"
                      />
                      <div className="pd-profile-v2__org-text">
                        <div className="pd-profile-v2__org-name">
                          {departmentHeadName}
                        </div>
                        <div className="pd-profile-v2__org-role">
                          {departmentHead?.jobTitle || 'Dept. Head'}
                        </div>
                      </div>
                      <span className="pd-profile-v2__tag pd-profile-v2__tag--hd">
                        Head
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="pd-profile-v2__placeholder">
          <EmptyState
            className="pd-empty--inline"
            icon={profileTabComingSoon[tab].icon}
            title={profileTabComingSoon[tab].title}
            description={
              isSelf
                ? profileTabComingSoon[tab].descriptionSelf
                : profileTabComingSoon[tab].descriptionOther
            }
          />
        </div>
      )}
    </div>
  )
}

export default function EmployeeProfileV2Page() {
  const { employeeId: employeeIdParam } = useParams()
  const employeeId = Number(employeeIdParam)
  const { employees } = useEmployees()

  const employee = useMemo(() => {
    if (!Number.isInteger(employeeId) || employeeId <= 0) return null
    return getEmployee(employeeId)
  }, [employeeId, employees])

  const manager = useMemo(() => resolveManager(employee), [employee])

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return <Navigate to="/people-v2" replace />
  }

  if (!employee) {
    return (
      <div
        className="pd-page pd-people pd-profile-v2"
        aria-label="Employee not found"
      >
        <p className="pd-people__empty">Employee not found.</p>
        <Link to="/people-v2" className="pd-people__back">
          Back to People
        </Link>
      </div>
    )
  }

  return <EmployeeProfileV2View employee={employee} manager={manager} />
}
