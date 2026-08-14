import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CalendarDays,
  Check,
  Search,
  UserRoundSearch,
  X,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { PlatformEmployee } from '@/lib/employees/types'

type GradePublishingExclusionsDrawerProps = {
  open: boolean
  cycleName: string
  selectedIds: number[]
  onChange: (ids: number[]) => void
  onClose: () => void
}

export function GradePublishingExclusionsDrawer({
  open,
  cycleName,
  selectedIds,
  onChange,
  onClose,
}: GradePublishingExclusionsDrawerProps) {
  const titleId = useId()
  const descriptionId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState('')
  const { employees, isLoading } = useEmployees({ load: true })

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const active = employees.filter((person) => person.isActive)
    if (!q) return active
    return active.filter((person) => {
      const haystack = [
        person.fullName,
        person.email,
        person.jobTitle,
        person.department,
        person.team,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [employees, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const togglePerson = (employeeId: number) => {
    if (selectedSet.has(employeeId)) {
      onChange(selectedIds.filter((id) => id !== employeeId))
      return
    }
    onChange([...selectedIds, employeeId])
  }

  const selectedPeople = employees.filter((person) =>
    selectedSet.has(person.employeeId),
  )

  return createPortal(
    <div className="pd-reviews-drawer">
      <button
        type="button"
        className="pd-reviews-drawer__scrim"
        aria-label="Close grade publishing exclusions"
        onClick={onClose}
      />
      <aside
        className="pd-reviews-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="pd-reviews-drawer__header">
          <button
            ref={closeRef}
            type="button"
            className="pd-reviews-drawer__close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
          <div className="pd-reviews-drawer__heading">
            <h2 id={titleId} className="pd-reviews-drawer__title">
              Grade publishing exclusions
            </h2>
            <p id={descriptionId} className="pd-reviews-drawer__subtitle">
              Select individual employees who will not receive their grade
              automatically when results are published.
            </p>
            <span className="pd-reviews-drawer__cycle">
              <CalendarDays size={14} strokeWidth={1.75} aria-hidden />
              {cycleName}
            </span>
          </div>
        </header>

        <div className="pd-reviews-drawer__search">
          <Search size={16} strokeWidth={1.75} aria-hidden />
          <label className="pd-sr-only" htmlFor="grade-exclusion-search">
            Search employees to exclude
          </label>
          <input
            id="grade-exclusion-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees to exclude."
            className="pd-reviews-drawer__search-input"
          />
        </div>

        <div className="pd-reviews-drawer__body">
          {selectedPeople.length === 0 && !query.trim() ? (
            <div className="pd-reviews-drawer__empty">
              <span className="pd-reviews-drawer__empty-icon" aria-hidden>
                <UserRoundSearch size={40} strokeWidth={1.5} />
              </span>
              <p className="pd-reviews-drawer__empty-title">
                No employee selected.
              </p>
              <p className="pd-reviews-drawer__empty-hint">
                Search above to find people to exclude from automatic grade
                publishing.
              </p>
            </div>
          ) : isLoading ? (
            <p className="pd-reviews-drawer__status">Loading employees…</p>
          ) : filtered.length === 0 ? (
            <p className="pd-reviews-drawer__status">No employees match.</p>
          ) : (
            <ul className="pd-reviews-drawer__list">
              {(query.trim() ? filtered : selectedPeople).map((person) => (
                <ExclusionRow
                  key={person.employeeId}
                  person={person}
                  selected={selectedSet.has(person.employeeId)}
                  onToggle={() => togglePerson(person.employeeId)}
                />
              ))}
            </ul>
          )}
        </div>

        {selectedPeople.length > 0 ? (
          <footer className="pd-reviews-drawer__footer">
            <span>
              {selectedPeople.length} excluded
            </span>
            <button
              type="button"
              className="pd-reviews-edit-link"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  )
}

function ExclusionRow({
  person,
  selected,
  onToggle,
}: {
  person: PlatformEmployee
  selected: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        className={[
          'pd-reviews-drawer__row',
          selected ? 'is-selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onToggle}
        aria-pressed={selected}
      >
        <Avatar
          name={person.fullName}
          src={person.avatarUrl || undefined}
          size="sm"
          style={avatarStyle(person.fullName)}
        />
        <span className="pd-reviews-drawer__row-text">
          <span className="pd-reviews-drawer__row-name">{person.fullName}</span>
          <span className="pd-reviews-drawer__row-meta">
            {[person.jobTitle, person.department].filter(Boolean).join(' · ')}
          </span>
        </span>
        {selected ? (
          <span className="pd-reviews-drawer__check" aria-hidden>
            <Check size={16} strokeWidth={2.25} />
          </span>
        ) : null}
      </button>
    </li>
  )
}

export function exclusionsLabel(count: number): string {
  if (count <= 0) return 'No exclusions'
  if (count === 1) return '1 exclusion'
  return `${count} exclusions`
}
