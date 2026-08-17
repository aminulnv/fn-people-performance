import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  CircleDot,
  Copy,
  GitBranch,
  Hash,
  HeartHandshake,
  History,
  KeyRound,
  Mail,
  MapPin,
  MoreHorizontal,
  Network,
  Pencil,
  Star,
  Target,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  Avatar,
  PageStatus,
  PageStatusLink,
  PageStatusRetry,
  SegmentedControl,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { avatarStyle } from '@/lib/employees/avatar'
import { countDirectReports, resolveDepartmentHead } from '@/lib/employees/relationships'
import {
  findEmployeeByEmail,
  getEmployee,
  listEmployees,
} from '@/lib/employees/store'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { PlatformEmployee } from '@/lib/employees/types'
import { organisationPathForEmployee } from '@/lib/organisation/paths'
import { GoalsPersonDetail } from '@/pages/GoalsPage'
import {
  ActivityLogDrawer,
} from '@/components/activity/ActivityLogDrawer'
import { EmployeeProfilePerformanceTab } from '@/pages/profile/EmployeeProfilePerformanceTab'
import { EmployeeProfileTeamTab } from '@/pages/profile/EmployeeProfileTeamTab'
import { ProfileOrgChart } from '@/pages/profile/ProfileOrgChart'
import { useAuth } from '@/lib/useAuth'
import '@/styles/layout-people.css'
import '@/styles/layout-activity.css'

export type ProfileTabId = 'profile' | 'performance' | 'goals' | 'team'

const PROFILE_TABS: {
  id: ProfileTabId
  label: string
  icon: LucideIcon
}[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'performance', label: 'Performance', icon: Star },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'team', label: 'Team', icon: Users },
]

/** Shared with the create/edit form so both modes render the same tab strip. */
export const PROFILE_TAB_OPTIONS = PROFILE_TABS.map((item) => ({
  id: item.id,
  label: (
    <>
      <item.icon size={15} strokeWidth={1.75} aria-hidden />
      {item.label}
    </>
  ),
}))

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

export function DetailRow({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <div className="pd-profile__detail-row">
      <dt className="pd-profile__detail-label">
        <Icon
          className="pd-profile__detail-icon"
          size={14}
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="pd-profile__detail-label-text">{label}</span>
      </dt>
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
    const match = getEmployee(employee.reportsToId)
    if (match) return match
  }
  if (employee.managerEmail) {
    const match = findEmployeeByEmail(employee.managerEmail)
    if (match) return match
  }
  const managerName = employee.reportsToName.trim().toLocaleLowerCase()
  if (!managerName) return null
  return (
    listEmployees().find(
      (candidate) =>
        candidate.fullName.trim().toLocaleLowerCase() === managerName,
    ) ?? null
  )
}

export function EmployeeProfileView({
  employee,
  manager,
  departmentHead,
  isSelf = false,
}: {
  employee: PlatformEmployee
  manager: PlatformEmployee | null
  departmentHead: PlatformEmployee | null
  isSelf?: boolean
}) {
  const { user } = useAuth()
  const [tab, setTab] = useState<(typeof PROFILE_TABS)[number]['id']>('profile')
  const [activityOpen, setActivityOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const canEdit = hasSystemPermission(
    user?.permissions,
    'platform.write_all',
  )
  const canManageAccess = hasSystemPermission(
    user?.permissions,
    'platform.read_all',
  )
  const managerName = manager?.fullName || employee.reportsToName
  const departmentHeadName =
    departmentHead?.fullName || employee.departmentHeadName
  const managerReportCount = countDirectReports(manager)
  const directoryCount = listEmployees().length
  const orgPath = organisationPathForEmployee(employee)

  useEffect(() => {
    if (!moreOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [moreOpen])

  const copyEmail = async () => {
    if (!employee.email) return
    try {
      await navigator.clipboard.writeText(employee.email)
    } catch {
      // Ignore clipboard failures; the mailto link remains available.
    }
    setMoreOpen(false)
  }

  return (
    <div className="pd-page pd-people pd-profile" aria-label={employee.fullName}>
      <section className="pd-profile__hero">
        <div className="pd-profile__hero-main">
          <Avatar
            name={employee.fullName}
            src={employee.avatarUrl || undefined}
            size="lg"
            className="pd-profile__hero-avatar"
            style={avatarStyle(employee.fullName)}
          />
          <div className="pd-profile__hero-text">
            <div className="pd-profile__hero-title-row">
              <h1 className="pd-profile__name">{employee.fullName}</h1>
            </div>
            <p className="pd-profile__hero-meta">
              {[employee.jobTitle, employee.department, employee.division]
                .filter(Boolean)
                .join(' · ') || 'No role details yet'}
            </p>
          </div>
        </div>

        <div className="pd-profile__hero-actions">
          {canEdit ? (
            <Link
              to={`/people/${employee.employeeId}/edit`}
              className="pd-people__ghost-btn pd-people__ghost-btn--primary"
            >
              <Pencil size={15} strokeWidth={1.75} aria-hidden />
              Edit
            </Link>
          ) : null}
          <div className="pd-profile__more" ref={moreMenuRef}>
            <button
              type="button"
              className="pd-people__icon-btn"
              aria-label="More actions"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onClick={() => setMoreOpen((open) => !open)}
            >
              <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
            </button>
            {moreOpen ? (
              <div className="pd-profile__more-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="pd-profile__more-menu-item"
                  disabled={!employee.email}
                  onClick={() => void copyEmail()}
                >
                  <Copy size={15} strokeWidth={1.75} aria-hidden />
                  Copy email
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="pd-profile__more-menu-item"
                  onClick={() => {
                    setMoreOpen(false)
                    setActivityOpen(true)
                  }}
                >
                  <History size={15} strokeWidth={1.75} aria-hidden />
                  Open activity log
                </button>
                {canManageAccess ? (
                  <Link
                    to="/settings?section=access"
                    role="menuitem"
                    className="pd-profile__more-menu-item"
                    onClick={() => setMoreOpen(false)}
                  >
                    <KeyRound size={15} strokeWidth={1.75} aria-hidden />
                    Permissions
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <SegmentedControl
        className="pd-profile__tabs"
        buttonClassName="pd-profile__tab"
        options={PROFILE_TAB_OPTIONS}
        value={tab}
        onChange={setTab}
        aria-label="Employee sections"
      />

      {tab === 'goals' ? (
        <GoalsPersonDetail personId={String(employee.employeeId)} embedded />
      ) : tab === 'performance' ? (
        <EmployeeProfilePerformanceTab
          employee={employee}
          isSelf={isSelf}
        />
      ) : tab === 'team' ? (
        <EmployeeProfileTeamTab employee={employee} isSelf={isSelf} />
      ) : (
        <div className="pd-profile__grid">
          <div className="pd-profile__col">
            <section className="pd-profile__card">
              <header className="pd-profile__card-head">
                <h2 className="pd-profile__card-title">Employee Details</h2>
                {canEdit ? (
                  <Link
                    to={`/people/${employee.employeeId}/edit`}
                    className="pd-profile__icon-action"
                    aria-label="Edit employee details"
                  >
                    <Pencil size={14} strokeWidth={1.75} aria-hidden />
                  </Link>
                ) : null}
              </header>
              <dl className="pd-profile__details">
                <DetailRow label="Email" icon={Mail}>
                  {employee.email ? (
                    <CopyEmail email={employee.email} />
                  ) : (
                    '—'
                  )}
                </DetailRow>
                <DetailRow label="Employee ID" icon={Hash}>
                  {employee.employeeId}
                </DetailRow>
                <DetailRow label="Status" icon={CircleDot}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </DetailRow>
                <DetailRow label="Role" icon={Briefcase}>
                  {employee.jobTitle || '—'}
                </DetailRow>
                <DetailRow label="Seniority" icon={Award}>
                  {employee.jobGrade || '—'}
                </DetailRow>
                <DetailRow label="Department" icon={Building2}>
                  {employee.department || '—'}
                </DetailRow>
                <DetailRow label="Team" icon={Users}>
                  {employee.team || '—'}
                </DetailRow>
                <DetailRow label="Division" icon={GitBranch}>
                  {employee.division || '—'}
                </DetailRow>
                <DetailRow label="Site" icon={MapPin}>
                  {employee.site || '—'}
                </DetailRow>
                <DetailRow label="Line manager" icon={UserRound}>
                  {manager ? (
                    <Link
                      to={`/people/${manager.employeeId}`}
                      className="pd-people__person pd-people__person-link"
                    >
                      <Avatar
                        name={manager.fullName}
                        src={manager.avatarUrl || undefined}
                        size="sm"
                        style={avatarStyle(manager.fullName)}
                      />
                      <span>{manager.fullName}</span>
                    </Link>
                  ) : managerName ? (
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
                <DetailRow label="Department Head" icon={Network}>
                  {departmentHead ? (
                    <Link
                      to={`/people/${departmentHead.employeeId}`}
                      className="pd-people__person pd-people__person-link"
                    >
                      <Avatar
                        name={departmentHead.fullName}
                        src={departmentHead.avatarUrl || undefined}
                        size="sm"
                        style={avatarStyle(departmentHead.fullName)}
                      />
                      <span>{departmentHead.fullName}</span>
                    </Link>
                  ) : departmentHeadName ? (
                    <span className="pd-people__person">
                      <Avatar
                        name={departmentHeadName}
                        size="sm"
                        style={avatarStyle(departmentHeadName)}
                      />
                      <span>{departmentHeadName}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </DetailRow>
                <DetailRow label="HRBP" icon={HeartHandshake}>
                  {employee.hrbpName || '—'}
                </DetailRow>
                <DetailRow label="Start date" icon={Calendar}>
                  {formatStartDate(employee.startDate)}
                </DetailRow>
              </dl>
            </section>
          </div>

          <aside className="pd-profile__col pd-profile__col--side">
            <ProfileOrgChart
              manager={
                managerName
                  ? {
                      fullName: managerName,
                      jobTitle: manager?.jobTitle,
                      avatarUrl: manager?.avatarUrl,
                      employeeId: manager?.employeeId,
                    }
                  : null
              }
              person={{
                fullName: employee.fullName,
                jobTitle: employee.jobTitle,
                avatarUrl: employee.avatarUrl,
              }}
              managerReportCount={managerReportCount}
              chartHref="/organisation/chart"
            />

            <nav className="pd-profile__nav-cards" aria-label="More about this person">
              <button
                type="button"
                className="pd-profile__nav-card"
                onClick={() => setActivityOpen(true)}
              >
                <History size={18} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="pd-profile__nav-title">Activity Log</span>
                  <span className="pd-profile__nav-sub">
                    Main changes and events
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </button>
              <Link to={orgPath} className="pd-profile__nav-card">
                <Network size={18} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="pd-profile__nav-title">Org Structures</span>
                  <span className="pd-profile__nav-sub">
                    {directoryCount} people in directory
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </Link>
              <Link
                to={isSelf ? '/organisation/chart' : '/people'}
                className="pd-profile__nav-card"
              >
                <GitBranch size={18} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="pd-profile__nav-title">
                    {isSelf ? 'View Org Chart' : 'Back to People'}
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </Link>
            </nav>
          </aside>
        </div>
      )}
      <ActivityLogDrawer
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        title={`${employee.fullName} activity log`}
        description="Main changes and events for this person."
        filters={{ subjectEmployeeId: employee.employeeId }}
      />
    </div>
  )
}

export default function EmployeeProfilePage() {
  const { employeeId: employeeIdParam } = useParams()
  const employeeId = Number(employeeIdParam)
  const { employees, isLoading, loadError, reload } = useEmployees()

  const employee = useMemo(() => {
    if (!Number.isInteger(employeeId) || employeeId <= 0) return null
    return getEmployee(employeeId)
  }, [employeeId, employees])

  const manager = useMemo(() => resolveManager(employee), [employee])
  const departmentHead = useMemo(
    () => resolveDepartmentHead(employee),
    [employee],
  )

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return <Navigate to="/people" replace />
  }

  if (!employee && isLoading) {
    return (
      <PageStatus
        variant="loading"
        pageClassName="pd-people pd-profile"
        aria-label="Loading employee"
        description="Fetching employee details…"
      />
    )
  }

  if (!employee && loadError) {
    return (
      <PageStatus
        variant="error"
        pageClassName="pd-people pd-profile"
        aria-label="Employee load error"
        description={loadError || 'Failed to load the employee directory.'}
        action={
          <PageStatusRetry onClick={() => void reload().catch(() => {})} />
        }
      />
    )
  }

  if (!employee) {
    return (
      <PageStatus
        variant="not-found"
        pageClassName="pd-people pd-profile"
        aria-label="Employee not found"
        title="Employee not found"
        description="This person may have been removed or the link is outdated."
        action={<PageStatusLink to="/people" label="Back to People" />}
      />
    )
  }

  return (
    <EmployeeProfileView
      employee={employee}
      manager={manager}
      departmentHead={departmentHead}
    />
  )
}
