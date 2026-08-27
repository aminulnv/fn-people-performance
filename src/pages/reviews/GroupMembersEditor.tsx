import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Building2,
  Plus,
  Search,
  Trash2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, Button, SegmentedControl } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'
import { useOrganisation } from '@/lib/employees/useEmployees'
import type { OrgDepartment, OrgTeam } from '@/lib/organisation/types'

type BrowseSection = 'People' | 'Departments' | 'Teams'

type OtherGroup = {
  name: string
  memberIds: number[]
}

type GroupMembersEditorProps = {
  memberIds: number[]
  claimedIds?: number[]
  otherGroups?: OtherGroup[]
  onChange: (memberIds: number[]) => void
  searchLabel?: string
  placeholder?: string
  /** People only — no department or team bulk add. */
  peopleOnly?: boolean
}

type MemberMatch = {
  key: string
  section: BrowseSection
  label: string
  description: string
  icon: LucideIcon
  ids: number[]
  person?: PlatformEmployee
}

const BROWSE_SECTIONS: { id: BrowseSection; label: string }[] = [
  { id: 'People', label: 'By person' },
  { id: 'Departments', label: 'By department' },
  { id: 'Teams', label: 'By team' },
]

const PEOPLE_BROWSE_WITHOUT_QUERY = 24
const VIRTUALIZE_AFTER = 24
const MEMBER_ROW_HEIGHT = 44
const TABLE_COLUMNS = 6

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

function moveHint(
  employeeId: number,
  claimedElsewhere: Set<number>,
  otherGroups: OtherGroup[],
): string | null {
  if (!claimedElsewhere.has(employeeId)) return null
  const groupName = otherGroups.find((group) =>
    group.memberIds.includes(employeeId),
  )?.name
  return groupName
    ? `In ${groupName} · will move`
    : 'Will move from another group'
}

function orgUnitDescription(
  ids: number[],
  claimedElsewhere: Set<number>,
  extra?: string,
): string {
  const moving = ids.filter((id) => claimedElsewhere.has(id)).length
  const count = peopleCountLabel(ids.length)
  const withMove =
    moving > 0 ? `${count} · ${moving === 1 ? '1 will move' : `${moving} will move`}` : count
  return extra ? `${extra} · ${withMove}` : withMove
}

function PersonIdentity({
  person,
  linked = false,
}: {
  person: PlatformEmployee
  linked?: boolean
}) {
  const name = linked ? (
    <Link to={`/people/${person.employeeId}`} className="pd-people__person-link">
      {person.fullName}
    </Link>
  ) : (
    <span className="pd-people__person-name">{person.fullName}</span>
  )

  return (
    <div
      className={[
        'pd-people__person',
        person.email ? 'pd-people__person--stacked' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Avatar
        name={person.fullName}
        src={person.avatarUrl || undefined}
        size="md"
        className="pd-people__avatar"
        style={avatarStyle(person.fullName)}
      />
      {person.email ? (
        <span className="pd-people__person-identity">
          {name}
          <span className="pd-people__person-email">{person.email}</span>
        </span>
      ) : (
        name
      )}
    </div>
  )
}

function RowCheck({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}) {
  return (
    <button
      type="button"
      className="pd-cycle-groups-members__check"
      aria-pressed={checked}
      aria-label={label}
      onClick={onChange}
    >
      <span
        className={[
          'pd-cycle-extensions__search-check',
          checked ? 'is-checked' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      />
    </button>
  )
}

export function GroupMembersEditor({
  memberIds,
  claimedIds = [],
  otherGroups = [],
  onChange,
  searchLabel = 'Add people to this group',
  placeholder = 'Search people, a team, or a department…',
  peopleOnly = false,
}: GroupMembersEditorProps) {
  const { employees, organisation } = useOrganisation()
  const addInputRef = useRef<HTMLInputElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [rosterQuery, setRosterQuery] = useState('')
  const [adding, setAdding] = useState(() => memberIds.length === 0)
  const [addQuery, setAddQuery] = useState('')
  const [browse, setBrowse] = useState<BrowseSection>('People')
  const [listChecked, setListChecked] = useState<Set<number>>(() => new Set())
  const selected = useMemo(() => new Set(memberIds), [memberIds])
  const claimedElsewhere = useMemo(
    () => new Set(claimedIds.filter((id) => !selected.has(id))),
    [claimedIds, selected],
  )
  const addButtonLabel = peopleOnly ? searchLabel : 'Add people'

  const members = useMemo(
    () =>
      employees
        .filter((employee) => selected.has(employee.employeeId))
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [employees, selected],
  )

  const rosterFilter = rosterQuery.trim().toLowerCase()
  const visibleMembers = useMemo(
    () =>
      rosterFilter
        ? members.filter((employee) => personMatchesQuery(employee, rosterFilter))
        : members,
    [members, rosterFilter],
  )

  const matches = useMemo((): MemberMatch[] => {
    const q = addQuery.trim().toLowerCase()
    const searching = Boolean(q)

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
        description:
          moveHint(employee.employeeId, claimedElsewhere, otherGroups) ??
          [employee.jobTitle, employee.department].filter(Boolean).join(' · '),
        icon: UsersRound,
        ids: [employee.employeeId],
        person: employee,
      }))

    if (peopleOnly) {
      if (!searching && people.length > PEOPLE_BROWSE_WITHOUT_QUERY) return []
      return people
    }
    if (!searching && browse === 'People') {
      return people.length > PEOPLE_BROWSE_WITHOUT_QUERY ? [] : people
    }

    const departments = organisation.departments
      .filter(
        (department) =>
          isAssignedOrgLabel(department.name) &&
          department.headcount > 0 &&
          (!q || department.name.toLowerCase().includes(q)),
      )
      .map((department) => ({
        key: `dept:${department.id}`,
        section: 'Departments' as const,
        label: department.name,
        description: orgUnitDescription(
          remainingMemberIds(department, selected),
          claimedElsewhere,
        ),
        icon: Building2,
        ids: remainingMemberIds(department, selected),
      }))
      .filter((match) => match.ids.length > 0)

    const teams = organisation.teams
      .filter(
        (team) =>
          isAssignedOrgLabel(team.name) &&
          team.headcount > 0 &&
          (!q || team.name.toLowerCase().includes(q)),
      )
      .map((team) => ({
        key: `team:${team.id}`,
        section: 'Teams' as const,
        label: team.name,
        description: orgUnitDescription(
          remainingMemberIds(team, selected),
          claimedElsewhere,
          team.departmentName || undefined,
        ),
        icon: UsersRound,
        ids: remainingMemberIds(team, selected),
      }))
      .filter((match) => match.ids.length > 0)

    if (searching) return [...people, ...departments, ...teams]
    if (browse === 'Departments') return departments
    return teams
  }, [
    addQuery,
    browse,
    claimedElsewhere,
    employees,
    organisation,
    otherGroups,
    peopleOnly,
    selected,
  ])

  const groupedMatches = useMemo(() => {
    const sections: BrowseSection[] = ['People', 'Departments', 'Teams']
    return sections
      .map((section) => ({
        section,
        results: matches.filter((match) => match.section === section),
      }))
      .filter((group) => group.results.length > 0)
  }, [matches])

  const searching = Boolean(addQuery.trim())
  const availablePeopleCount = useMemo(
    () =>
      employees.filter(
        (employee) => employee.isActive && !selected.has(employee.employeeId),
      ).length,
    [employees, selected],
  )
  const addEmptyCopy = searching
    ? 'No results found'
    : availablePeopleCount === 0
      ? employees.some((employee) => employee.isActive)
        ? 'Everyone is already in this group'
        : 'No people to add yet'
      : peopleOnly
        ? 'Type a name to find someone.'
        : browse === 'People'
          ? 'Type a name, or browse by team or department.'
          : 'Everyone is already in this group'
  const visiblePeopleIds = useMemo(
    () => uniqueIds(matches.filter((match) => match.section === 'People')),
    [matches],
  )
  const listCheckedCount = listChecked.size
  const allVisibleChecked =
    visibleMembers.length > 0 &&
    visibleMembers.every((person) => listChecked.has(person.employeeId))
  const shouldVirtualize = visibleMembers.length >= VIRTUALIZE_AFTER
  const memberVirtualizer = useVirtualizer({
    count: shouldVirtualize ? visibleMembers.length : 0,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => MEMBER_ROW_HEIGHT,
    overscan: 8,
  })

  useLayoutEffect(() => {
    if (!shouldVirtualize) return
    memberVirtualizer.measure()
  }, [memberVirtualizer, shouldVirtualize, visibleMembers.length])

  const virtualRows = shouldVirtualize ? memberVirtualizer.getVirtualItems() : null
  const paddingTop = virtualRows?.[0]?.start ?? 0
  const lastVirtualRow = virtualRows?.[virtualRows.length - 1]
  const paddingBottom = virtualRows
    ? memberVirtualizer.getTotalSize() - (lastVirtualRow?.end ?? 0)
    : 0
  const renderedMembers =
    virtualRows && virtualRows.length > 0
      ? virtualRows.map((row) => visibleMembers[row.index]).filter(Boolean)
      : visibleMembers

  const openAdd = () => {
    setAdding(true)
    setAddQuery('')
    setBrowse('People')
  }

  const closeAdd = () => {
    setAdding(false)
    setAddQuery('')
    setBrowse('People')
  }

  useEffect(() => {
    if (!adding) return
    addInputRef.current?.focus()
  }, [adding])

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
    if (!adding) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      closeAdd()
    }
    document.addEventListener('keydown', closeOnEscape, true)
    return () => document.removeEventListener('keydown', closeOnEscape, true)
  }, [adding])

  const addIds = (ids: number[]) => {
    if (ids.length === 0) return
    const next = new Set(memberIds)
    for (const id of ids) next.add(id)
    onChange([...next])
  }

  const removeIds = (ids: number[]) => {
    const dropping = new Set(ids)
    onChange(memberIds.filter((id) => !dropping.has(id)))
  }

  const toggleListChecked = (employeeId: number) => {
    setListChecked((prev) => {
      const next = new Set(prev)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }

  const toggleVisibleMembers = () => {
    if (allVisibleChecked) {
      setListChecked((prev) => {
        const next = new Set(prev)
        for (const person of visibleMembers) next.delete(person.employeeId)
        return next
      })
      return
    }
    setListChecked((prev) => {
      const next = new Set(prev)
      for (const person of visibleMembers) next.add(person.employeeId)
      return next
    })
  }

  return (
    <div className="pd-cycle-groups-members">
      <header className="pd-cycle-groups-members__bar">
        {members.length > 0 ? (
          <label className="pd-people__search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <span className="pd-sr-only">Search people in this group</span>
            <input
              type="search"
              value={rosterQuery}
              onChange={(event) => setRosterQuery(event.target.value)}
              placeholder="Search this group…"
              className="pd-people__search-input"
            />
          </label>
        ) : (
          <p className="pd-cycle-groups-members__lede">
            {peopleOnly
              ? 'Search and click a person to add them.'
              : 'Search a person, or browse a team or department.'}
          </p>
        )}
        {adding ? (
          <button
            type="button"
            className="pd-people__create-btn pd-people__create-btn--secondary"
            onClick={closeAdd}
          >
            Done
          </button>
        ) : (
          <button
            type="button"
            className="pd-people__create-btn"
            onClick={openAdd}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            {addButtonLabel}
          </button>
        )}
      </header>

      {adding ? (
        <div
          className="pd-cycle-groups-members__add"
          role="region"
          aria-label="People to add"
        >
          <label className="pd-people__search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <span className="pd-sr-only">{searchLabel}</span>
            <input
              ref={addInputRef}
              type="search"
              value={addQuery}
              onChange={(event) => setAddQuery(event.target.value)}
              placeholder={placeholder}
              className="pd-people__search-input"
            />
          </label>

          {!peopleOnly && !searching ? (
            <SegmentedControl
              className="pd-cycle-groups-members__browse"
              aria-label="Browse who to add"
              options={BROWSE_SECTIONS}
              value={browse}
              onChange={setBrowse}
            />
          ) : null}

          {searching && visiblePeopleIds.length > 1 ? (
            <div className="pd-cycle-groups-members__add-tools">
              <button
                type="button"
                className="pd-reviews-edit-link"
                onClick={() => addIds(visiblePeopleIds)}
              >
                {`Add all ${visiblePeopleIds.length} matching people`}
              </button>
            </div>
          ) : null}

          {matches.length === 0 ? (
            <p className="pd-cycle-groups-members__add-empty">{addEmptyCopy}</p>
          ) : (
            <div className="pd-cycle-groups-members__add-results">
              {groupedMatches.map((group) => (
                <div
                  key={group.section}
                  className="pd-cycle-groups-members__add-section"
                >
                  {searching && !peopleOnly ? (
                    <div className="pd-cycle-groups-members__add-label">
                      {group.section}
                    </div>
                  ) : null}
                  <ul className="pd-cycle-groups-members__add-list">
                    {group.results.map((match) => {
                      const Icon = match.icon
                      const actionLabel = match.person
                        ? `Add ${match.label}`
                        : `Add ${match.label}`
                      return (
                        <li key={match.key}>
                          <button
                            type="button"
                            className="pd-cycle-groups-members__add-row"
                            onClick={() => addIds(match.ids)}
                            aria-label={actionLabel}
                          >
                            {match.person ? (
                              <PersonIdentity person={match.person} />
                            ) : (
                              <span className="pd-people__person">
                                <span
                                  className="pd-cycle-groups-members__add-icon"
                                  aria-hidden
                                >
                                  <Icon size={16} strokeWidth={1.75} />
                                </span>
                                <span className="pd-people__person-name">
                                  {match.label}
                                </span>
                              </span>
                            )}
                            {match.description ? (
                              <span className="pd-cycle-groups-members__add-meta">
                                {match.description}
                              </span>
                            ) : null}
                            <span className="pd-cycle-groups-members__add-action">
                              Add
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {members.length === 0 && !adding ? (
        <div className="pd-cycle-groups-members__empty">
          <p className="pd-cycle-groups-members__empty-title">
            No one in this group yet
          </p>
          <p>Add people so this group’s goals and reviews apply to them.</p>
          <button
            type="button"
            className="pd-people__create-btn"
            onClick={openAdd}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            {addButtonLabel}
          </button>
        </div>
      ) : null}

      {members.length > 0 ? (
        <>
          {listCheckedCount > 0 ? (
            <div
              className="pd-cycle-groups-members__selection"
              role="toolbar"
              aria-label="Selected people"
            >
              <span>
                {listCheckedCount === 1
                  ? '1 selected'
                  : `${listCheckedCount} selected`}
              </span>
              <button
                type="button"
                className="pd-reviews-edit-link"
                onClick={() => setListChecked(new Set())}
              >
                Clear
              </button>
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
            </div>
          ) : null}

          {visibleMembers.length === 0 ? (
            <p className="pd-people__empty">No one in this group matches.</p>
          ) : (
            <div
              ref={tableScrollRef}
              className="pd-people__table-wrap pd-cycle-groups-members__table-wrap"
            >
              <table className="pd-people__table">
                <thead>
                  <tr>
                    <th className="pd-cycle-groups-members__check-col">
                      <RowCheck
                        checked={allVisibleChecked}
                        label={
                          allVisibleChecked
                            ? 'Clear member selection'
                            : 'Select all members'
                        }
                        onChange={toggleVisibleMembers}
                      />
                    </th>
                    <th>
                      <span className="pd-people__th">
                        Person
                        <span className="pd-people__th-count">
                          {rosterFilter
                            ? visibleMembers.length
                            : members.length}
                        </span>
                      </span>
                    </th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Team</th>
                    <th>
                      <span className="pd-sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paddingTop > 0 ? (
                    <tr className="pd-people__virtual-pad" aria-hidden>
                      <td colSpan={TABLE_COLUMNS} style={{ height: paddingTop }} />
                    </tr>
                  ) : null}
                  {renderedMembers.map((employee) => {
                    const isChecked = listChecked.has(employee.employeeId)
                    return (
                      <tr
                        key={employee.employeeId}
                        className={isChecked ? 'is-selected' : undefined}
                      >
                        <td className="pd-cycle-groups-members__check-col">
                          <RowCheck
                            checked={isChecked}
                            label={`Select ${employee.fullName}`}
                            onChange={() =>
                              toggleListChecked(employee.employeeId)
                            }
                          />
                        </td>
                        <td className="pd-people__name-cell">
                          <PersonIdentity person={employee} linked />
                        </td>
                        <td>{employee.jobTitle || '—'}</td>
                        <td>{employee.department || '—'}</td>
                        <td>{employee.team || '—'}</td>
                        <td className="pd-cycle-groups-members__action-col">
                          <button
                            type="button"
                            className="pd-cycle-groups-members__remove"
                            aria-label={`Remove ${employee.fullName}`}
                            onClick={() => removeIds([employee.employeeId])}
                          >
                            <Trash2 size={14} strokeWidth={2} aria-hidden />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {paddingBottom > 0 ? (
                    <tr className="pd-people__virtual-pad" aria-hidden>
                      <td colSpan={TABLE_COLUMNS} style={{ height: paddingBottom }} />
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
