import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  Mail,
  Pencil,
  SquareArrowOutUpRight,
  X,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { cx } from '@/lib/cx'
import { copyText } from './actions'
import { formatStartDate } from './columns'
import {
  DATA_GAPS,
  directReportsOf,
  reportingChain,
  type DirectoryPerson,
} from './directory'

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="pd-pv2-detail">
      <dt>{label}</dt>
      <dd className={cx(!value && 'pd-pv2-gap')}>{value || 'Not set'}</dd>
    </div>
  )
}

function PersonLink({
  person,
  onSelect,
}: {
  person: DirectoryPerson
  onSelect: (id: number) => void
}) {
  return (
    <button
      type="button"
      className="pd-pv2-panel__person"
      onClick={() => onSelect(person.id)}
    >
      <Avatar
        name={person.name}
        size="sm"
        className="pd-pv2-avatar"
        style={avatarStyle(person.email || String(person.id))}
      />
      <span className="pd-pv2-panel__person-text">
        <span className="pd-pv2-panel__person-name">{person.name}</span>
        <span className="pd-pv2-panel__person-meta">
          {person.jobTitle || 'Role not set'}
        </span>
      </span>
    </button>
  )
}

export type PersonPanelProps = {
  person: DirectoryPerson
  people: DirectoryPerson[]
  onSelectPerson: (id: number) => void
  onClose: () => void
  /** Overlays the table instead of sitting beside it on narrow viewports. */
  isOverlay?: boolean
}

export function PersonPanel({
  person,
  people,
  onSelectPerson,
  onClose,
  isOverlay,
}: PersonPanelProps) {
  const [copied, setCopied] = useState(false)

  const byId = useMemo(
    () => new Map(people.map((candidate) => [candidate.id, candidate])),
    [people],
  )
  const chain = useMemo(() => reportingChain(person, byId), [byId, person])
  const reports = useMemo(() => directReportsOf(person, people), [people, person])

  useEffect(() => {
    setCopied(false)
  }, [person.id])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <aside
      className={cx('pd-pv2-panel', isOverlay && 'pd-pv2-panel--overlay')}
      aria-label={`${person.name} details`}
    >
      <div className="pd-pv2-panel__bar">
        <span className="pd-pv2-panel__bar-label">Person</span>
        <button
          type="button"
          className="pd-pv2-icon-btn"
          aria-label="Close details"
          onClick={onClose}
        >
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="pd-pv2-panel__scroll">
        <header className="pd-pv2-panel__head">
          <Avatar
            name={person.name}
            size="lg"
            className="pd-pv2-panel__avatar"
            style={avatarStyle(person.email || String(person.id))}
          />
          <h2 className="pd-pv2-panel__name">{person.name}</h2>
          <p className="pd-pv2-panel__role">
            {person.jobTitle || 'Role not set'}
          </p>
          <p className="pd-pv2-panel__sub">
            <span className={cx('pd-pv2-status', person.isActive && 'is-active')}>
              <span className="pd-pv2-status__dot" aria-hidden />
              {person.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="pd-pv2-panel__sep" aria-hidden>
              ·
            </span>
            <span className="pd-pv2-panel__id">ID {person.id}</span>
          </p>
        </header>

        <div className="pd-pv2-panel__actions">
          <Link to={`/people-v2/${person.id}`} className="pd-pv2-panel__action">
            <SquareArrowOutUpRight size={14} strokeWidth={2} aria-hidden />
            Profile
          </Link>
          <Link to={`/people/${person.id}/edit`} className="pd-pv2-panel__action">
            <Pencil size={14} strokeWidth={2} aria-hidden />
            Edit
          </Link>
          {person.email ? (
            <>
              <a
                href={`mailto:${person.email}`}
                className="pd-pv2-panel__action"
              >
                <Mail size={14} strokeWidth={2} aria-hidden />
                Email
              </a>
              <button
                type="button"
                className="pd-pv2-panel__action"
                onClick={() => {
                  void copyText(person.email).then(setCopied)
                }}
              >
                {copied ? (
                  <Check size={14} strokeWidth={2.25} aria-hidden />
                ) : (
                  <Copy size={14} strokeWidth={2} aria-hidden />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </>
          ) : null}
        </div>

        {person.gaps.length > 0 ? (
          <section className="pd-pv2-panel__section pd-pv2-panel__section--gaps">
            <h3>
              <AlertCircle size={13} strokeWidth={2} aria-hidden />
              Incomplete record
            </h3>
            <ul className="pd-pv2-panel__gaps">
              {person.gaps.map((gap) => (
                <li key={gap}>
                  {DATA_GAPS.find((entry) => entry.id === gap)?.label ?? gap}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="pd-pv2-panel__section">
          <h3>Placement</h3>
          <dl className="pd-pv2-panel__details">
            <Detail label="Division" value={person.division} />
            <Detail label="Department" value={person.department} />
            <Detail label="Team" value={person.team} />
            <Detail label="Job grade" value={person.grade} />
            <Detail
              label="Started"
              value={person.startDate ? formatStartDate(person.startDate) : ''}
            />
            <Detail
              label="Tenure"
              value={person.tenureMonths == null ? '' : person.tenureLabel}
            />
          </dl>
        </section>

        <section className="pd-pv2-panel__section">
          <h3>Reporting line</h3>
          {chain.length > 0 ? (
            <ol className="pd-pv2-panel__chain">
              {chain.map((manager, index) => (
                <li key={manager.id}>
                  {index > 0 ? (
                    <ChevronRight size={12} strokeWidth={2} aria-hidden />
                  ) : null}
                  <button
                    type="button"
                    className="pd-pv2-panel__crumb"
                    onClick={() => onSelectPerson(manager.id)}
                  >
                    {manager.name}
                  </button>
                </li>
              ))}
              <li>
                <ChevronRight size={12} strokeWidth={2} aria-hidden />
                <span className="pd-pv2-panel__crumb is-current">
                  {person.name}
                </span>
              </li>
            </ol>
          ) : (
            <p className="pd-pv2-panel__empty">
              {person.managerName
                ? `Reports to ${person.managerName}, who is not in the directory.`
                : 'No manager on record.'}
            </p>
          )}
        </section>

        <section className="pd-pv2-panel__section">
          <h3>
            Direct reports
            <span className="pd-pv2-panel__badge">{reports.length}</span>
          </h3>
          {reports.length > 0 ? (
            <div className="pd-pv2-panel__people">
              {reports.map((report) => (
                <PersonLink
                  key={report.id}
                  person={report}
                  onSelect={onSelectPerson}
                />
              ))}
            </div>
          ) : (
            <p className="pd-pv2-panel__empty">Individual contributor.</p>
          )}
        </section>

        <section className="pd-pv2-panel__section">
          <h3>People support</h3>
          <dl className="pd-pv2-panel__details">
            <Detail label="Department head" value={person.departmentHead} />
            <Detail label="HRBP" value={person.hrbp} />
          </dl>
        </section>
      </div>
    </aside>
  )
}
