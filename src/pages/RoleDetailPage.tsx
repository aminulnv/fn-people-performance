import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  Briefcase,
  Building2,
  Copy,
  FileText,
  Pencil,
  Tag,
} from 'lucide-react'
import {
  EmptyState,
  ListboxSelect,
  PageSkeleton,
  PageStatus,
  PageStatusLink,
  SegmentedControl,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useOrganisationCatalogs, useEmployees } from '@/lib/employees/useEmployees'
import {
  departmentPathForName,
  organisationTabPath,
  roleDetailPath,
} from '@/lib/organisation/paths'
import { membersForRole } from '@/lib/roles/inheritedSkills'
import { duplicateRole, loadRole, updateRole } from '@/lib/roles/store'
import type { RoleTabId } from '@/lib/roles/types'
import { useRole } from '@/lib/roles/useRoles'
import { useAuth } from '@/lib/auth'
import { OrgMembersTable } from '@/pages/org/OrgMembersTable'
import { OrgDetailRow } from '@/pages/org/OrgDetailRow'
import { RoleCompetencyMatrix } from '@/pages/org/RoleCompetencyMatrix'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

const TAB_OPTIONS: Array<{ id: RoleTabId; label: string }> = [
  { id: 'preview', label: 'Preview' },
  { id: 'matrix', label: 'Competency matrix' },
  { id: 'talent', label: 'Talent' },
]

function parseTab(raw: string | null): RoleTabId {
  if (raw === 'matrix' || raw === 'talent' || raw === 'preview') return raw
  return 'preview'
}

type LocationEditState = { editDetails?: boolean }

export default function RoleDetailPage() {
  const { roleId: rawId = '' } = useParams()
  const roleId = decodeURIComponent(rawId)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const catalogs = useOrganisationCatalogs()
  const { employees, isLoading } = useEmployees()
  const { role, ready } = useRole(roleId)
  const canEdit = hasSystemPermission(user?.permissions, 'platform.write_all')
  const tab = parseTab(searchParams.get('tab'))
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [description, setDescription] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!roleId) return
    void loadRole(roleId).catch(() => {})
  }, [roleId])

  useEffect(() => {
    const state = location.state as LocationEditState | null
    if (!state?.editDetails || !canEdit || !role) return
    setName(role.name)
    setDepartmentId(role.departmentId != null ? String(role.departmentId) : '')
    setDescription(role.description)
    setSaveError(null)
    setEditingDetails(true)
    if (tab !== 'preview') {
      const params = new URLSearchParams(searchParams)
      params.delete('tab')
      setSearchParams(params, { replace: true })
    }
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: {},
    })
  }, [
    canEdit,
    location.pathname,
    location.search,
    location.state,
    navigate,
    role,
    searchParams,
    setSearchParams,
    tab,
  ])

  const members = useMemo(
    () =>
      membersForRole(roleId).sort((left, right) =>
        left.fullName.localeCompare(right.fullName),
      ),
    [employees, roleId],
  )

  const activeMembers = useMemo(
    () => members.filter((member) => member.isActive),
    [members],
  )

  const headcount = activeMembers.length

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

  const tabOptions = useMemo(
    () =>
      TAB_OPTIONS.map((option) => {
        if (option.id === 'matrix') {
          return {
            ...option,
            label: (
              <span className="pd-org-role__tab-label">
                Competency matrix
                {role && role.skills.length > 0 ? (
                  <span className="pd-org-role__tab-badge">
                    {role.skills.length}
                  </span>
                ) : null}
              </span>
            ),
          }
        }
        if (option.id === 'talent') {
          return {
            ...option,
            label: (
              <span className="pd-org-role__tab-label">
                Talent
                <span className="pd-org-role__tab-badge">{headcount}</span>
              </span>
            ),
          }
        }
        return option
      }),
    [headcount, role],
  )

  function beginEditing() {
    if (!role || !canEdit) return
    setName(role.name)
    setDepartmentId(role.departmentId != null ? String(role.departmentId) : '')
    setDescription(role.description)
    setSaveError(null)
    setEditingDetails(true)
    if (tab !== 'preview') {
      const params = new URLSearchParams(searchParams)
      params.delete('tab')
      setSearchParams(params, { replace: true })
    }
  }

  function cancelEditing() {
    setEditingDetails(false)
    setSaveError(null)
  }

  async function saveDetails() {
    if (!role || busy) return
    const trimmed = name.trim()
    if (!trimmed) {
      setSaveError('Role name is required.')
      return
    }
    setBusy(true)
    setSaveError(null)
    setActionError(null)
    try {
      await updateRole(role.id, {
        name: trimmed,
        departmentId: departmentId ? Number(departmentId) : null,
        description,
      })
      setEditingDetails(false)
      setBusy(false)
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save role.',
      )
      setBusy(false)
    }
  }

  async function onDuplicate() {
    if (!role || busy) return
    setBusy(true)
    setActionError(null)
    try {
      const copy = await duplicateRole(role.id)
      navigate(roleDetailPath(copy.id))
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not duplicate role.',
      )
      setBusy(false)
    }
  }

  async function onArchive() {
    if (!role || busy) return
    setBusy(true)
    setActionError(null)
    try {
      await updateRole(role.id, { archivedAt: new Date().toISOString() })
      navigate(organisationTabPath('roles'))
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not archive role.',
      )
      setBusy(false)
    }
  }

  if (isLoading || !ready) {
    return (
      <PageSkeleton
        pageClassName="pd-people pd-org pd-org-detail"
        aria-label="Role"
      />
    )
  }

  if (!role || role.archivedAt) {
    return (
      <PageStatus
        variant="not-found"
        pageClassName="pd-people pd-org pd-org-detail"
        aria-label="Role not found"
        title="Role not found"
        description="This role may have been archived or the link is outdated."
        action={
          <PageStatusLink
            to={organisationTabPath('roles')}
            label="Back to Organisation"
          />
        }
      />
    )
  }

  return (
    <div
      className={[
        'pd-page pd-people pd-org pd-org-detail',
        editingDetails ? 'pd-profile--editing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={role.name}
    >
      <div className="pd-org-detail__crumbs">
        <Link to={organisationTabPath('roles')} className="pd-org-detail__back">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          Organisation
        </Link>
      </div>

      <section className="pd-org-detail__hero">
        <div className="pd-org-detail__hero-main">
          <span className="pd-org-detail__hero-icon" aria-hidden>
            <Briefcase size={28} strokeWidth={1.75} />
          </span>
          <div className="pd-org-detail__hero-text">
            <p className="pd-org-detail__eyebrow">Role</p>
            <h1 className="pd-org-detail__title">
              {editingDetails ? name.trim() || role.name : role.name}
            </h1>
          </div>
        </div>
        {canEdit ? (
          <div className="pd-org-detail__hero-actions">
            <button
              type="button"
              className="pd-people__ghost-btn"
              disabled={busy || editingDetails}
              onClick={() => {
                void onDuplicate()
              }}
            >
              <Copy size={16} strokeWidth={1.75} aria-hidden />
              Duplicate
            </button>
            <button
              type="button"
              className="pd-people__ghost-btn"
              disabled={busy || editingDetails}
              onClick={() => {
                void onArchive()
              }}
            >
              <Archive size={16} strokeWidth={1.75} aria-hidden />
              Archive
            </button>
            {editingDetails ? (
              <>
                <button
                  type="button"
                  className="pd-people__ghost-btn"
                  disabled={busy}
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pd-people__ghost-btn pd-people__ghost-btn--primary"
                  disabled={busy}
                  onClick={() => {
                    void saveDetails()
                  }}
                >
                  Save
                </button>
              </>
            ) : (
              <button
                type="button"
                className="pd-people__ghost-btn pd-people__ghost-btn--outline"
                disabled={busy}
                onClick={beginEditing}
              >
                <Pencil size={16} strokeWidth={1.75} aria-hidden />
                Edit
              </button>
            )}
          </div>
        ) : null}
      </section>

      {actionError ? (
        <p className="pd-people__message pd-people__message--error" role="alert">
          {actionError}
        </p>
      ) : null}

      <SegmentedControl
        className="pd-org-role__tabs"
        buttonClassName="pd-org-role__tab"
        options={tabOptions}
        value={tab}
        onChange={(next) => {
          if (editingDetails && next !== 'preview') {
            cancelEditing()
          }
          const params = new URLSearchParams(searchParams)
          if (next === 'preview') params.delete('tab')
          else params.set('tab', next)
          setSearchParams(params, { replace: true })
        }}
        aria-label="Role sections"
      />

      {tab === 'preview' ? (
        <section
          className="pd-profile__card pd-org-role-preview"
          aria-label="Role details"
        >
          <header className="pd-profile__card-head">
            <h2 className="pd-profile__card-title">Role details</h2>
            {canEdit && !editingDetails ? (
              <button
                type="button"
                className="pd-profile__icon-action"
                aria-label="Edit role details"
                title="Edit"
                onClick={beginEditing}
              >
                <Pencil size={14} strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
          </header>
          {saveError ? (
            <p className="pd-people__message pd-people__message--error" role="alert">
              {saveError}
            </p>
          ) : null}
          <dl className="pd-profile__details">
            <OrgDetailRow label="Name" icon={Tag}>
              {editingDetails ? (
                <input
                  className="pd-profile__inline-input"
                  aria-label="Role name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  autoFocus
                />
              ) : (
                role.name
              )}
            </OrgDetailRow>
            <OrgDetailRow label="Department" icon={Building2}>
              {editingDetails ? (
                <ListboxSelect
                  aria-label="Department"
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  placeholder="Select department"
                  options={departmentOptions}
                />
              ) : role.departmentName ? (
                <Link
                  to={
                    departmentPathForName(role.departmentName) ??
                    organisationTabPath('departments')
                  }
                  className="pd-org-detail__inline-link"
                >
                  {role.departmentName}
                </Link>
              ) : (
                <span className="pd-profile__muted">—</span>
              )}
            </OrgDetailRow>
            <OrgDetailRow label="Description" icon={FileText} align="start">
              {editingDetails ? (
                <textarea
                  className="pd-profile__inline-input pd-org-role-preview__description-input"
                  aria-label="Description"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="A short summary of this role."
                />
              ) : role.description ? (
                <span className="pd-org-role-preview__description">
                  {role.description}
                </span>
              ) : (
                <span className="pd-profile__muted">—</span>
              )}
            </OrgDetailRow>
          </dl>
        </section>
      ) : null}

      {tab === 'matrix' ? (
        <RoleCompetencyMatrix role={role} canEdit={canEdit} />
      ) : null}

      {tab === 'talent' ? (
        <section
          className="pd-people__panel pd-people__panel--table"
          aria-label="Talent"
        >
          <header className="pd-org-detail__panel-head">
            <h2 className="pd-org-detail__panel-title">Active employees</h2>
            <p className="pd-org-role__talent-summary">
              {headcount} {headcount === 1 ? 'Employee' : 'Employees'}
            </p>
          </header>
          {headcount === 0 ? (
            <EmptyState
              className="pd-empty--inline"
              title="No one linked to this role"
              description="People appear here when their profile has this role assigned. Job titles alone do not count."
              action={
                <Link to="/people" className="pd-people__ghost-btn">
                  Open People
                </Link>
              }
            />
          ) : (
            <OrgMembersTable members={activeMembers} variant="talent" />
          )}
        </section>
      ) : null}
    </div>
  )
}

/** Legacy `/organisation/roles/:id/edit` → detail page with inline edit. */
export function EditRoleRedirect() {
  const { roleId: rawId = '' } = useParams()
  const roleId = decodeURIComponent(rawId)
  return (
    <Navigate
      to={roleDetailPath(roleId)}
      replace
      state={{ editDetails: true } satisfies LocationEditState}
    />
  )
}
