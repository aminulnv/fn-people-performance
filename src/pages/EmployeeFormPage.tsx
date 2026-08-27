import { useEffect, useId, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  CircleDot,
  GitBranch,
  Hash,
  HeartHandshake,
  History,
  Mail,
  MapPin,
  Network,
  Save,
  UserRound,
  Users,
} from 'lucide-react'
import {
  Avatar,
  DateTimeInputControl,
  ListboxSelect,
  PageStatus,
  PageStatusLink,
  PageStatusRetry,
  SegmentedControl,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { toUtcIso } from '@/lib/dates/timezone'
import { successNotice } from '@/pages/reviews/ReviewSaveBanner'
import {
  DetailRow,
  PROFILE_TAB_OPTIONS,
  type ProfileTabId,
} from '@/pages/EmployeeProfilePage'
import { ProfileOrgChart } from '@/pages/profile/ProfileOrgChart'
import { avatarStyle } from '@/lib/employees/avatar'
import { countDirectReports } from '@/lib/employees/relationships'
import {
  orgChartPath,
  organisationPathForEmployee,
} from '@/lib/organisation/paths'
import {
  buildCatalogOptions,
  DEPARTMENT_OPTIONS,
  DIVISION_OPTIONS,
  JOB_GRADE_OPTIONS,
  JOB_TITLE_OPTIONS,
  SITE_OPTIONS,
  TEAM_OPTIONS,
} from '@/lib/employees/catalog'
import {
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from '@/lib/employees/store'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/employees/types'
import { notifyManagerChanged } from '@/lib/notifications/adminEvents'
import { useAuth } from '@/lib/useAuth'
import '@/styles/layout-people.css'

type FormMode = 'create' | 'edit'

type FormState = CreateEmployeeInput & { isActive: boolean }

type FieldKey = keyof FormState

const EMPTY_FORM: FormState = {
  employeeId: 0,
  fullName: '',
  email: '',
  startDate: '',
  jobTitle: '',
  department: '',
  team: '',
  division: '',
  reportsToName: '',
  departmentHeadName: '',
  hrbpName: '',
  jobGrade: '',
  site: '',
  managerEmail: '',
  isActive: true,
}

function toUpdateInput(form: FormState): UpdateEmployeeInput {
  return {
    employeeId: Number(form.employeeId),
    fullName: form.fullName,
    email: form.email,
    startDate: form.startDate,
    jobTitle: form.jobTitle,
    department: form.department,
    team: form.team,
    division: form.division,
    reportsToName: form.reportsToName,
    departmentHeadName: form.departmentHeadName,
    hrbpName: form.hrbpName,
    jobGrade: form.jobGrade,
    site: form.site,
    managerEmail: form.managerEmail,
    isActive: form.isActive,
  }
}

function InlineInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  readOnly,
  min,
  step,
}: {
  label: string
  type?: 'text' | 'email' | 'datetime' | 'number'
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  readOnly?: boolean
  min?: number
  step?: number
}) {
  const id = useId()
  const sharedProps = {
    id,
    className: 'pd-profile__inline-input',
    'aria-label': label,
    required,
    readOnly,
    disabled: readOnly,
    placeholder,
    value,
    min,
    step,
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value),
  }

  if (type === 'datetime') {
    return <DateTimeInputControl {...sharedProps} />
  }

  return <input type={type} {...sharedProps} />
}

export default function EmployeeFormPage({ mode }: { mode: FormMode }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { employeeId: employeeIdParam } = useParams()
  const employeeId = Number(employeeIdParam)
  const { employees, isLoading, loadError, reload } = useEmployees()
  const canWrite = hasSystemPermission(
    user?.permissions,
    'platform.write_all',
  )
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hydrated, setHydrated] = useState(mode === 'create')
  const [tab, setTab] = useState<ProfileTabId>('profile')

  const existing = useMemo(() => {
    if (mode !== 'edit') return null
    if (!Number.isInteger(employeeId) || employeeId <= 0) return null
    return getEmployee(employeeId)
  }, [mode, employeeId, employees])

  const catalogOptions = useMemo(() => {
    const extras = {
      jobTitle: employees.map((e) => e.jobTitle),
      jobGrade: employees.map((e) => e.jobGrade),
      site: employees.map((e) => e.site),
      department: employees.map((e) => e.department),
      team: employees.map((e) => e.team),
      division: employees.map((e) => e.division),
    }
    return {
      jobTitle: buildCatalogOptions(JOB_TITLE_OPTIONS, [
        ...extras.jobTitle,
        form.jobTitle,
      ]),
      jobGrade: buildCatalogOptions(JOB_GRADE_OPTIONS, [
        ...extras.jobGrade,
        form.jobGrade,
      ]),
      site: buildCatalogOptions(SITE_OPTIONS, [...extras.site, form.site]),
      department: buildCatalogOptions(DEPARTMENT_OPTIONS, [
        ...extras.department,
        form.department,
      ]),
      team: buildCatalogOptions(TEAM_OPTIONS, [...extras.team, form.team]),
      division: buildCatalogOptions(DIVISION_OPTIONS, [
        form.division,
      ].filter(Boolean)),
    }
  }, [
    employees,
    form.jobTitle,
    form.jobGrade,
    form.site,
    form.department,
    form.team,
    form.division,
  ])

  const personOptions = useMemo(() => {
    const excludeId = mode === 'edit' ? employeeId : undefined
    return employees
      .filter((person) => person.employeeId !== excludeId)
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((person) => ({
        value: String(person.employeeId),
        label: person.fullName,
        description: [person.jobTitle, person.email].filter(Boolean).join(' · '),
        searchText: [
          person.email,
          person.jobTitle,
          person.department,
          person.team,
        ].join(' '),
        leading: (
          <Avatar
            name={person.fullName}
            src={person.avatarUrl || undefined}
            size="sm"
            style={avatarStyle(person.fullName)}
          />
        ),
      }))
  }, [employees, mode, employeeId])

  const reportsToValue = useMemo(() => {
    const excludeId = mode === 'edit' ? employeeId : undefined
    const byEmail = form.managerEmail.trim().toLowerCase()
    if (byEmail) {
      const match = employees.find(
        (person) =>
          person.email.toLowerCase() === byEmail &&
          person.employeeId !== excludeId,
      )
      if (match) return String(match.employeeId)
    }
    const byName = form.reportsToName.trim().toLowerCase()
    if (byName) {
      const match = employees.find(
        (person) =>
          person.fullName.trim().toLowerCase() === byName &&
          person.employeeId !== excludeId,
      )
      if (match) return String(match.employeeId)
    }
    return ''
  }, [employees, form.managerEmail, form.reportsToName, mode, employeeId])

  const departmentHeadValue = useMemo(() => {
    const excludeId = mode === 'edit' ? employeeId : undefined
    const byName = form.departmentHeadName.trim().toLowerCase()
    if (!byName) return ''
    const match = employees.find(
      (person) =>
        person.fullName.trim().toLowerCase() === byName &&
        person.employeeId !== excludeId,
    )
    return match ? String(match.employeeId) : ''
  }, [employees, form.departmentHeadName, mode, employeeId])

  const manager = useMemo(() => {
    if (!reportsToValue) return null
    return getEmployee(Number(reportsToValue))
  }, [reportsToValue, employees])

  useEffect(() => {
    if (mode !== 'edit') return
    if (!existing) return
    setForm({
      employeeId: existing.employeeId,
      fullName: existing.fullName,
      email: existing.email,
      startDate: toUtcIso(existing.startDate) || existing.startDate,
      jobTitle: existing.jobTitle,
      department: existing.department,
      team: existing.team,
      division: existing.division,
      reportsToName: existing.reportsToName,
      departmentHeadName: existing.departmentHeadName,
      hrbpName: existing.hrbpName,
      jobGrade: existing.jobGrade,
      site: existing.site,
      managerEmail: existing.managerEmail,
      isActive: existing.isActive,
    })
    setHydrated(true)
  }, [mode, existing])

  if (!canWrite) {
    const backTo = mode === 'edit' ? `/people/${employeeId}` : '/people'
    return (
      <PageStatus
        variant="forbidden"
        pageClassName="pd-people pd-profile"
        aria-label="Access denied"
        description="You do not have permission to edit employee profiles."
        action={<PageStatusLink to={backTo} label="Back" />}
      />
    )
  }

  if (mode === 'edit') {
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return <Navigate to="/people" replace />
    }
    if (!existing && isLoading) {
      return (
        <PageStatus
          variant="loading"
          pageClassName="pd-people pd-profile"
          aria-label="Loading employee"
          description="Fetching employee details…"
        />
      )
    }
    if (!existing && loadError) {
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
    if (!existing) {
      return <Navigate to="/people" replace />
    }
  }

  const backTo = mode === 'edit' ? `/people/${employeeId}` : '/people'
  const previewName =
    form.fullName.trim() || (mode === 'edit' ? 'Employee' : 'New Employee')
  const previewMeta = [form.jobTitle.trim(), form.department.trim(), form.division.trim()]
    .filter(Boolean)
    .join(' · ')
  const directoryCount = listEmployees().length
  const managerName = manager?.fullName || form.reportsToName.trim()
  const managerReportCount = countDirectReports(manager)

  const onFieldChange = (key: FieldKey, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]:
        key === 'employeeId'
          ? value === ''
            ? 0
            : Number(value)
          : key === 'isActive'
            ? value === 'active'
            : value,
    }))
  }

  const onReportsToChange = (selectedId: string) => {
    if (!selectedId) {
      setForm((prev) => ({
        ...prev,
        reportsToName: '',
        managerEmail: '',
      }))
      return
    }
    const nextManager = getEmployee(Number(selectedId))
    if (!nextManager) return
    setForm((prev) => ({
      ...prev,
      reportsToName: nextManager.fullName,
      managerEmail: nextManager.email,
    }))
  }

  const onDepartmentHeadChange = (selectedId: string) => {
    if (!selectedId) {
      setForm((prev) => ({ ...prev, departmentHeadName: '' }))
      return
    }
    const head = getEmployee(Number(selectedId))
    if (!head) return
    setForm((prev) => ({
      ...prev,
      departmentHeadName: head.fullName,
    }))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)

    void (async () => {
      if (mode === 'create') {
        const result = await createEmployee({
          ...form,
          employeeId: Number(form.employeeId),
          isActive: form.isActive,
        })
        if (!result.ok) {
          setError(result.error)
          setBusy(false)
          return
        }
        navigate(`/people/${result.employee.employeeId}`, {
          replace: true,
          state: { saveNotice: successNotice('Person created.') },
        })
        return
      }

      const result = await updateEmployee(employeeId, toUpdateInput(form))
      if (!result.ok) {
        setError(result.error)
        setBusy(false)
        return
      }
      const managerChanged =
        existing?.managerEmail.trim().toLowerCase() !==
        result.employee.managerEmail.trim().toLowerCase()
      if (managerChanged && manager) {
        notifyManagerChanged({
          actorId: user?.personId,
          employeeId: String(result.employee.employeeId),
          employeeName: result.employee.fullName,
          managerId: String(manager.employeeId),
          managerName: manager.fullName,
        })
      }
      navigate(`/people/${result.employee.employeeId}`, {
        replace: true,
        state: { saveNotice: successNotice('Profile updated.') },
      })
    })()
  }

  if (mode === 'edit' && !hydrated) {
    return (
      <PageStatus
        variant="loading"
        pageClassName="pd-people pd-profile"
        aria-label="Loading employee"
        description="Fetching employee details…"
      />
    )
  }

  return (
    <form
      className="pd-page pd-people pd-profile pd-profile--editing"
      aria-label={mode === 'edit' ? 'Edit Employee' : 'Add Employee'}
      onSubmit={onSubmit}
      noValidate
    >
      <section className="pd-profile__hero">
        <div className="pd-profile__hero-main">
          <Avatar
            name={previewName}
            src={existing?.avatarUrl || undefined}
            size="lg"
            className="pd-profile__hero-avatar"
            style={avatarStyle(previewName)}
          />
          <div className="pd-profile__hero-text">
            <div className="pd-profile__hero-title-row">
              <input
                className="pd-profile__name-input"
                aria-label="Name"
                required
                placeholder="Full name"
                value={form.fullName}
                onChange={(e) => onFieldChange('fullName', e.target.value)}
              />
            </div>
            <p className="pd-profile__hero-meta">
              {previewMeta || 'Role details appear as you fill them in'}
            </p>
          </div>
        </div>

        <div className="pd-profile__hero-actions">
          {error ? (
            <p
              className="pd-people__message pd-people__message--error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <Link to={backTo} className="pd-people__ghost-btn">
            Cancel
          </Link>
          <button
            type="submit"
            className="pd-people__ghost-btn pd-people__ghost-btn--primary"
            disabled={busy}
          >
            <Save size={15} strokeWidth={1.75} aria-hidden />
            {mode === 'edit' ? 'Save Changes' : 'Add Employee'}
          </button>
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

      {tab !== 'profile' ? (
        <div className="pd-profile__placeholder">
          <p className="pd-people__empty">
            Finish adding this person on Profile first. Other sections unlock after
            they’re saved.
          </p>
        </div>
      ) : (
        <div className="pd-profile__grid">
          <div className="pd-profile__col">
            <section className="pd-profile__card">
              <header className="pd-profile__card-head">
                <h2 className="pd-profile__card-title">Employee Details</h2>
              </header>
              <dl className="pd-profile__details">
                <DetailRow label="Email" icon={Mail}>
                  <InlineInput
                    label="Email"
                    type="email"
                    required
                    placeholder="name@nextventures.io"
                    value={form.email}
                    onChange={(value) => onFieldChange('email', value)}
                  />
                </DetailRow>
                <DetailRow label="Employee ID" icon={Hash}>
                  <InlineInput
                    label="Employee ID"
                    type="number"
                    required
                    readOnly={mode === 'edit'}
                    placeholder="101"
                    min={1}
                    step={1}
                    value={form.employeeId === 0 ? '' : String(form.employeeId)}
                    onChange={(value) => onFieldChange('employeeId', value)}
                  />
                </DetailRow>
                <DetailRow label="Status" icon={CircleDot}>
                  <ListboxSelect
                    name="isActive"
                    aria-label="Status"
                    value={form.isActive ? 'active' : 'inactive'}
                    onValueChange={(next) => onFieldChange('isActive', next)}
                    allowEmpty={false}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </DetailRow>
                <DetailRow label="Role" icon={Briefcase}>
                  <ListboxSelect
                    name="jobTitle"
                    aria-label="Role"
                    value={form.jobTitle}
                    onValueChange={(next) => onFieldChange('jobTitle', next)}
                    placeholder="Select job title"
                    options={catalogOptions.jobTitle}
                  />
                </DetailRow>
                <DetailRow label="Seniority" icon={Award}>
                  <ListboxSelect
                    name="jobGrade"
                    aria-label="Seniority"
                    value={form.jobGrade}
                    onValueChange={(next) => onFieldChange('jobGrade', next)}
                    placeholder="Select job grade"
                    options={catalogOptions.jobGrade}
                  />
                </DetailRow>
                <DetailRow label="Department" icon={Building2}>
                  <ListboxSelect
                    name="department"
                    aria-label="Department"
                    value={form.department}
                    onValueChange={(next) => onFieldChange('department', next)}
                    placeholder="Select department"
                    options={catalogOptions.department}
                  />
                </DetailRow>
                <DetailRow label="Team" icon={Users}>
                  <ListboxSelect
                    name="team"
                    aria-label="Team"
                    value={form.team}
                    onValueChange={(next) => onFieldChange('team', next)}
                    placeholder="Select team"
                    options={catalogOptions.team}
                  />
                </DetailRow>
                <DetailRow label="Division" icon={GitBranch}>
                  <ListboxSelect
                    name="division"
                    aria-label="Division"
                    value={form.division}
                    onValueChange={(next) => onFieldChange('division', next)}
                    placeholder="Select division"
                    options={catalogOptions.division}
                  />
                </DetailRow>
                <DetailRow label="Site" icon={MapPin}>
                  <ListboxSelect
                    name="site"
                    aria-label="Site"
                    value={form.site}
                    onValueChange={(next) => onFieldChange('site', next)}
                    placeholder="Select site"
                    options={catalogOptions.site}
                  />
                </DetailRow>
                <DetailRow label="Line Manager" icon={UserRound}>
                  <ListboxSelect
                    name="reportsTo"
                    aria-label="Line Manager"
                    value={reportsToValue}
                    onValueChange={onReportsToChange}
                    placeholder="Select manager"
                    options={personOptions}
                    searchable
                    searchPlaceholder="Search people"
                    noResultsText="No people found"
                  />
                </DetailRow>
                <DetailRow label="Department Head" icon={Network}>
                  <ListboxSelect
                    name="departmentHead"
                    aria-label="Department Head"
                    value={departmentHeadValue}
                    onValueChange={onDepartmentHeadChange}
                    placeholder="Select department head"
                    options={personOptions}
                    searchable
                    searchPlaceholder="Search people"
                    noResultsText="No people found"
                  />
                </DetailRow>
                <DetailRow label="HRBP" icon={HeartHandshake}>
                  <div className="pd-profile__readonly">
                    {form.hrbpName.trim() || 'Set after save via department'}
                  </div>
                </DetailRow>
                <DetailRow label="Joining Date" icon={Calendar}>
                  <InlineInput
                    label="Joining Date"
                    type="datetime"
                    value={form.startDate}
                    onChange={(value) =>
                      onFieldChange('startDate', toUtcIso(value) || value)
                    }
                  />
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
                fullName: previewName,
                jobTitle: form.jobTitle.trim(),
                avatarUrl: existing?.avatarUrl,
              }}
              managerReportCount={managerReportCount}
              chartHref={orgChartPath(existing?.employeeId)}
            />

            <nav className="pd-profile__nav-cards" aria-label="More about this person">
              <button type="button" className="pd-profile__nav-card" disabled>
                <History size={18} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="pd-profile__nav-title">Activity Log</span>
                  <span className="pd-profile__nav-sub">
                    Available after save
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </button>
              <Link
                to={organisationPathForEmployee({
                  department: form.department,
                  team: form.team,
                })}
                className="pd-profile__nav-card"
              >
                <Network size={18} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="pd-profile__nav-title">Org Structures</span>
                  <span className="pd-profile__nav-sub">
                    {directoryCount} people in directory
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </Link>
              <Link to="/people" className="pd-profile__nav-card">
                <GitBranch size={18} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="pd-profile__nav-title">Back To People</span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </Link>
            </nav>
          </aside>
        </div>
      )}
    </form>
  )
}
