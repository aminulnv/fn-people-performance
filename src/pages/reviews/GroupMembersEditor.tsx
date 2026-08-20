import { useMemo, useState } from 'react'
import {
  Building2,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, Button, Input } from '@/components/ui'
import { useEmployees } from '@/lib/employees/useEmployees'
import { employeeIdsForScope } from '@/lib/reviews/cycleGroups'

type GroupMembersEditorProps = {
  memberIds: number[]
  claimedIds?: number[]
  onChange: (memberIds: number[]) => void
}

type MemberMatch = {
  key: string
  section: 'People' | 'Departments' | 'Teams'
  label: string
  description: string
  icon: LucideIcon
  ids: number[]
}

export function GroupMembersEditor({
  memberIds,
  claimedIds = [],
  onChange,
}: GroupMembersEditorProps) {
  const { employees } = useEmployees({ load: true })
  const [query, setQuery] = useState('')
  const selected = useMemo(() => new Set(memberIds), [memberIds])
  const claimedElsewhere = useMemo(
    () => new Set(claimedIds.filter((id) => !selected.has(id))),
    [claimedIds, selected],
  )

  const members = useMemo(
    () => employees.filter((employee) => selected.has(employee.employeeId)),
    [employees, selected],
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as MemberMatch[]

    const people = employees
      .filter(
        (employee) =>
          employee.isActive &&
          !selected.has(employee.employeeId) &&
          [
            employee.fullName,
            employee.email,
            employee.jobTitle,
            employee.department,
            employee.team,
          ]
            .join(' ')
            .toLowerCase()
            .includes(q),
      )
      .slice(0, 6)
      .map((employee) => ({
        key: `person:${employee.employeeId}`,
        section: 'People' as const,
        label: employee.fullName,
        description: claimedElsewhere.has(employee.employeeId)
          ? 'Will move from another group'
          : [employee.jobTitle, employee.department].filter(Boolean).join(' · '),
        icon: UserRound,
        ids: [employee.employeeId],
      }))

    const departments = [
      ...new Map(
        employees
          .filter((employee) => employee.isActive && employee.department)
          .map((employee) => [employee.department, employee]),
      ).values(),
    ]
      .filter((employee) => employee.department.toLowerCase().includes(q))
      .slice(0, 4)
      .map((employee) => {
        const ids = employeeIdsForScope(employees, {
          type: 'department',
          departmentId: employee.departmentId,
          departmentName: employee.department,
        }).filter((id) => !selected.has(id))
        return {
          key: `dept:${employee.departmentId ?? employee.department}`,
          section: 'Departments' as const,
          label: employee.department,
          description: `${ids.length} people`,
          icon: Building2,
          ids,
        }
      })
      .filter((match) => match.ids.length > 0)

    const teams = [
      ...new Map(
        employees
          .filter((employee) => employee.isActive && employee.team)
          .map((employee) => [`${employee.department}:${employee.team}`, employee]),
      ).values(),
    ]
      .filter((employee) => employee.team.toLowerCase().includes(q))
      .slice(0, 4)
      .map((employee) => {
        const ids = employeeIdsForScope(employees, {
          type: 'team',
          teamId: employee.teamId,
          teamName: employee.team,
        }).filter((id) => !selected.has(id))
        return {
          key: `team:${employee.teamId ?? employee.team}`,
          section: 'Teams' as const,
          label: employee.team,
          description: employee.department
            ? `${employee.department} · ${ids.length} people`
            : `${ids.length} people`,
          icon: UsersRound,
          ids,
        }
      })
      .filter((match) => match.ids.length > 0)

    return [...people, ...departments, ...teams]
  }, [claimedElsewhere, employees, query, selected])

  const groupedMatches = useMemo(() => {
    const sections: MemberMatch['section'][] = ['People', 'Departments', 'Teams']
    return sections
      .map((section) => ({
        section,
        results: matches.filter((match) => match.section === section),
      }))
      .filter((group) => group.results.length > 0)
  }, [matches])

  const addIds = (ids: number[]) => {
    const next = new Set(memberIds)
    for (const id of ids) next.add(id)
    onChange([...next])
    setQuery('')
  }

  return (
    <div className="pd-cycle-groups-members">
      <div className="pd-cycle-extensions__search-wrap">
        <label className="pd-cycle-extensions__search">
          <Search
            className="pd-cycle-extensions__search-icon"
            size={16}
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="pd-sr-only">Add people to this group</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Add people, a team, or a department…"
            className="pd-cycle-extensions__search-input"
          />
        </label>

        {query.trim() ? (
          <div
            className="pd-cycle-extensions__search-panel"
            role="listbox"
            aria-label="People to add"
          >
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
                      return (
                        <li key={match.key} role="option">
                          <button
                            type="button"
                            className="pd-cycle-extensions__search-result"
                            onClick={() => addIds(match.ids)}
                          >
                            <span
                              className="pd-cycle-extensions__search-result-icon"
                              aria-hidden
                            >
                              <Icon size={14} strokeWidth={2} />
                            </span>
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
        ) : null}
      </div>

      {members.length === 0 ? (
        <p className="pd-cycle-groups-members__empty">
          No people in this group yet.
        </p>
      ) : (
        <ul className="pd-cycle-groups-members__list">
          {members.map((employee) => (
            <li key={employee.employeeId}>
              <Avatar name={employee.fullName} src={employee.avatarUrl} size="sm" />
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
              <button
                type="button"
                className="pd-cycle-groups-members__remove"
                aria-label={`Remove ${employee.fullName}`}
                onClick={() =>
                  onChange(
                    memberIds.filter((id) => id !== employee.employeeId),
                  )
                }
              >
                <Trash2 size={15} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function CreateCycleGroupForm({
  claimedIds,
  onCreate,
  onCancel,
}: {
  claimedIds: number[]
  onCreate: (input: { name: string; memberIds: number[] }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [memberIds, setMemberIds] = useState<number[]>([])

  return (
    <div className="pd-reviews-edit-card pd-cycle-groups__create">
      <Input
        label="Group name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Leadership"
      />
      <GroupMembersEditor
        memberIds={memberIds}
        claimedIds={claimedIds}
        onChange={setMemberIds}
      />
      <div className="pd-cycle-groups__form-actions">
        <Button variant="secondary" pill onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          pill
          disabled={!name.trim()}
          onClick={() => onCreate({ name: name.trim(), memberIds })}
        >
          Create group
        </Button>
      </div>
    </div>
  )
}
