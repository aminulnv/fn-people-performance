import { useEffect, useMemo, useState } from 'react'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, UsersRound } from 'lucide-react'
import {
  ListboxSelect,
  PageSkeleton,
  PageStatus,
  PageStatusLink,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { createTeam, updateTeam } from '@/lib/employees/store'
import {
  useEmployees,
  useOrganisationCatalogs,
} from '@/lib/employees/useEmployees'
import { teamKey, teamDetailPath, organisationTabPath } from '@/lib/organisation/paths'
import { useAuth } from '@/lib/useAuth'
import { successNotice } from '@/pages/reviews/ReviewSaveBanner'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

export default function TeamFormPage() {
  const creating = Boolean(useMatch('/organisation/teams/new'))
  const { teamId: rawId = '' } = useParams()
  const teamId = decodeURIComponent(rawId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = hasSystemPermission(user?.permissions, 'platform.write_all')
  const { employees } = useEmployees()
  const catalogs = useOrganisationCatalogs()
  const existing = useMemo(() => {
    if (creating) return null
    return (
      catalogs.teams.find(
        (team) => teamKey(team.departmentName, team.name) === teamId,
      ) ?? null
    )
  }, [catalogs.teams, creating, teamId])
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [ownerEmployeeId, setOwnerEmployeeId] = useState('')
  const [hydrated, setHydrated] = useState(creating)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (creating || !existing || hydrated) return
    setName(existing.name)
    setDepartmentId(String(existing.departmentId))
    setOwnerEmployeeId(
      existing.ownerEmployeeId != null ? String(existing.ownerEmployeeId) : '',
    )
    setHydrated(true)
  }, [creating, existing, hydrated])

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
  const peopleOptions = useMemo(
    () =>
      employees
        .filter((person) => person.isActive)
        .slice()
        .sort((left, right) => left.fullName.localeCompare(right.fullName))
        .map((person) => ({
          value: String(person.employeeId),
          label: person.fullName,
        })),
    [employees],
  )

  if (!canWrite) {
    return (
      <PageStatus
        variant="forbidden"
        pageClassName="pd-people pd-org"
        aria-label="Access denied"
        description="You do not have permission to edit teams."
        action={<PageStatusLink to={organisationTabPath('teams')} label="Back" />}
      />
    )
  }

  if (!catalogs.ready || (!creating && existing && !hydrated)) {
    return <PageSkeleton pageClassName="pd-people pd-org" aria-label="Team" />
  }

  if (!creating && !existing) {
    return (
      <PageStatus
        variant="not-found"
        pageClassName="pd-people pd-org"
        aria-label="Team not found"
        title="Team not found"
        description="This team may have been removed or the link is outdated."
        action={
          <PageStatusLink to={organisationTabPath('teams')} label="Back to Teams" />
        }
      />
    )
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const payload = {
      name,
      departmentId: Number(departmentId),
      ownerEmployeeId: ownerEmployeeId ? Number(ownerEmployeeId) : null,
    }
    void (async () => {
      const result = creating
        ? await createTeam(payload)
        : await updateTeam({ ...payload, id: existing!.id })
      setBusy(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate(teamDetailPath(teamKey(result.team.departmentName, result.team.name)), {
        replace: true,
        state: {
          saveNotice: successNotice(creating ? 'Team created.' : 'Team updated.'),
        },
      })
    })()
  }

  const title = name.trim() || (creating ? 'New team' : existing?.name ?? 'Team')

  return (
    <div
      className="pd-page pd-people pd-people--form pd-org"
      aria-label={creating ? 'Add Team' : 'Edit Team'}
    >
      <form className="pd-people__form-layout" onSubmit={onSubmit} noValidate>
        <div className="pd-people__form-toolbar">
          <Link
            to={organisationTabPath('teams')}
            className="pd-people__back pd-people__back--toolbar"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Teams
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
              {creating ? 'Add Team' : 'Save'}
            </button>
          </div>
        </div>
        <div className="pd-people__form-shell">
          <aside className="pd-people__form-aside">
            <span className="pd-org-detail__hero-icon" aria-hidden>
              <UsersRound size={28} strokeWidth={1.75} />
            </span>
            <div className="pd-people__form-aside-copy">
              <p className="pd-people__form-kicker">{creating ? 'Creating' : 'Editing'}</p>
              <h1 className="pd-people__form-title">{title}</h1>
              <p className="pd-people__form-subtitle">Team</p>
            </div>
          </aside>
          <div className="pd-people__form-main">
            <div className="pd-people__grid">
              <div className="pd-people__field" style={{ gridColumn: '1 / -1' }}>
                <label className="pd-people__label" htmlFor="team-name">
                  Team name
                </label>
                <input
                  id="team-name"
                  className="pd-people__input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="pd-people__field">
                <span className="pd-people__label">Department</span>
                <ListboxSelect
                  aria-label="Department"
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  options={departmentOptions}
                  placeholder="Select department"
                />
              </div>
              <div className="pd-people__field">
                <span className="pd-people__label">Owner</span>
                <ListboxSelect
                  aria-label="Owner"
                  value={ownerEmployeeId}
                  onValueChange={setOwnerEmployeeId}
                  options={peopleOptions}
                  placeholder="Select owner (optional)"
                  emptyLabel="No owner"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
