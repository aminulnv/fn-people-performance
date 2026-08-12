import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Building2,
  ChevronRight,
  Copy,
  GitBranch,
  History,
  MoreHorizontal,
  Network,
  Pencil,
  Shield,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import {
  findEmployeeByEmail,
  getEmployee,
  listEmployees,
} from '@/lib/employees/store'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { PlatformEmployee } from '@/lib/employees/types'
import '@/styles/layout-people.css'

const PROFILE_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'performance', label: 'Performance' },
  { id: 'goals', label: 'Goals' },
  { id: 'team', label: 'Team' },
] as const

function formatStartDate(iso: string): string {
  if (!iso) return '—'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="pd-profile__detail-row">
      <dt className="pd-profile__detail-label">{label}</dt>
      <dd className="pd-profile__detail-value">{children}</dd>
    </div>
  )
}

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span className="pd-profile__email">
      <a href={`mailto:${email}`} className="pd-profile__link">
        {email}
      </a>
      <button
        type="button"
        className="pd-profile__icon-action"
        onClick={() => void onCopy()}
        aria-label={copied ? 'Copied' : 'Copy email'}
        title={copied ? 'Copied' : 'Copy email'}
      >
        <Copy size={14} strokeWidth={1.75} aria-hidden />
      </button>
    </span>
  )
}

export function resolveManager(
  employee: PlatformEmployee | null,
): PlatformEmployee | null {
  if (!employee) return null
  if (employee.reportsToId != null) {
    return getEmployee(employee.reportsToId)
  }
  if (employee.managerEmail) {
    return findEmployeeByEmail(employee.managerEmail)
  }
  return null
}

export function EmployeeProfileView({
  employee,
  manager,
  isSelf = false,
}: {
  employee: PlatformEmployee
  manager: PlatformEmployee | null
  isSelf?: boolean
}) {
  const [tab, setTab] = useState<(typeof PROFILE_TABS)[number]['id']>('profile')
  const managerName = manager?.fullName || employee.reportsToName
  const directoryCount = listEmployees().length

  return (
    <div className="pd-page pd-people pd-profile" aria-label={employee.fullName}>
      <section className="pd-profile__hero">
        <div className="pd-profile__hero-main">
          <Avatar
            name={employee.fullName}
            size="lg"
            className="pd-profile__hero-avatar"
            style={avatarStyle(employee.fullName)}
          />
          <div className="pd-profile__hero-text">
            <div className="pd-profile__hero-title-row">
              <h1 className="pd-profile__name">{employee.fullName}</h1>
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
            </div>
            <p className="pd-profile__hero-meta">
              {[employee.jobTitle, employee.department, employee.division]
                .filter(Boolean)
                .join(' · ') || 'No role details yet'}
            </p>
          </div>
        </div>

        <div className="pd-profile__hero-actions">
          <Link
            to={`/people/${employee.employeeId}/edit`}
            className="pd-people__ghost-btn pd-people__ghost-btn--primary"
          >
            <Pencil size={15} strokeWidth={1.75} aria-hidden />
            Edit
          </Link>
          <button type="button" className="pd-people__ghost-btn" disabled>
            <Shield size={15} strokeWidth={1.75} aria-hidden />
            Manage permissions
          </button>
          <button
            type="button"
            className="pd-people__icon-btn"
            aria-label="More actions"
            disabled
          >
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </section>

      <div className="pd-profile__tabs" role="tablist" aria-label="Employee sections">
        {PROFILE_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={[
              'pd-profile__tab',
              tab === item.id ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab !== 'profile' ? (
        <div className="pd-profile__placeholder">
          <p className="pd-people__empty">
            {PROFILE_TABS.find((t) => t.id === tab)?.label} is coming soon
            {isSelf ? '.' : ' for this employee.'}
          </p>
        </div>
      ) : (
        <div className="pd-profile__grid">
          <div className="pd-profile__col">
            <section className="pd-profile__card">
              <header className="pd-profile__card-head">
                <h2 className="pd-profile__card-title">Work details</h2>
                <Link
                  to={`/people/${employee.employeeId}/edit`}
                  className="pd-profile__icon-action"
                  aria-label="Edit work details"
                >
                  <Pencil size={14} strokeWidth={1.75} aria-hidden />
                </Link>
              </header>
              <dl className="pd-profile__details">
                <DetailRow label="Work email">
                  {employee.email ? (
                    <CopyEmail email={employee.email} />
                  ) : (
                    '—'
                  )}
                </DetailRow>
                <DetailRow label="Employee ID">{employee.employeeId}</DetailRow>
                <DetailRow label="Role">{employee.jobTitle || '—'}</DetailRow>
                <DetailRow label="Seniority">{employee.jobGrade || '—'}</DetailRow>
                <DetailRow label="Department">{employee.department || '—'}</DetailRow>
                <DetailRow label="Team">{employee.team || '—'}</DetailRow>
                <DetailRow label="Division">{employee.division || '—'}</DetailRow>
                <DetailRow label="Line manager">
                  {managerName ? (
                    <span className="pd-people__person">
                      <Avatar
                        name={managerName}
                        size="sm"
                        style={avatarStyle(managerName)}
                      />
                      <span>{managerName}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </DetailRow>
                <DetailRow label="Department Head">
                  {employee.departmentHeadName || '—'}
                </DetailRow>
                <DetailRow label="HRBP">{employee.hrbpName || '—'}</DetailRow>
                <DetailRow label="Start date">
                  {formatStartDate(employee.startDate)}
                </DetailRow>
              </dl>
            </section>

            <section className="pd-profile__card">
              <header className="pd-profile__card-head">
                <h2 className="pd-profile__card-title">Personal details</h2>
                <button
                  type="button"
                  className="pd-profile__icon-action"
                  aria-label="Edit personal details"
                  disabled
                >
                  <Pencil size={14} strokeWidth={1.75} aria-hidden />
                </button>
              </header>
              <dl className="pd-profile__details">
                <DetailRow label="Personal email">
                  <span className="pd-profile__muted">Not collected yet</span>
                </DetailRow>
              </dl>
            </section>
          </div>

          <aside className="pd-profile__col pd-profile__col--side">
            <section className="pd-profile__card">
              <header className="pd-profile__card-head">
                <h2 className="pd-profile__card-title">Org chart</h2>
              </header>
              <div className="pd-profile__org">
                {managerName ? (
                  <>
                    <div className="pd-profile__org-node">
                      <Avatar
                        name={managerName}
                        size="md"
                        style={avatarStyle(managerName)}
                      />
                      <div>
                        <p className="pd-profile__org-name">{managerName}</p>
                        <p className="pd-profile__org-role">
                          {manager?.jobTitle || 'Line manager'}
                        </p>
                      </div>
                    </div>
                    <div className="pd-profile__org-connector" aria-hidden>
                      <span className="pd-profile__org-count">2</span>
                    </div>
                  </>
                ) : null}
                <div className="pd-profile__org-node is-current">
                  <Avatar
                    name={employee.fullName}
                    size="md"
                    style={avatarStyle(employee.fullName)}
                  />
                  <div>
                    <p className="pd-profile__org-name">{employee.fullName}</p>
                    <p className="pd-profile__org-role">
                      {employee.jobTitle || 'Employee'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <nav className="pd-profile__nav-cards" aria-label="More about this person">
              <button type="button" className="pd-profile__nav-card" disabled>
                <Building2 size={18} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="pd-profile__nav-title">Ownership</span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </button>
              <button type="button" className="pd-profile__nav-card" disabled>
                <History size={18} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="pd-profile__nav-title">Timeline</span>
                  <span className="pd-profile__nav-sub">
                    Main changes and events
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </button>
              <button type="button" className="pd-profile__nav-card" disabled>
                <Network size={18} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="pd-profile__nav-title">Org Structures</span>
                  <span className="pd-profile__nav-sub">
                    {directoryCount} people in directory
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </button>
              <Link
                to={isSelf ? '/organisation/chart' : '/people'}
                className="pd-profile__nav-card"
              >
                <GitBranch size={18} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="pd-profile__nav-title">
                    {isSelf ? 'View org chart' : 'Back to people'}
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </Link>
            </nav>
          </aside>
        </div>
      )}
    </div>
  )
}

export default function EmployeeProfilePage() {
  const { employeeId: employeeIdParam } = useParams()
  const employeeId = Number(employeeIdParam)
  const { employees } = useEmployees()

  const employee = useMemo(() => {
    if (!Number.isInteger(employeeId) || employeeId <= 0) return null
    return getEmployee(employeeId)
  }, [employeeId, employees])

  const manager = useMemo(() => resolveManager(employee), [employee])

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return <Navigate to="/people" replace />
  }

  if (!employee) {
    return (
      <div className="pd-page pd-people pd-profile" aria-label="Employee not found">
        <p className="pd-people__empty">Employee not found.</p>
        <Link to="/people" className="pd-people__back">
          Back to people
        </Link>
      </div>
    )
  }

  return <EmployeeProfileView employee={employee} manager={manager} />
}
