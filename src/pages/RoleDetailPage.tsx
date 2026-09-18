import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  Briefcase,
  Building2,
  Copy,
  MapPin,
  Pencil,
} from 'lucide-react'
import {
  Button,
  PageSkeleton,
  PageStatus,
  PageStatusLink,
  SegmentedControl,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useEmployees } from '@/lib/employees/useEmployees'
import {
  departmentPathForName,
  organisationTabPath,
  roleDetailPath,
  roleEditPath,
} from '@/lib/organisation/paths'
import { formatNips, roleNipsPercent } from '@/lib/roles/labels'
import {
  membersForRole,
} from '@/lib/roles/inheritedSkills'
import { duplicateRole, loadRole, updateRole } from '@/lib/roles/store'
import type { RoleTabId } from '@/lib/roles/types'
import { useRole } from '@/lib/roles/useRoles'
import { useAuth } from '@/lib/auth'
import { OrgMembersTable } from '@/pages/org/OrgMembersTable'
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

export default function RoleDetailPage() {
  const { roleId: rawId = '' } = useParams()
  const roleId = decodeURIComponent(rawId)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { employees, isLoading } = useEmployees()
  const { role, ready } = useRole(roleId)
  const canEdit = hasSystemPermission(user?.permissions, 'platform.write_all')
  const tab = parseTab(searchParams.get('tab'))
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!roleId) return
    void loadRole(roleId).catch(() => {})
  }, [roleId])

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

  const nipsPercent = role ? roleNipsPercent(role, members) : 0
  const headcount = activeMembers.length

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
                <span className="pd-org-role__tab-badge">
                  {headcount}
                  {headcount > 0 ? ` · ${formatNips(nipsPercent)}` : ''}
                </span>
              </span>
            ),
          }
        }
        return option
      }),
    [headcount, nipsPercent, role],
  )

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
        action={<PageStatusLink to={organisationTabPath('roles')} label="Back to Organisation" />}
      />
    )
  }

  return (
    <div className="pd-page pd-people pd-org pd-org-detail" aria-label={role.name}>
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
            <h1 className="pd-org-detail__title">{role.name}</h1>
            <p className="pd-org-detail__meta pd-org-role__chips">
              <span className="pd-org-role__chip">Role</span>
            </p>
          </div>
        </div>
        {canEdit ? (
          <div className="pd-org-detail__hero-actions">
            <Button
              variant="secondary"
              size="sm"
              pill
              disabled={busy}
              onClick={() => {
                void onDuplicate()
              }}
            >
              <Copy size={14} strokeWidth={1.75} aria-hidden />
              Duplicate
            </Button>
            <Button
              variant="secondary"
              size="sm"
              pill
              disabled={busy}
              onClick={() => {
                void onArchive()
              }}
            >
              <Archive size={14} strokeWidth={1.75} aria-hidden />
              Archive
            </Button>
            <Link
              to={roleEditPath(role.id)}
              className="pd-btn pd-btn--primary pd-btn--sm pd-btn--pill"
            >
              <Pencil size={14} strokeWidth={1.75} aria-hidden />
              Edit
            </Link>
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
          const params = new URLSearchParams(searchParams)
          if (next === 'preview') params.delete('tab')
          else params.set('tab', next)
          setSearchParams(params, { replace: true })
        }}
        aria-label="Role sections"
      />

      {tab === 'preview' ? (
        <section
          className="pd-people__panel pd-org-role-preview"
          aria-label="Role details"
        >
          <header className="pd-org-detail__panel-head">
            <h2 className="pd-org-detail__panel-title">Role details</h2>
            {canEdit ? (
              <Link to={roleEditPath(role.id)} className="pd-org-role__edit-link">
                Edit
              </Link>
            ) : null}
          </header>
          <dl className="pd-org-role-preview__details">
            <div className="pd-org-role-preview__row">
              <dt>Name</dt>
              <dd>{role.name}</dd>
            </div>
            <div className="pd-org-role-preview__row">
              <dt>Department</dt>
              <dd>
                {role.departmentName ? (
                  <Link
                    to={
                      departmentPathForName(role.departmentName) ??
                      organisationTabPath('departments')
                    }
                    className="pd-org-detail__inline-link"
                  >
                    <Building2 size={15} strokeWidth={1.75} aria-hidden />
                    {role.departmentName}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="pd-org-role-preview__row">
              <dt>Locations</dt>
              <dd>
                <span className="pd-org-role-preview__locations">
                  <MapPin size={14} strokeWidth={1.75} aria-hidden />
                  {role.locations || 'All'}
                </span>
              </dd>
            </div>
            <div className="pd-org-role-preview__row">
              <dt>Description</dt>
              <dd className="pd-org-role-preview__description">
                {role.description || '—'}
              </dd>
            </div>
            <div className="pd-org-role-preview__row">
              <dt>Goals</dt>
              <dd>
                {role.goals.length > 0 ? (
                  <ul className="pd-org-role-preview__goals">
                    {role.goals.map((goal) => (
                      <li key={goal}>{goal}</li>
                    ))}
                  </ul>
                ) : (
                  '—'
                )}
              </dd>
            </div>
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
              {' · '}
              <span
                className={
                  nipsPercent >= 67
                    ? 'pd-org-role__nips pd-org-role__nips--good'
                    : nipsPercent > 0
                      ? 'pd-org-role__nips pd-org-role__nips--mid'
                      : 'pd-org-role__nips pd-org-role__nips--low'
                }
              >
                {formatNips(nipsPercent)} NIPS
              </span>
            </p>
          </header>
          <OrgMembersTable members={activeMembers} variant="talent" />
        </section>
      ) : null}
    </div>
  )
}
