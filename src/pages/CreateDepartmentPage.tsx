import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Save } from 'lucide-react'
import { ListboxSelect } from '@/components/ui'
import { createDepartment } from '@/lib/employees/store'
import { useEmployees } from '@/lib/employees/useEmployees'
import { departmentKey } from '@/lib/organisation/fromEmployees'
import { departmentDetailPath } from '@/lib/organisation/paths'
import { successNotice } from '@/pages/reviews/ReviewSaveBanner'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

export default function CreateDepartmentPage() {
  const navigate = useNavigate()
  const { employees } = useEmployees()
  const [name, setName] = useState('')
  const [headEmployeeId, setHeadEmployeeId] = useState('')
  const [hrbpEmployeeId, setHrbpEmployeeId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const peopleOptions = useMemo(
    () =>
      employees
        .filter((e) => e.isActive)
        .slice()
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((e) => ({
          value: String(e.employeeId),
          label: e.jobTitle
            ? `${e.fullName} · ${e.jobTitle}`
            : e.fullName,
        })),
    [employees],
  )

  const previewName = name.trim() || 'New department'

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)

    void (async () => {
      const result = await createDepartment({
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
        state: { saveNotice: successNotice('Department created.') },
      })
    })()
  }

  return (
    <div
      className="pd-page pd-people pd-people--form pd-org"
      aria-label="Add Department"
    >
      <form className="pd-people__form-layout" onSubmit={onSubmit} noValidate>
        <div className="pd-people__form-toolbar">
          <Link
            to="/organisation"
            className="pd-people__back pd-people__back--toolbar"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Organisation
          </Link>
          <div className="pd-people__form-toolbar-end">
            {error ? (
              <p
                className="pd-people__message pd-people__message--error"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <Link to="/organisation" className="pd-people__cancel">
              Cancel
            </Link>
            <button
              type="submit"
              className="pd-people__submit pd-people__submit--with-icon"
              disabled={busy}
            >
              <Save size={16} strokeWidth={1.85} aria-hidden />
              Add Department
            </button>
          </div>
        </div>

        <div className="pd-people__form-shell">
          <aside className="pd-people__form-aside">
            <span className="pd-org-detail__hero-icon" aria-hidden>
              <Building2 size={28} strokeWidth={1.75} />
            </span>
            <div className="pd-people__form-aside-copy">
              <p className="pd-people__form-kicker">Creating</p>
              <h1 className="pd-people__form-title">{previewName}</h1>
              <p className="pd-people__form-subtitle">Department</p>
            </div>
          </aside>

          <div className="pd-people__form-main">
            <div className="pd-people__grid">
              <div className="pd-people__field" style={{ gridColumn: '1 / -1' }}>
                <label className="pd-people__label" htmlFor="dept-name">
                  Department name
                  <span className="pd-people__required" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="dept-name"
                  className="pd-people__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Product Design"
                  autoFocus
                  required
                />
              </div>

              <div className="pd-people__field">
                <span className="pd-people__label" id="dept-owner-label">
                  Owner
                </span>
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
                <span className="pd-people__label" id="dept-hrbp-label">
                  HRBP
                </span>
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
