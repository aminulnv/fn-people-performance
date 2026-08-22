import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Building2,
  Search,
  Trash2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, Button } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'
import { useOrganisation } from '@/lib/employees/useEmployees'
import type { OrgDepartment, OrgTeam } from '@/lib/organisation/types'

type GroupMembersEditorProps = {
  memberIds: number[]
  claimedIds?: number[]
  onChange: (memberIds: number[]) => void
  searchLabel?: string
  placeholder?: string
  /** People only — no department or team bulk add. */
  peopleOnly?: boolean
}

type MemberMatch = {
  key: string
  section: 'People' | 'Departments' | 'Teams'
  label: string
  description: string
  icon: LucideIcon
  ids: number[]
  person?: PlatformEmployee
}

function uniqueIds(matches: MemberMatch[]): number[] {
  const ids = new Set<number>()
  for (const match of matches) {
    for (const id of match.ids) ids.add(id)
  }
  return [...ids]
}

function personMatchesQuery(employee: PlatformEmployee, query: string): boolean {
  if (!query) return true
  return [
    employee.fullName,
    employee.email,
    employee.jobTitle,
    employee.department,
    employee.team,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query)
}

function isAssignedOrgLabel(name: string): boolean {
  return Boolean(name.trim()) && name.trim().toLowerCase() !== 'unassigned'
}

function peopleCountLabel(count: number): string {
  return count === 1 ? '1 person' : `${count} people`
}

function remainingMemberIds(
  unit: Pick<OrgDepartment | OrgTeam, 'memberIds'>,
  selected: Set<number>,
): number[] {
  return unit.memberIds.filter((id) => !selected.has(id))
}

export function GroupMembersEditor({
  memberIds,
  claimedIds = [],
  onChange,
  searchLabel = 'Add people to this group',
  placeholder = 'Add people, a team, or a department…',
  peopleOnly = false,
}: GroupMembersEditorProps) {
  const { employees, organisation } = useOrganisation()
  const pickerId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Set<number>>(() => new Set())
  const [listChecked, setListChecked] = useState<Set<number>>(() => new Set())
  const selected = useMemo(() => new Set(memberIds), [memberIds])
  const claimedElsewhere = useMemo(
    () => new Set(claimedIds.filter((id) => !selected.has(id))),
    [claimedIds, selected],
  )

  const members = useMemo(
    () => employees.filter((employee) => selected.has(employee.employeeId)),
    [employees, selected],
  )

  const matches = useMemo((): MemberMatch[] => {
    const q = query.trim().toLowerCase()

    const people = employees
      .filter(
        (employee) =>
          employee.isActive &&
          !selected.has(employee.employeeId) &&
          personMatchesQuery(employee, q),
      )
      .map((employee) => ({
        key: `person:${employee.employeeId}`,
        section: 'People' as const,
        label: employee.fullName,
        description: claimedElsewhere.has(employee.employeeId)
          ? 'Will move from another group'
          : [employee.jobTitle, employee.department].filter(Boolean).join(' · '),
        icon: UsersRound,
        ids: [employee.employeeId],
        person: employee,
      }))

    if (!q || peopleOnly) return people

    const departments = organisation.departments
      .filter(
        (department) =>
          isAssignedOrgLabel(department.name) &&
          department.headcount > 0 &&
          department.name.toLowerCase().includes(q),
      )
      .map((department) => ({
        key: `dept:${department.id}`,
        section: 'Departments' as const,
        label: department.name,
        description: peopleCountLabel(department.headcount),
        icon: Building2,
        ids: remainingMemberIds(department, selected),
      }))
      .filter((match) => match.ids.length > 0)

    const teams = organisation.teams
      .filter(
        (team) =>
          isAssignedOrgLabel(team.name) &&
          team.headcount > 0 &&
          team.name.toLowerCase().includes(q),
      )
      .map((team) => ({
        key: `team:${team.id}`,
        section: 'Teams' as const,
        label: team.name,
        description: team.departmentName
          ? `${team.departmentName} · ${peopleCountLabel(team.headcount)}`
          : peopleCountLabel(team.headcount),
        icon: UsersRound,
        ids: remainingMemberIds(team, selected),
      }))
      .filter((match) => match.ids.length > 0)

    return [...people, ...departments, ...teams]
  }, [claimedElsewhere, employees, organisation, peopleOnly, query, selected])

  const groupedMatches = useMemo(() => {
    const sections: MemberMatch['section'][] = ['People', 'Departments', 'Teams']
    return sections
      .map((section) => ({
        section,
        results: matches.filter((match) => match.section === section),
      }))
      .filter((group) => group.results.length > 0)
  }, [matches])

  const visibleIds = useMemo(() => uniqueIds(matches), [matches])
  const allVisiblePicked =
    visibleIds.length > 0 && visibleIds.every((id) => picked.has(id))
  const pickedCount = picked.size
  const listCheckedCount = listChecked.size
  const allMembersChecked =
    members.length > 0 && members.every((person) => listChecked.has(person.employeeId))

  const closePicker = () => {
    setOpen(false)
    setQuery('')
    setPicked(new Set())
  }

  useEffect(() => {
    setListChecked((prev) => {
      let changed = false
      const next = new Set<number>()
      for (const id of prev) {
        if (selected.has(id)) next.add(id)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [selected])

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(event.target as Node)
      ) {
        closePicker()
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      closePicker()
    }
    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape, true)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape, true)
    }
  }, [open])

  const addIds = (ids: number[]) => {
    const next = new Set(memberIds)
    for (const id of ids) next.add(id)
    onChange([...next])
  }

  const removeIds = (ids: number[]) => {
    const dropping = new Set(ids)
    onChange(memberIds.filter((id) => !dropping.has(id)))
  }

  const togglePicked = (ids: number[]) => {
    setPicked((prev) => {
      const next = new Set(prev)
      const allIn = ids.every((id) => next.has(id))
      if (allIn) {
        for (const id of ids) next.delete(id)
      } else {
        for (const id of ids) next.add(id)
      }
      return next
    })
  }

  const toggleListChecked = (employeeId: number) => {
    setListChecked((prev) => {
      const next = new Set(prev)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }

  const confirmPicked = () => {
    if (pickedCount === 0) return
    addIds([...picked])
    closePicker()
  }

  return (
    <div ref={wrapRef} className="pd-cycle-groups-members">
      <div className="pd-cycle-extensions__search-wrap">
        <label className="pd-cycle-extensions__search">
          <Search
            className="pd-cycle-extensions__search-icon"
            size={16}
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="pd-sr-only">{searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pd-cycle-extensions__search-input"
            aria-expanded={open}
            aria-controls={pickerId}
            aria-autocomplete="list"
            role="combobox"
          />
        </label>

        {open ? (
          <div
            id={pickerId}
            className="pd-cycle-extensions__search-panel"
            role="listbox"
            aria-label="People to add"
            aria-multiselectable="true"
          >
            <div className="pd-cycle-extensions__search-toolbar">
              <button
                type="button"
                className="pd-reviews-edit-link"
                onClick={() =>
                  setPicked((prev) => new Set([...prev, ...visibleIds]))
                }
                disabled={allVisiblePicked || visibleIds.length === 0}
              >
                Select All
              </button>
              <button
                type="button"
                className="pd-reviews-edit-link"
                onClick={() => setPicked(new Set())}
                disabled={pickedCount === 0}
              >
                Clear All
              </button>
            </div>
            <div className="pd-cycle-extensions__search-results">
              {matches.length === 0 ? (
                <div className="pd-cycle-extensions__search-empty">
                  No results found
                </div>
              ) : (
                groupedMatches.map((group) => (
                  <div
                    key={group.section}
                    className="pd-cycle-extensions__search-section"
                  >
                    <div className="pd-cycle-extensions__search-section-label">
                      {group.section}
                    </div>
                    <ul className="pd-cycle-extensions__search-list">
                      {group.results.map((match) => {
                        const Icon = match.icon
                        const isPicked = match.ids.every((id) => picked.has(id))
                        return (
                          <li key={match.key}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isPicked}
                              className={[
                                'pd-cycle-extensions__search-result',
                                isPicked
                                  ? 'pd-cycle-extensions__search-result--selected'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              onClick={() => togglePicked(match.ids)}
                            >
                              <span
                                className={[
                                  'pd-cycle-extensions__search-check',
                                  isPicked ? 'is-checked' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                aria-hidden
                              />
                              {match.person ? (
                                <Avatar
                                  name={match.person.fullName}
                                  src={match.person.avatarUrl}
                                  size="sm"
                                  style={avatarStyle(match.person.fullName)}
                                />
                              ) : (
                                <span
                                  className="pd-cycle-extensions__search-result-icon"
                                  aria-hidden
                                >
                                  <Icon size={14} strokeWidth={2} />
                                </span>
                              )}
                              <span className="pd-cycle-extensions__search-result-text">
                                <span className="pd-cycle-extensions__search-result-label">
                                  {match.label}
                                </span>
                                {match.description ? (
                                  <span className="pd-cycle-extensions__search-result-description">
                                    {match.description}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
            <div className="pd-cycle-extensions__search-footer">
              <span>
                {pickedCount === 0
                  ? 'Select people to add'
                  : pickedCount === 1
                    ? '1 person selected'
                    : `${pickedCount} people selected`}
              </span>
              <Button
                variant="primary"
                size="sm"
                pill
                disabled={pickedCount === 0}
                onClick={confirmPicked}
              >
                Confirm
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {members.length === 0 ? (
        <div className="pd-cycle-groups-members__empty">
          <p>Search to add people</p>
        </div>
      ) : (
        <div className="pd-cycle-groups-members__roster">
          <div className="pd-cycle-groups-members__toolbar">
            <button
              type="button"
              className="pd-reviews-edit-link"
              aria-label="Select all members"
              onClick={() =>
                setListChecked(new Set(members.map((person) => person.employeeId)))
              }
              disabled={allMembersChecked}
            >
              Select All
            </button>
            <button
              type="button"
              className="pd-reviews-edit-link"
              aria-label="Clear member selection"
              onClick={() => setListChecked(new Set())}
              disabled={listCheckedCount === 0}
            >
              Clear All
            </button>
            {listCheckedCount > 0 ? (
              <Button
                variant="danger"
                size="sm"
                pill
                onClick={() => removeIds([...listChecked])}
              >
                {listCheckedCount === 1
                  ? 'Remove 1 person'
                  : `Remove ${listCheckedCount} people`}
              </Button>
            ) : null}
          </div>
          <ul className="pd-cycle-groups-members__list">
            {members.map((employee) => {
              const isChecked = listChecked.has(employee.employeeId)
              return (
                <li
                  key={employee.employeeId}
                  className={isChecked ? 'is-selected' : undefined}
                >
                  <button
                    type="button"
                    className="pd-cycle-groups-members__select"
                    aria-pressed={isChecked}
                    aria-label={`Select ${employee.fullName}`}
                    onClick={() => toggleListChecked(employee.employeeId)}
                  >
                    <span
                      className={[
                        'pd-cycle-extensions__search-check',
                        isChecked ? 'is-checked' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-hidden
                    />
                    <Avatar
                      name={employee.fullName}
                      src={employee.avatarUrl}
                      size="sm"
                      style={avatarStyle(employee.fullName)}
                    />
                    <span className="pd-cycle-groups-members__person">
                      <strong>{employee.fullName}</strong>
                      <small>
                        {claimedElsewhere.has(employee.employeeId)
                          ? 'Will move from another group'
                          : [employee.jobTitle, employee.department]
                              .filter(Boolean)
                              .join(' · ') || 'No role listed'}
                      </small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="pd-cycle-groups-members__remove"
                    aria-label={`Remove ${employee.fullName}`}
                    onClick={() => removeIds([employee.employeeId])}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
