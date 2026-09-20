import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import {
  ListboxSelect,
  PageSkeleton,
  PageStatus,
  PageStatusLink,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useAuth } from '@/lib/useAuth'
import { useOrganisationCatalogs } from '@/lib/employees/useEmployees'
import { roleDetailPath } from '@/lib/organisation/paths'
import { loadRole, updateRole } from '@/lib/roles/store'
import { useRole } from '@/lib/roles/useRoles'
import { successNotice } from '@/pages/reviews/ReviewSaveBanner'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

export default function EditRolePage() {
  const { roleId: rawId = '' } = useParams()
  const roleId = decodeURIComponent(rawId)
  const navigate = useNavigate()
  const catalogs = useOrganisationCatalogs()
  const { user } = useAuth()
  const canWrite = hasSystemPermission(user?.permissions, 'platform.write_all')
  const { role, ready } = useRole(roleId)

  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!roleId) return
    void loadRole(roleId).catch(() => { })
  }, [roleId])

  useEffect(() => {
    if (!role || hydrated) return
    setName(role.name)
    setDepartmentId(
      role.departmentId != null ? String(role.departmentId) : '',
    )
    setDescription(role.description)
    setHydrated(true)
  }, [hydrated, role])

  const departmentOptions = useMemo(
    () =>
      catalogs.departments
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((department) => ({
          value: String(department.id),
          label: department.name,
        })),
    [catalogs.departments],
  )

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !role) return
    setBusy(true)
    setError(null)
    void (async () => {
      try {
        await updateRole(role.id, {
          name,
          departmentId: departmentId ? Number(departmentId) : null,
          description,
        })
        navigate(roleDetailPath(role.id), {
          replace: true,
          state: { saveNotice: successNotice('Role updated.') },
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save role.')
        setBusy(false)
      }
    })()
  }

  if (!canWrite) {
    return (
      <PageStatus
        variant="forbidden"
        pageClassName="pd-people pd-org"
        aria-label="Access denied"
        description="You do not have permission to edit roles."
        action={
          <PageStatusLink
            to={role ? roleDetailPath(role.id) : '/organisation'}
            label="Back"
          />
        }
      />
    )
  }

  if (!ready || (role && !hydrated)) {
    return (
      <PageSkeleton
        pageClassName="pd-people pd-org"
        aria-label="Edit role"
      />
    )
  }

  if (!role || role.archivedAt) {
    return (
      <PageStatus
        variant="not-found"
        pageClassName="pd-people pd-org"
        aria-label="Role not found"
        title="Role not found"
        description="This role may have been archived or the link is outdated."
        action={<PageStatusLink to="/organisation" label="Back to Organisation" />}
      />
    )
  }

  return (
    <div
      className="pd-page pd-people pd-people--form pd-org"
      aria-label={`Edit ${role.name} role`}
    >
      <form className="pd-people__form-layout" onSubmit={onSubmit} noValidate>
        <div className="pd-people__form-toolbar">
          <Link
            to={roleDetailPath(role.id)}
            className="pd-people__back pd-people__back--toolbar"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Back to role
          </Link>
          <div className="pd-people__form-toolbar-end">
            {error ? (
              <p className="pd-people__message pd-people__message--error">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="pd-people__create-btn"
              disabled={busy}
            >
              <Save size={16} strokeWidth={2} aria-hidden />
              Save
            </button>
          </div>
        </div>

        <section className="pd-people__form-card">
          <header className="pd-org-detail__hero-text">
            <p className="pd-org-detail__eyebrow">General info</p>
            <h1 className="pd-org-detail__title">
              Edit {role.name} role
            </h1>
            <p className="pd-org-detail__meta">
              Identity and department. Competency matrix is edited on the role
              page.
            </p>
          </header>

          <label className="pd-field">
            <span className="pd-field__label">Role name</span>
            <input
              className="pd-field__control"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label className="pd-field">
            <span className="pd-field__label">Department</span>
            <ListboxSelect
              aria-label="Department"
              value={departmentId}
              onValueChange={setDepartmentId}
              placeholder="Select department"
              options={departmentOptions}
            />
          </label>

          <label className="pd-field">
            <span className="pd-field__label">Description (optional)</span>
            <textarea
              className="pd-field__control"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A short summary of this role."
            />
          </label>
        </section>
      </form>
    </div>
  )
}
