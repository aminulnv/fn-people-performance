import { useMemo, useState } from 'react'
import {
  Building2,
  Search,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, Button } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'
import { useOrganisation } from '@/lib/employees/useEmployees'
import type { OrgDepartment, OrgTeam } from '@/lib/organisation/types'
import {
  compareByNameRelevance,
  compareGroupsByNameRelevance,
  nameRelevanceScore,
} from '@/lib/search/nameRelevance'

type ResultSection = 'People' | 'Departments' | 'Teams' | 'People Added'

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

type SearchRow = {
  key: string
  section: ResultSection
  label: string
  description: string
  selectLabel: string
  ids: number[]
  icon: LucideIcon
  person?: PlatformEmployee
  score: number
}

const RESULT_SECTIONS: ResultSection[] = [
  'People',
  'Departments',
  'Teams',
  'People Added',
]

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

function includesQuery(values: Array<string | number>, query: string): boolean {
  return values.some((value) => String(value).toLowerCase().includes(query))
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

function personDescription(
  employee: PlatformEmployee,
  hint: string | null,
): string {
  return [employee.jobTitle, employee.department, hint].filter(Boolean).join(' · ')
}

function SearchResultRow({
  row,
  checked,
  onToggle,
}: {
  row: SearchRow
  checked: boolean
  onToggle: () => void
}) {
  const Icon = row.icon
  return (
    <li>
      <button
        type="button"
        className={
          checked
            ? 'pd-cycle-extensions__search-result pd-cycle-extensions__search-result--selected'
            : 'pd-cycle-extensions__search-result'
        }
        aria-pressed={checked}
        aria-label={row.selectLabel}
        onClick={onToggle}
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
        {row.person ? (
          <Avatar
            name={row.person.fullName}
            src={row.person.avatarUrl || undefined}
            size="sm"
            style={avatarStyle(row.person.fullName)}
          />
        ) : (
          <span className="pd-cycle-extensions__search-result-icon" aria-hidden>
            <Icon size={14} strokeWidth={2} />
          </span>
        )}
        <span className="pd-cycle-extensions__search-result-text">
          <span className="pd-cycle-extensions__search-result-label">
            {row.label}
          </span>
          {row.description ? (
            <span className="pd-cycle-extensions__search-result-description">
              {row.description}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  )
}

export function GroupMembersEditor({
  memberIds,
  claimedIds = [],
  otherGroups = [],
  onChange,
  searchLabel = 'Search people in this group',
  placeholder = 'Search teams, departments, or people…',
  peopleOnly = false,
}: GroupMembersEditorProps) {
  const { employees, organisation } = useOrganisation()
  const [query, setQuery] = useState('')
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set())
  const selected = useMemo(() => new Set(memberIds), [memberIds])
  const claimedElsewhere = useMemo(
    () => new Set(claimedIds.filter((id) => !selected.has(id))),
    [claimedIds, selected],
  )
  const filter = query.trim().toLowerCase()
  const searching = Boolean(filter)

  const resultRows = useMemo(() => {
    const people: SearchRow[] = []
    const departments: SearchRow[] = []
    const teams: SearchRow[] = []
    const members: SearchRow[] = []

    for (const employee of employees) {
      const inGroup = selected.has(employee.employeeId)
      if (!inGroup) continue
      if (searching && !personMatchesQuery(employee, filter)) continue
      const hint = moveHint(employee.employeeId, claimedElsewhere, otherGroups)
      members.push({
        key: `member:${employee.employeeId}`,
        section: 'People Added',
        label: employee.fullName,
        description: personDescription(employee, hint),
        selectLabel: hint
          ? `Select ${employee.fullName}. ${hint}`
          : `Select ${employee.fullName}`,
        ids: [employee.employeeId],
        icon: UserRound,
        person: employee,
        score: searching
          ? nameRelevanceScore(
              employee.fullName,
              [
                employee.email,
                employee.jobTitle,
                employee.department,
                employee.team,
              ],
              filter,
            )
          : 0,
      })
    }
    members.sort(compareByNameRelevance)

    if (!searching) return members

    for (const employee of employees) {
      if (!employee.isActive || selected.has(employee.employeeId)) continue
      if (!personMatchesQuery(employee, filter)) continue
      const hint = moveHint(employee.employeeId, claimedElsewhere, otherGroups)
      people.push({
        key: `person:${employee.employeeId}`,
        section: 'People',
        label: employee.fullName,
        description: personDescription(employee, hint),
        selectLabel: hint
          ? `Select ${employee.fullName}. ${hint}`
          : `Select ${employee.fullName}`,
        ids: [employee.employeeId],
        icon: UserRound,
        person: employee,
        score: nameRelevanceScore(
          employee.fullName,
          [
            employee.email,
            employee.jobTitle,
            employee.department,
            employee.team,
          ],
          filter,
        ),
      })
    }
    people.sort(compareByNameRelevance)

    if (!peopleOnly) {
      for (const department of organisation.departments) {
        if (!isAssignedOrgLabel(department.name) || department.headcount === 0) {
          continue
        }
        if (
          !includesQuery(
            [
              department.name,
              department.head?.fullName ?? '',
              ...department.teams.flatMap((team) => [
                team.name,
                team.manager?.fullName ?? '',
              ]),
            ],
            filter,
          )
        ) {
          continue
        }
        const ids = remainingMemberIds(department, selected)
        if (ids.length === 0) continue
        departments.push({
          key: `department:${department.id}`,
          section: 'Departments',
          label: department.name,
          description: orgUnitDescription(ids, claimedElsewhere),
          selectLabel: `Select ${department.name}`,
          ids,
          icon: Building2,
          score: nameRelevanceScore(
            department.name,
            [
              department.head?.fullName ?? '',
              ...department.teams.flatMap((team) => [
                team.name,
                team.manager?.fullName ?? '',
              ]),
            ],
            filter,
          ),
        })
      }

      for (const team of organisation.teams) {
        if (!isAssignedOrgLabel(team.name) || team.headcount === 0) continue
        if (
          !includesQuery(
            [team.name, team.departmentName, team.manager?.fullName ?? ''],
            filter,
          )
        ) {
          continue
        }
        const ids = remainingMemberIds(team, selected)
        if (ids.length === 0) continue
        const departmentName = team.departmentName || undefined
        teams.push({
          key: `team:${team.id}`,
          section: 'Teams',
          label: team.name,
          description: orgUnitDescription(ids, claimedElsewhere, departmentName),
          selectLabel: departmentName
            ? `Select ${team.name} in ${departmentName}`
            : `Select ${team.name}`,
          ids,
          icon: UsersRound,
          score: nameRelevanceScore(
            team.name,
            [team.departmentName, team.manager?.fullName ?? ''],
            filter,
          ),
        })
      }
    }

    return [...people, ...departments, ...teams, ...members]
  }, [
    claimedElsewhere,
    employees,
    filter,
    organisation,
    otherGroups,
    peopleOnly,
    searching,
    selected,
  ])

  const groupedResults = RESULT_SECTIONS.map((section) => ({
    section,
    rows: resultRows.filter((row) => row.section === section).sort(compareByNameRelevance),
  }))
    .filter((group) => group.rows.length > 0)
    .sort((left, right) =>
      compareGroupsByNameRelevance(RESULT_SECTIONS)(
        { section: left.section, items: left.rows },
        { section: right.section, items: right.rows },
      ),
    )

  const visibleIds = useMemo(() => {
    const ids = new Set<number>()
    for (const row of resultRows) {
      for (const id of row.ids) ids.add(id)
    }
    return ids
  }, [resultRows])

  const selectedToAdd = [...checkedIds].filter(
    (id) => visibleIds.has(id) && !selected.has(id),
  )
  const selectedToRemove = [...checkedIds].filter(
    (id) => visibleIds.has(id) && selected.has(id),
  )
  const addCount = selectedToAdd.length
  const hasSelection = addCount > 0 || selectedToRemove.length > 0

  const emptyCopy = searching
    ? 'No results found'
    : memberIds.length === 0
      ? peopleOnly
        ? 'Search to add people'
        : 'Search to add people, teams, or departments'
      : 'No one in this group yet'

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

  const clearChecked = (ids: number[]) => {
    const dropping = new Set(ids)
    setCheckedIds((prev) => {
      const next = new Set(prev)
      for (const id of dropping) next.delete(id)
      return next
    })
  }

  const toggleIds = (ids: number[]) => {
    if (ids.length === 0) return
    setCheckedIds((prev) => {
      const next = new Set(prev)
      const allChecked = ids.every((id) => next.has(id))
      if (allChecked) {
        for (const id of ids) next.delete(id)
      } else {
        for (const id of ids) next.add(id)
      }
      return next
    })
  }

  const rowChecked = (ids: number[]) =>
    ids.length > 0 && ids.every((id) => checkedIds.has(id))

  const commitAdd = () => {
    addIds(selectedToAdd)
    clearChecked(selectedToAdd)
  }

  const commitRemove = () => {
    removeIds(selectedToRemove)
    clearChecked(selectedToRemove)
  }

  return (
    <div className="pd-cycle-groups-members">
      <header className="pd-cycle-groups-members__bar">
        <label className="pd-cycle-extensions__search">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pd-cycle-extensions__search-icon"
            aria-hidden
          />
          <span className="pd-sr-only">{searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={peopleOnly ? placeholder : 'Search teams, departments, or people…'}
            className="pd-cycle-extensions__search-input"
          />
        </label>
      </header>

      {hasSelection ? (
        <div className="pd-cycle-groups-members__fab">
          <div className="pd-cycle-groups-members__fab-inner">
            {selectedToRemove.length > 0 ? (
              <Button
                variant="danger"
                size="sm"
                pill
                onClick={commitRemove}
              >
                {selectedToRemove.length === 1
                  ? 'Remove 1 person'
                  : `Remove ${selectedToRemove.length} people`}
              </Button>
            ) : null}
            {addCount > 0 ? (
              <Button variant="primary" size="sm" pill onClick={commitAdd}>
                {addCount === 1 ? 'Add 1 Person' : `Add ${addCount} People`}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {groupedResults.length === 0 ? (
        <p className="pd-cycle-groups-members__add-empty">{emptyCopy}</p>
      ) : (
        groupedResults.map((group) => (
          <section
            key={group.section}
            className="pd-cycle-extensions__search-section"
            aria-label={group.section}
          >
            <h3 className="pd-cycle-extensions__search-section-label">
              {group.section}
            </h3>
            <ul className="pd-cycle-extensions__search-list">
              {group.rows.map((row) => (
                <SearchResultRow
                  key={row.key}
                  row={row}
                  checked={rowChecked(row.ids)}
                  onToggle={() => toggleIds(row.ids)}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
