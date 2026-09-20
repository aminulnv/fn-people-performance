import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Save } from 'lucide-react'
import {
  ListboxSelect,
  PageSkeleton,
  PageStatus,
  PageStatusLink,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { updateDepartment } from '@/lib/employees/store'
import {
  useEmployees,
  useOrganisationCatalogs,
} from '@/lib/employees/useEmployees'
import { departmentKey } from '@/lib/organisation/fromEmployees'
import { departmentDetailPath } from '@/lib/organisation/paths'
import { useAuth } from '@/lib/useAuth'
import { successNotice } from '@/pages/reviews/ReviewSaveBanner'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

export default function EditDepartmentPage() {
  const { departmentId: rawId = '' } = useParams()
  const departmentId = decodeURIComponent(rawId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = hasSystemPermission(user?.permissions, 'platform.write_all')
  const { employees } = useEmployees()
  const catalogs = useOrganisationCatalogs()
  const department = useMemo(
    () =>
      catalogs.departments.find((row) => departmentKey(row.name) === departmentId) ??
      null,
    [catalogs.departments, departmentId],
  )
  const [name, setName] = useState('')
  const [headEmployeeId, setHeadEmployeeId] = useState('')
  const [hrbpEmployeeId, setHrbpEmployeeId] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!department || hydrated) return
    setName(department.name)
    setHeadEmployeeId(
      department.headEmployeeId != null ? String(department.headEmployeeId) : '',
    )
    setHrbpEmployeeId(
      department.hrbpEmployeeId != null ? String(department.hrbpEmployeeId) : '',
    )
    setHydrated(true)
  }, [department, hydrated])

  const peopleOptions = useMemo(
    () =>
      employees
        .filter((person) => person.isActive)
        .slice()
        .sort((left, right) => left.fullName.localeCompare(right.fullName))
        .map((person) => ({
          value: String(person.employeeId),
          label: person.jobTitle
            ? `${person.fullName} · ${person.jobTitle}`
            : person.fullName,
        })),
    [employees],
  )

  if (!canWrite) {
    return (
      <PageStatus
        variant="forbidden"
        pageClassName="pd-people pd-org"
        aria-label="Access denied"
        description="You do not have permission to edit departments."
        action={
          <PageStatusLink
            to={department ? departmentDetailPath(departmentId) : '/organisation'}
            label="Back"
          />
        }
      />
    )
  }

  if (!catalogs.ready) {
    return (
      <PageSkeleton pageClassName="pd-people pd-org" aria-label="Edit department" />
    )
  }

  if (!department) {
    return (
      <PageStatus
        variant="not-found"
        pageClassName="pd-people pd-org"
        aria-label="Department not found"
        title="Department not found"
        description="This department may have been removed or the link is outdated."
        action={<PageStatusLink to="/organisation" label="Back to Organisation" />}
      />
    )
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !department) return
    setBusy(true)
    setError(null)
    void (async () => {
      const result = await updateDepartment({
        id: department.id,
        name,
        headEmployeeId: headEmployeeId ? Number(headEmployeeId) : null,
        hrbpEmployeeId: hrbpEmployeeId ? Number(hrbpEmployeeId) : null,
      })
      setBusy(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate(departmentDetailPath(departmentKey(result.department.name)), {
        replace: true,
        state: { saveNotice: successNotice('Department updated.') },
      })
    })()
  }

  return (
    <div className="pd-page pd-people pd-people--form pd-org" aria-label="Edit Department">
      <form className="pd-people__form-layout" onSubmit={onSubmit} noValidate>
        <div className="pd-people__form-toolbar">
          <Link
            to={departmentDetailPath(departmentId)}
            className="pd-people__back pd-people__back--toolbar"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Back to department
          </Link>
          <div className="pd-people__form-toolbar-end">
            {error ? (
              <p className="pd-people__message pd-people__message--error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="pd-people__submit pd-people__submit--with-icon"
              disabled={busy}
            >
              <Save size={16} strokeWidth={1.85} aria-hidden />
              Save
            </button>
          </div>
        </div>
        <div className="pd-people__form-shell">
          <aside className="pd-people__form-aside">
            <span className="pd-org-detail__hero-icon" aria-hidden>
              <Building2 size={28} strokeWidth={1.75} />
            </span>
            <div className="pd-people__form-aside-copy">
              <p className="pd-people__form-kicker">Editing</p>
              <h1 className="pd-people__form-title">{name.trim() || department.name}</h1>
              <p className="pd-people__form-subtitle">Department</p>
            </div>
          </aside>
          <div className="pd-people__form-main">
            <div className="pd-people__grid">
              <div className="pd-people__field" style={{ gridColumn: '1 / -1' }}>
                <label className="pd-people__label" htmlFor="dept-name">
                  Department name
                </label>
                <input
                  id="dept-name"
                  className="pd-people__input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="pd-people__field">
                <span className="pd-people__label">Owner</span>
                <ListboxSelect
                  aria-label="Owner"
                  value={headEmployeeId}
                  onValueChange={setHeadEmployeeId}
                  options={peopleOptions}
                  placeholder="Select owner (optional)"
                  emptyLabel="No owner"
                />
              </div>
              <div className="pd-people__field">
                <span className="pd-people__label">HRBP</span>
                <ListboxSelect
                  aria-label="HRBP"
                  value={hrbpEmployeeId}
                  onValueChange={setHrbpEmployeeId}
                  options={peopleOptions}
                  placeholder="Select HRBP (optional)"
                  emptyLabel="No HRBP"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
