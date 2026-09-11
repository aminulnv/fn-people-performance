import {
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ListFilter,
  Search,
  UserCheck,
  UsersRound,
} from 'lucide-react'
import {
  Avatar,
  Button,
  ConfirmDialog,
  SegmentedControl,
} from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'
import { useEmployees } from '@/lib/employees/useEmployees'
import { compareByNameRelevance, nameRelevanceScore } from '@/lib/search/nameRelevance'
import { useFloatingPanel } from '@/components/ui/useFloatingPanel'

type Pane = 'browse' | 'selected'
type PendingPeopleChange = {
  type: 'add' | 'remove'
  ids: number[]
}

const VIRTUALIZE_AFTER = 24
const VIRTUAL_OVERSCAN = 8
const VIRTUAL_ROW_ESTIMATE = 44

type OtherGroup = {
  name: string
  memberIds: number[]
}

type GroupMembersEditorProps = {
  memberIds: number[]
  claimedIds?: number[]
  otherGroups?: OtherGroup[]
  onChange: (memberIds: number[]) => Promise<unknown> | void
  onDirtyChange?: (dirty: boolean) => void
  searchLabel?: string
  placeholder?: string
  /** People only - no department or team bulk add. */
  peopleOnly?: boolean
  /** Controlled Added / Not added segment (hash-linked by the parent). */
  pane?: Pane
  onPaneChange?: (pane: Pane) => void
}

type ListRow = {
  key: string
  label: string
  description: string
  actionLabel: string
  ids: number[]
  person: PlatformEmployee
  score: number
}

function personMatchesQuery(employee: PlatformEmployee, query: string): boolean {
  if (!query) return true
  return [
    employee.fullName,
    employee.email,
    employee.jobTitle,
    employee.department,
    employee.team,
    employee.reportsToName,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query)
}

function uniqueSortedOptions(
  values: Iterable<string>,
): { value: string; label: string }[] {
  return [...new Set([...values].filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: value }))
}

function isAssignedOrgLabel(name: string): boolean {
  return Boolean(name.trim()) && name.trim().toLowerCase() !== 'unassigned'
}

function peopleCountLabel(count: number): string {
  return count === 1 ? '1 person' : `${count} people`
}

function setsEqual(left: Set<number>, right: Set<number>): boolean {
  if (left.size !== right.size) return false
  for (const value of left) {
    if (!right.has(value)) return false
  }
  return true
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

function personDescription(hint: string | null): string {
  return hint ?? ''
}

function RowAvatar({
  name,
  src,
  size = 'md',
}: {
  name: string
  src?: string
  size?: 'sm' | 'md'
}) {
  return (
    <Avatar
      name={name}
      src={src}
      size={size}
      className="pd-people__avatar"
      style={avatarStyle(name)}
    />
  )
}

function PersonTableRow({
  row,
  checked,
  reviewerAvatarUrl,
  onToggle,
}: {
  row: ListRow
  checked: boolean
  reviewerAvatarUrl?: string
  onToggle: () => void
}) {
  const reviewerName = row.person.reportsToName.trim()
  return (
    <tr className={checked ? 'is-selected' : undefined}>
      <td className="pd-cycle-setup__people-select-cell">
        <label className="pd-cycle-setup__people-select">
          <input
            type="checkbox"
            className="pd-sr-only"
            checked={checked}
            aria-label={`Select ${row.label}`}
            onChange={onToggle}
          />
          <span
            className={[
              'pd-cycle-extensions__search-check',
              checked ? 'is-checked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden
          />
        </label>
      </td>
      <td className="pd-people__name-cell">
        <span
          className={
            row.description
              ? 'pd-people__person pd-people__person--stacked'
              : 'pd-people__person'
          }
        >
          <RowAvatar
            name={row.person.fullName}
            src={row.person.avatarUrl || undefined}
          />
          {row.description ? (
            <span className="pd-people__person-identity">
              <span className="pd-people__person-name">{row.label}</span>
              <span className="pd-people__person-email">{row.description}</span>
            </span>
          ) : (
            <span className="pd-people__person-name">{row.label}</span>
          )}
        </span>
      </td>
      <td>{row.person.jobTitle || '-'}</td>
      <td>
        {isAssignedOrgLabel(row.person.team) ? row.person.team : '-'}
      </td>
      <td>
        {isAssignedOrgLabel(row.person.department)
          ? row.person.department
          : '-'}
      </td>
      <td>
        {reviewerName ? (
          <span className="pd-people__person">
            <RowAvatar
              name={reviewerName}
              src={reviewerAvatarUrl}
              size="sm"
            />
            <span className="pd-people__person-name">{reviewerName}</span>
          </span>
        ) : (
          '-'
        )}
      </td>
    </tr>
  )
}

export type ColumnFilterOption = {
  value: string
  label: string
}

/** Renders the shared searchable multi-select menu used in table headers. */
export function ColumnMultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: ColumnFilterOption[]
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const panelId = useId()
  const containerRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const panelStyle = useFloatingPanel({
    open,
    anchorRef: containerRef,
    panelRef,
  })

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (
        !containerRef.current?.contains(event.target as Node) &&
        !panelRef.current?.contains(event.target as Node)
      ) {
        setOpen(false)
        setQuery('')
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const needle = query.trim().toLowerCase()
  const visibleOptions = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options
  const visibleValues = new Set(visibleOptions.map((option) => option.value))
  const allVisibleSelected =
    visibleOptions.length > 0 &&
    visibleOptions.every((option) => selected.includes(option.value))

  const toggleOption = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value],
    )
  }

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      onChange(selected.filter((value) => !visibleValues.has(value)))
      return
    }
    onChange([...new Set([...selected, ...visibleValues])])
  }

  return (
    <span
      ref={containerRef}
      className="pd-cycle-groups-members__column-filter-menu"
    >
      <button
        type="button"
        className={[
          'pd-cycle-groups-members__column-filter-trigger',
          selected.length > 0 ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={
          selected.length > 0
            ? `Filter ${label}, ${selected.length} selected`
            : `Filter ${label}`
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((current) => !current)
          setQuery('')
        }}
      >
        <ListFilter size={15} strokeWidth={1.8} aria-hidden />
      </button>
      {open
        ? createPortal(
        <span
          ref={panelRef}
          id={panelId}
          className="pd-cycle-groups-members__column-filter-panel"
          role="dialog"
          aria-label={`Filter ${label}`}
          style={{
            ...panelStyle,
            visibility: panelStyle ? 'visible' : 'hidden',
          }}
        >
          <label className="pd-cycle-groups-members__column-filter-search">
            <Search size={15} strokeWidth={1.8} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label.toLowerCase()}`}
              autoFocus
            />
          </label>
          <button
            type="button"
            className="pd-cycle-groups-members__column-filter-all"
            aria-label={`${allVisibleSelected ? 'Deselect all' : 'Select all'} ${label} values`}
            onClick={toggleAllVisible}
          >
            <span className="pd-people-filters__check" aria-hidden>
              <input
                type="checkbox"
                className="pd-check__input"
                checked={allVisibleSelected}
                readOnly
                tabIndex={-1}
              />
              <span className="pd-check__box" />
            </span>
            <span>{allVisibleSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
          <span
            className="pd-cycle-groups-members__column-filter-options"
            role="listbox"
            aria-label={`${label} values`}
            aria-multiselectable
          >
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className="pd-cycle-groups-members__column-filter-option"
                    onClick={() => toggleOption(option.value)}
                  >
                    <span className="pd-people-filters__check" aria-hidden>
                      <input
                        type="checkbox"
                        className="pd-check__input"
                        checked={isSelected}
                        readOnly
                        tabIndex={-1}
                      />
                      <span className="pd-check__box" />
                    </span>
                    <span>{option.label}</span>
                  </button>
                )
              })
            ) : (
              <span className="pd-cycle-groups-members__column-filter-empty">
                No values match
              </span>
            )}
          </span>
        </span>,
            document.body,
          )
        : null}
    </span>
  )
}

function PeopleTable({
  rows,
  added,
  checkedIds,
  employeesById,
  employeeFilters,
  roleFilters,
  departmentFilters,
  teamFilters,
  reviewerFilters,
  employeeOptions,
  roleOptions,
  departmentOptions,
  teamOptions,
  reviewerOptions,
  onEmployeeFiltersChange,
  onRoleFiltersChange,
  onDepartmentFiltersChange,
  onTeamFiltersChange,
  onReviewerFiltersChange,
  onToggleAll,
  onToggle,
}: {
  rows: ListRow[]
  added: boolean
  checkedIds: Set<number>
  employeesById: Map<number, PlatformEmployee>
  employeeFilters: string[]
  roleFilters: string[]
  departmentFilters: string[]
  teamFilters: string[]
  reviewerFilters: string[]
  employeeOptions: ColumnFilterOption[]
  roleOptions: ColumnFilterOption[]
  departmentOptions: ColumnFilterOption[]
  teamOptions: ColumnFilterOption[]
  reviewerOptions: ColumnFilterOption[]
  onEmployeeFiltersChange: (values: string[]) => void
  onRoleFiltersChange: (values: string[]) => void
  onDepartmentFiltersChange: (values: string[]) => void
  onTeamFiltersChange: (values: string[]) => void
  onReviewerFiltersChange: (values: string[]) => void
  onToggleAll: () => void
  onToggle: (row: ListRow) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const checkedRowCount = rows.filter((row) =>
    row.ids.every((id) => checkedIds.has(id)),
  ).length
  const allRowsChecked = rows.length > 0 && checkedRowCount === rows.length
  const someRowsChecked = checkedRowCount > 0 && !allRowsChecked
  const shouldVirtualize = rows.length >= VIRTUALIZE_AFTER
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => VIRTUAL_ROW_ESTIMATE,
    overscan: VIRTUAL_OVERSCAN,
  })

  useLayoutEffect(() => {
    if (!shouldVirtualize) return
    virtualizer.measure()
  }, [shouldVirtualize, rows.length, virtualizer])

  const virtualRows = shouldVirtualize ? virtualizer.getVirtualItems() : null
  const paddingTop = virtualRows?.[0]?.start ?? 0
  const lastVirtualRow = virtualRows?.[virtualRows.length - 1]
  const paddingBottom = virtualRows
    ? virtualizer.getTotalSize() - (lastVirtualRow?.end ?? 0)
    : 0
  const visibleRows =
    virtualRows && virtualRows.length > 0
      ? virtualRows.map((item) => rows[item.index]!).filter(Boolean)
      : rows

  return (
    <div className="pd-people__table-wrap" ref={scrollRef}>
      <table
        className="pd-people__table pd-cycle-setup__eligibility-table pd-cycle-groups-members__people-table"
        aria-label={added ? 'Added people' : 'People not added'}
      >
        <thead>
          <tr>
            <th className="pd-cycle-setup__people-select-cell" scope="col">
              <label className="pd-cycle-setup__people-select">
                <input
                  type="checkbox"
                  className="pd-sr-only"
                  checked={allRowsChecked}
                  aria-label={
                    allRowsChecked ? 'Clear all people' : 'Select all people'
                  }
                  onChange={onToggleAll}
                />
                <span
                  className={[
                    'pd-cycle-extensions__search-check',
                    allRowsChecked ? 'is-checked' : '',
                    someRowsChecked ? 'is-partial' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden
                />
              </label>
            </th>
            <th scope="col">
              <span className="pd-cycle-groups-members__column-heading">
                Employee
                <ColumnMultiSelectFilter
                  label="Employee"
                  options={employeeOptions}
                  selected={employeeFilters}
                  onChange={onEmployeeFiltersChange}
                />
              </span>
            </th>
            <th scope="col">
              <span className="pd-cycle-groups-members__column-heading">
                Role
                <ColumnMultiSelectFilter
                  label="Role"
                  options={roleOptions}
                  selected={roleFilters}
                  onChange={onRoleFiltersChange}
                />
              </span>
            </th>
            <th scope="col">
              <span className="pd-cycle-groups-members__column-heading">
                Team
                <ColumnMultiSelectFilter
                  label="Team"
                  options={teamOptions}
                  selected={teamFilters}
                  onChange={onTeamFiltersChange}
                />
              </span>
            </th>
            <th scope="col">
              <span className="pd-cycle-groups-members__column-heading">
                Department
                <ColumnMultiSelectFilter
                  label="Department"
                  options={departmentOptions}
                  selected={departmentFilters}
                  onChange={onDepartmentFiltersChange}
                />
              </span>
            </th>
            <th scope="col">
              <span className="pd-cycle-groups-members__column-heading">
                Reviewer
                <ColumnMultiSelectFilter
                  label="Reviewer"
                  options={reviewerOptions}
                  selected={reviewerFilters}
                  onChange={onReviewerFiltersChange}
                />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {paddingTop > 0 ? (
            <tr aria-hidden>
              <td colSpan={6} style={{ height: paddingTop, padding: 0 }} />
            </tr>
          ) : null}
          {visibleRows.map((row) => {
            const reviewer =
              row.person.reportsToId != null
                ? employeesById.get(row.person.reportsToId)
                : undefined
            return (
              <PersonTableRow
                key={row.key}
                row={row}
                checked={row.ids.every((id) => checkedIds.has(id))}
                reviewerAvatarUrl={reviewer?.avatarUrl || undefined}
                onToggle={() => onToggle(row)}
              />
            )
          })}
          {paddingBottom > 0 ? (
            <tr aria-hidden>
              <td colSpan={6} style={{ height: paddingBottom, padding: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

export function GroupMembersEditor({
  memberIds,
  claimedIds = [],
  otherGroups = [],
  onChange,
  onDirtyChange,
  searchLabel = 'Search people',
  placeholder = 'Search by name, department, team, or role…',
  pane: paneProp,
  onPaneChange,
}: GroupMembersEditorProps) {
  const { employees } = useEmployees()
  const [query, setQuery] = useState('')
  const [employeeFilters, setEmployeeFilters] = useState<string[]>([])
  const [roleFilters, setRoleFilters] = useState<string[]>([])
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([])
  const [teamFilters, setTeamFilters] = useState<string[]>([])
  const [reviewerFilters, setReviewerFilters] = useState<string[]>([])
  const [localPane, setLocalPane] = useState<Pane>('browse')
  const pane = paneProp ?? localPane
  const setPane = (next: Pane) => {
    onPaneChange?.(next)
    if (paneProp === undefined) setLocalPane(next)
  }
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set())
  const [draftIds, setDraftIds] = useState(() => new Set(memberIds))
  const [baselineIds, setBaselineIds] = useState(() => new Set(memberIds))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingChange, setPendingChange] =
    useState<PendingPeopleChange | null>(null)
  const deferredFilter = useDeferredValue(query.trim().toLowerCase())
  const filtering = Boolean(
    deferredFilter ||
      employeeFilters.length ||
      roleFilters.length ||
      departmentFilters.length ||
      teamFilters.length ||
      reviewerFilters.length,
  )

  const selected = draftIds
  const employeesById = useMemo(() => {
    const map = new Map<number, PlatformEmployee>()
    for (const employee of employees) {
      map.set(employee.employeeId, employee)
    }
    return map
  }, [employees])
  const claimedElsewhere = useMemo(
    () => new Set(claimedIds.filter((id) => !baselineIds.has(id))),
    [baselineIds, claimedIds],
  )

  useEffect(() => {
    const incoming = new Set(memberIds)
    if (saving || setsEqual(incoming, baselineIds)) return
    setBaselineIds(incoming)
    setDraftIds(incoming)
    setCheckedIds(new Set())
    setSaveError(null)
  }, [baselineIds, memberIds, saving])

  useEffect(() => {
    onDirtyChange?.(false)
    return () => onDirtyChange?.(false)
  }, [onDirtyChange])

  const departmentOptions = useMemo(() => {
    const source =
      pane === 'browse'
        ? employees
        : employees.filter((employee) => selected.has(employee.employeeId))
    return uniqueSortedOptions(
      source
        .filter(
          (employee) =>
            employee.isActive && isAssignedOrgLabel(employee.department),
        )
        .map((employee) => employee.department.trim()),
    )
  }, [employees, pane, selected])

  const teamOptions = useMemo(() => {
    const source =
      pane === 'browse'
        ? employees
        : employees.filter((employee) => selected.has(employee.employeeId))
    return uniqueSortedOptions(
      source
        .filter(
          (employee) =>
            employee.isActive && isAssignedOrgLabel(employee.team),
        )
        .map((employee) => employee.team.trim()),
    )
  }, [employees, pane, selected])

  const employeeOptions = useMemo(() => {
    const source =
      pane === 'browse'
        ? employees
        : employees.filter((employee) => selected.has(employee.employeeId))
    return uniqueSortedOptions(
      source
        .filter((employee) => employee.isActive)
        .map((employee) => employee.fullName.trim()),
    )
  }, [employees, pane, selected])

  const roleOptions = useMemo(() => {
    const source =
      pane === 'browse'
        ? employees
        : employees.filter((employee) => selected.has(employee.employeeId))
    return uniqueSortedOptions(
      source
        .filter((employee) => employee.isActive && employee.jobTitle.trim())
        .map((employee) => employee.jobTitle.trim()),
    )
  }, [employees, pane, selected])

  const reviewerOptions = useMemo(() => {
    const source =
      pane === 'browse'
        ? employees
        : employees.filter((employee) => selected.has(employee.employeeId))
    return uniqueSortedOptions(
      source
        .filter(
          (employee) =>
            employee.isActive && employee.reportsToName.trim(),
        )
        .map((employee) => employee.reportsToName.trim()),
    )
  }, [employees, pane, selected])

  const { availablePeople, members } = useMemo(() => {
      const nextPeople: ListRow[] = []
      const nextMembers: ListRow[] = []
      const buildAvailable = pane === 'browse'

      for (const employee of employees) {
        const inGroup = selected.has(employee.employeeId)
        const matches =
          personMatchesQuery(employee, deferredFilter) &&
          (employeeFilters.length === 0 ||
            employeeFilters.includes(employee.fullName.trim())) &&
          (roleFilters.length === 0 ||
            roleFilters.includes(employee.jobTitle.trim())) &&
          (departmentFilters.length === 0 ||
            departmentFilters.includes(employee.department.trim())) &&
          (teamFilters.length === 0 ||
            teamFilters.includes(employee.team.trim())) &&
          (reviewerFilters.length === 0 ||
            reviewerFilters.includes(employee.reportsToName.trim()))
        if (inGroup) {
          if (matches) {
            nextMembers.push({
              key: `member:${employee.employeeId}`,
              label: employee.fullName,
              description: personDescription(
                moveHint(employee.employeeId, claimedElsewhere, otherGroups),
              ),
              actionLabel: `Select ${employee.fullName}`,
              ids: [employee.employeeId],
              person: employee,
              score: filtering
                ? nameRelevanceScore(
                  employee.fullName,
                  [
                    employee.email,
                    employee.jobTitle,
                    employee.department,
                    employee.team,
                    employee.reportsToName,
                  ],
                  deferredFilter,
                )
                : 0,
            })
          }
          continue
        }

        if (!buildAvailable || !employee.isActive || !matches) continue
        const hint = moveHint(
          employee.employeeId,
          claimedElsewhere,
          otherGroups,
        )
        nextPeople.push({
          key: `person:${employee.employeeId}`,
          label: employee.fullName,
          description: personDescription(hint),
          actionLabel: hint
            ? `Include ${employee.fullName}. ${hint}`
            : `Include ${employee.fullName}`,
          ids: [employee.employeeId],
          person: employee,
          score: filtering
            ? nameRelevanceScore(
              employee.fullName,
              [
                employee.email,
                employee.jobTitle,
                employee.department,
                employee.team,
                employee.reportsToName,
              ],
              deferredFilter,
            )
            : 0,
        })
      }

      if (buildAvailable) nextPeople.sort(compareByNameRelevance)
      nextMembers.sort(compareByNameRelevance)

      return {
        availablePeople: nextPeople,
        members: nextMembers,
      }
    }, [
      claimedElsewhere,
      departmentFilters,
      deferredFilter,
      employeeFilters,
      employees,
      filtering,
      otherGroups,
      pane,
      reviewerFilters,
      roleFilters,
      selected,
      teamFilters,
    ])

  const memberVisibleIds = useMemo(
    () => new Set(members.flatMap((row) => row.ids)),
    [members],
  )
  const availableVisibleIds = useMemo(
    () => new Set(availablePeople.flatMap((row) => row.ids)),
    [availablePeople],
  )

  const selectedToRemove = [...checkedIds].filter((id) =>
    memberVisibleIds.has(id),
  )
  const selectedToAdd = [...checkedIds].filter((id) =>
    availableVisibleIds.has(id),
  )

  const emptyAvailable = availablePeople.length === 0

  const emptyCopy =
    pane === 'selected'
      ? filtering
        ? 'No selected people match'
        : 'No one selected yet'
      : filtering
        ? 'No results found'
        : 'No people to add'

  const confirmPendingChange = async () => {
    if (!pendingChange || saving) return
    const change = pendingChange
    const previousIds = new Set(draftIds)
    const next = new Set(draftIds)
    for (const id of change.ids) {
      if (change.type === 'add') next.add(id)
      else next.delete(id)
    }
    const nextIds = [...next]
    setSaving(true)
    setSaveError(null)
    setDraftIds(next)
    setBaselineIds(new Set(nextIds))
    setCheckedIds(new Set())
    setPendingChange(null)
    try {
      await onChange(nextIds)
      onDirtyChange?.(false)
    } catch (error: unknown) {
      setDraftIds(previousIds)
      setBaselineIds(previousIds)
      setPendingChange(change)
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Could not update people. Try again.',
      )
    } finally {
      setSaving(false)
    }
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

  const toggleAllVisible = () => {
    const visibleIds =
      pane === 'selected' ? memberVisibleIds : availableVisibleIds
    setCheckedIds((current) => {
      const allChecked =
        visibleIds.size > 0 &&
        [...visibleIds].every((id) => current.has(id))
      const next = new Set(current)
      for (const id of visibleIds) {
        if (allChecked) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  const requestPeopleChange = (
    type: PendingPeopleChange['type'],
    ids: number[],
  ) => {
    if (ids.length === 0) return
    setSaveError(null)
    setPendingChange({ type, ids })
  }

  const pendingCount = pendingChange?.ids.length ?? 0
  const pendingMovingCount =
    pendingChange?.type === 'add'
      ? pendingChange.ids.filter((id) => claimedElsewhere.has(id)).length
      : 0

  const paneOptions = [
    {
      id: 'selected' as const,
      label: (
        <>
          <UserCheck size={15} strokeWidth={1.75} aria-hidden />
          Added
          <span className="pd-cycle-groups-members__tab-badge">
            {draftIds.size}
          </span>
        </>
      ),
    },
    {
      id: 'browse' as const,
      label: (
        <>
          <UsersRound size={15} strokeWidth={1.75} aria-hidden />
          Not added
        </>
      ),
    },
  ]

  return (
    <div className="pd-cycle-groups-members">
      <header className="pd-cycle-groups-members__bar">
        {saveError ? (
          <p
            className="pd-cycle-groups-members__save-status pd-cycle-groups-members__save-error"
            aria-live="polite"
            role="alert"
          >
            {saveError}
          </p>
        ) : null}
        <SegmentedControl
          className="pd-cycle-groups-members__browse"
          aria-label="People selection view"
          options={paneOptions}
          value={pane}
          onChange={(next) => {
            startTransition(() => {
              setPane(next)
              setCheckedIds(new Set())
            })
          }}
        />
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
            placeholder={placeholder}
            className="pd-cycle-extensions__search-input"
          />
        </label>
      </header>

      <div className="pd-people__panel pd-people__panel--table pd-cycle-groups-members__table-panel">
        <PeopleTable
          rows={pane === 'browse' ? availablePeople : members}
          added={pane === 'selected'}
          checkedIds={checkedIds}
          employeesById={employeesById}
          employeeFilters={employeeFilters}
          roleFilters={roleFilters}
          departmentFilters={departmentFilters}
          teamFilters={teamFilters}
          reviewerFilters={reviewerFilters}
          employeeOptions={employeeOptions}
          roleOptions={roleOptions}
          departmentOptions={departmentOptions}
          teamOptions={teamOptions}
          reviewerOptions={reviewerOptions}
          onEmployeeFiltersChange={setEmployeeFilters}
          onRoleFiltersChange={setRoleFilters}
          onDepartmentFiltersChange={setDepartmentFilters}
          onTeamFiltersChange={setTeamFilters}
          onReviewerFiltersChange={setReviewerFilters}
          onToggleAll={toggleAllVisible}
          onToggle={(row) => {
            toggleIds(row.ids)
          }}
        />
        {(pane === 'browse' ? emptyAvailable : members.length === 0) ? (
          <p className="pd-cycle-groups-members__add-empty">{emptyCopy}</p>
        ) : null}
      </div>

      {(pane === 'browse' ? selectedToAdd : selectedToRemove).length > 0 ? (
        <div className="pd-cycle-groups-members__footer" role="status">
          <p className="pd-cycle-groups-members__footer-status">
            {pane === 'browse'
              ? `${peopleCountLabel(selectedToAdd.length)} selected`
              : `${peopleCountLabel(selectedToRemove.length)} selected`}
          </p>
          <div className="pd-cycle-groups-members__footer-actions">
            {pane === 'browse' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => requestPeopleChange('add', selectedToAdd)}
              >
                {selectedToAdd.length === 1
                  ? 'Add 1 person'
                  : `Add ${selectedToAdd.length} people`}
              </Button>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  requestPeopleChange('remove', selectedToRemove)
                }
              >
                {selectedToRemove.length === 1
                  ? 'Remove 1 person'
                  : `Remove ${selectedToRemove.length} people`}
              </Button>
            )}
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={pendingChange !== null}
        onClose={() => {
          if (!saving) setPendingChange(null)
        }}
        onConfirm={() => void confirmPendingChange()}
        title={
          pendingChange?.type === 'remove'
            ? `Remove ${peopleCountLabel(pendingCount)}?`
            : `Add ${peopleCountLabel(pendingCount)}?`
        }
        description={
          pendingChange?.type === 'remove'
            ? 'The selected people will be removed from this group.'
            : pendingMovingCount > 0
              ? `${peopleCountLabel(pendingMovingCount)} will move from another group.`
              : 'The selected people will be added to this group.'
        }
        confirmLabel={
          saving
            ? 'Updating…'
            : pendingChange?.type === 'remove'
              ? 'Remove people'
              : 'Add people'
        }
        confirmVariant={
          pendingChange?.type === 'remove' ? 'danger' : 'primary'
        }
      />
    </div>
  )
}
