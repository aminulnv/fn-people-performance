import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, Eye, EyeOff, Plus, Trash2, UsersRound } from 'lucide-react'
import {
  createContext,
  memo,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Avatar,
  Button,
  ColumnVisibility,
  ConfirmDialog,
  ListboxSelect,
  ResizableTable,
  type ColumnVisibilityOption,
  type ListboxOption,
  type ResizableColumn,
} from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'
import { useEmployees } from '@/lib/employees/useEmployees'
import { queryKeys } from '@/lib/queryClient'
import {
  cycleGroupByEmployeeId,
  findCycleGroupForPerson,
} from '@/lib/reviews/cycleGroups'
import { peopleCountLabel } from '@/lib/reviews/groupSummary'
import { fetchReviewPacketSummaries } from '@/lib/reviews/packetsApi'
import {
  gradeFromPacket,
  gradeLabel,
  SCORECARD_STATUS_LIST_LABEL,
  scorecardStatusFromPacket,
  type ScorecardStatus,
} from '@/lib/reviews/scorecards'
import { getReviewCycle, updateCycleGroup } from '@/lib/reviews/store'
import type {
  CycleGroup,
  ReviewCycle,
} from '@/lib/reviews/types'
import {
  readVisibleColumnIds,
  writeVisibleColumnIds,
} from '@/lib/ui/columnVisibility'
import {
  ColumnMultiSelectFilter,
  type ColumnFilterOption,
} from './GroupMembersEditor'

const VIRTUALIZE_AFTER = 24
const VIRTUAL_OVERSCAN = 8
const VIRTUAL_ROW_ESTIMATE = 44

type CyclePeopleColumnId =
  | 'employee'
  | 'cycle'
  | 'role'
  | 'seniority'
  | 'team'
  | 'department'
  | 'reviewer'
  | 'grade'
  | 'status'
  | 'cycle-group'

const CYCLE_PEOPLE_COLUMN_OPTIONS: readonly ColumnVisibilityOption[] = [
  { id: 'employee', label: 'Employee', required: true },
  { id: 'cycle', label: 'Cycle' },
  { id: 'role', label: 'Role' },
  { id: 'seniority', label: 'Seniority' },
  { id: 'team', label: 'Team' },
  { id: 'department', label: 'Department' },
  { id: 'reviewer', label: 'Reviewer' },
  { id: 'grade', label: 'Grade' },
  { id: 'status', label: 'Status' },
  { id: 'cycle-group', label: 'Cycle Assignment' },
]

const CYCLE_PEOPLE_COLUMN_IDS = CYCLE_PEOPLE_COLUMN_OPTIONS.map(
  (column) => column.id,
) as CyclePeopleColumnId[]
const CYCLE_PEOPLE_DEFAULT_VISIBLE_IDS = CYCLE_PEOPLE_COLUMN_IDS.filter(
  (id) => id !== 'cycle' && id !== 'seniority',
)
const CYCLE_PEOPLE_COLUMNS_STORAGE_KEY =
  'cycle-people-eligibility-visible-columns-v4'
const CREATE_GROUP_OPTION = '__create_group__'
const EMPTY_FILTER_SELECTION: string[] = []

type CycleGroupsSectionProps = {
  cycle: ReviewCycle
  onAddGroup: () => void
  onDelete: (groupId: string) => void
  onOpenGroup: (groupId: string) => void
}

type CyclePeopleSelectionApi = {
  allFilteredSelected: boolean
  someFilteredSelected: boolean
  filteredCount: number
  bulkSaving: boolean
  toggleSelectAllFiltered: () => void
}

const CyclePeopleSelectionContext =
  createContext<CyclePeopleSelectionApi | null>(null)

function scorecardStatusClass(status: ScorecardStatus): string {
  if (status === 'completed') return 'pd-reviews-score-status--completed'
  if (status === 'in_progress') return 'pd-reviews-score-status--progress'
  return 'pd-reviews-score-status--pending'
}

function CyclePeopleSelectAllHeader() {
  const selection = useContext(CyclePeopleSelectionContext)
  if (!selection) return null
  const {
    allFilteredSelected,
    someFilteredSelected,
    filteredCount,
    bulkSaving,
    toggleSelectAllFiltered,
  } = selection

  return (
    <label className="pd-cycle-setup__people-select">
      <input
        type="checkbox"
        className="pd-sr-only"
        checked={allFilteredSelected}
        disabled={filteredCount === 0 || bulkSaving}
        aria-label={
          allFilteredSelected
            ? 'Clear selection for visible people'
            : 'Select all visible people'
        }
        onChange={toggleSelectAllFiltered}
      />
      <span
        className={[
          'pd-cycle-extensions__search-check',
          allFilteredSelected ? 'is-checked' : '',
          someFilteredSelected ? 'is-partial' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      />
    </label>
  )
}

export function CycleGroupsSection({
  cycle,
  onAddGroup,
  onDelete,
  onOpenGroup,
}: CycleGroupsSectionProps) {
  const groups = cycle.groups ?? []
  const { employees } = useEmployees()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const pendingDelete = groups.find((group) => group.id === deleteId)

  return (
    <section
      className="pd-reviews-settings__section"
      aria-labelledby="cycle-groups-heading"
    >
      <header className="pd-reviews-settings__section-head">
        <div>
          <div className="pd-reviews-settings__section-title-row">
            <h3
              className="pd-reviews-settings__section-title"
              id="cycle-groups-heading"
            >
              People In This Cycle
            </h3>
            {groups.length > 0 ? (
              <span className="pd-reviews-settings__section-count">
                {groups.length === 1 ? '1 group' : `${groups.length} groups`}
              </span>
            ) : null}
          </div>
          <p className="pd-reviews-settings__section-lede">
            A group is a set of people who follow the same rules. One group is
            enough unless some people need different dates or forms.
          </p>
        </div>
        {groups.length > 0 ? (
          <Button variant="primary" size="sm" pill onClick={onAddGroup}>
            <Plus size={14} strokeWidth={2} aria-hidden />
            Add Group
          </Button>
        ) : null}
      </header>

      <ul className="pd-cycle-setup__groups">
        {groups.map((group) => (
          <li key={group.id}>
            <GroupCard
              group={group}
              onOpen={() => onOpenGroup(group.id)}
              onDelete={() => setDeleteId(group.id)}
            />
          </li>
        ))}
        <li>
          <button
            type="button"
            className="pd-cycle-setup__group-create"
            onClick={onAddGroup}
          >
            <span className="pd-cycle-setup__group-create-icon" aria-hidden>
              <Plus size={18} strokeWidth={2.25} />
            </span>
            <span className="pd-cycle-setup__group-create-label">
              Create New Group
            </span>
          </button>
        </li>
      </ul>

      <CyclePeopleTable
        cycle={cycle}
        employees={employees}
        onCreateGroup={onAddGroup}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id)
          setDeleteId(null)
        }}
        title="Delete group?"
        description={
          pendingDelete
            ? `Delete “${pendingDelete.name}”? Those people will not be in this cycle until you add them to another group.`
            : ''
        }
        confirmLabel="Delete Group"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
    </section>
  )
}

function CyclePeopleTable({
  cycle,
  employees,
  onCreateGroup,
}: {
  cycle: ReviewCycle
  employees: PlatformEmployee[]
  onCreateGroup: () => void
}) {
  const [gradesRevealed, setGradesRevealed] = useState(false)
  const [gradeOverrides, setGradeOverrides] = useState<Record<number, boolean>>(
    {},
  )
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() =>
    readVisibleColumnIds(
      CYCLE_PEOPLE_COLUMNS_STORAGE_KEY,
      CYCLE_PEOPLE_COLUMN_IDS,
      ['employee'],
      CYCLE_PEOPLE_DEFAULT_VISIBLE_IDS,
    ),
  )
  const [columnFilters, setColumnFilters] = useState<
    Partial<Record<CyclePeopleColumnId, string[]>>
  >({})
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [savingEmployeeId, setSavingEmployeeId] = useState<number | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [groupChangeError, setGroupChangeError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const visibleColumnSet = useMemo(
    () => new Set(visibleColumnIds),
    [visibleColumnIds],
  )
  const { data: packets = [] } = useQuery({
    queryKey: queryKeys.reviewPacketSummaries(cycle.id),
    queryFn: () => fetchReviewPacketSummaries(cycle.id),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  })
  const packetByEmployee = useMemo(
    () => new Map(packets.map((packet) => [packet.employeeId, packet])),
    [packets],
  )
  const groupByEmployeeId = useMemo(
    () => cycleGroupByEmployeeId(cycle),
    [cycle],
  )
  const employeesById = useMemo(
    () =>
      new Map(employees.map((employee) => [employee.employeeId, employee])),
    [employees],
  )
  const employeesByName = useMemo(
    () =>
      new Map(
        employees.map((employee) => [
          employee.fullName.trim().toLocaleLowerCase(),
          employee,
        ]),
      ),
    [employees],
  )
  const gradedEmployeeIds = useMemo(
    () =>
      packets
        .filter((packet) => gradeFromPacket(packet).grade != null)
        .map((packet) => packet.employeeId),
    [packets],
  )
  const allGradesVisible =
    gradedEmployeeIds.length > 0 &&
    gradedEmployeeIds.every(
      (employeeId) => gradeOverrides[employeeId] ?? gradesRevealed,
    )

  useEffect(() => {
    setGradesRevealed(false)
    setGradeOverrides({})
    setSelectedIds(new Set())
    setGroupChangeError(null)
  }, [cycle.id])

  const changeCycleGroup = useCallback(
    async (employeeId: number, nextGroupId: string): Promise<void> => {
      const latestCycle = getReviewCycle(cycle.id) ?? cycle
      const currentGroup = findCycleGroupForPerson(latestCycle, employeeId)
      if ((currentGroup?.id ?? '') === nextGroupId) return

      const targetGroup = nextGroupId
        ? (latestCycle.groups ?? []).find((group) => group.id === nextGroupId)
        : currentGroup
      if (!targetGroup) return

      const memberIds = nextGroupId
        ? [...targetGroup.memberIds, employeeId]
        : targetGroup.memberIds.filter((id) => id !== employeeId)

      setSavingEmployeeId(employeeId)
      setGroupChangeError(null)
      try {
        await updateCycleGroup(cycle.id, targetGroup.id, { memberIds })
      } catch (error) {
        setGroupChangeError(
          error instanceof Error
            ? error.message
            : 'Failed to update cycle group.',
        )
      } finally {
        setSavingEmployeeId((current) =>
          current === employeeId ? null : current,
        )
      }
    },
    [cycle],
  )

  async function bulkAssignCycleGroup(nextGroupId: string): Promise<void> {
    const ids = [...selectedIds]
    if (ids.length === 0 || bulkSaving) return

    const latestCycle = getReviewCycle(cycle.id) ?? cycle
    const groups = latestCycle.groups ?? []
    setBulkSaving(true)
    setGroupChangeError(null)
    try {
      if (!nextGroupId) {
        const removals = groups
          .map((group) => ({
            groupId: group.id,
            memberIds: group.memberIds.filter((id) => !selectedIds.has(id)),
            beforeCount: group.memberIds.length,
          }))
          .filter((entry) => entry.memberIds.length !== entry.beforeCount)
        await Promise.all(
          removals.map((entry) =>
            updateCycleGroup(cycle.id, entry.groupId, {
              memberIds: entry.memberIds,
            }),
          ),
        )
      } else {
        const targetGroup = groups.find((group) => group.id === nextGroupId)
        if (!targetGroup) return
        const alreadyAssigned = ids.every((id) =>
          targetGroup.memberIds.includes(id),
        )
        if (!alreadyAssigned) {
          await updateCycleGroup(cycle.id, targetGroup.id, {
            memberIds: [...new Set([...targetGroup.memberIds, ...ids])],
          })
        }
      }
      setSelectedIds(new Set())
    } catch (error) {
      setGroupChangeError(
        error instanceof Error
          ? error.message
          : 'Failed to update cycle group assignments.',
      )
    } finally {
      setBulkSaving(false)
    }
  }

  const valueForColumn = useCallback(
    (employee: PlatformEmployee, columnId: CyclePeopleColumnId): string => {
      const group = groupByEmployeeId.get(employee.employeeId)
      const packet = packetByEmployee.get(employee.employeeId)
      const grade = packet ? gradeFromPacket(packet).grade : null
      const status = packet
        ? scorecardStatusFromPacket(packet.status)
        : group
          ? 'not_started'
          : null

      switch (columnId) {
        case 'employee':
          return employee.fullName
        case 'cycle':
          return cycle.name
        case 'role':
          return employee.jobTitle || '-'
        case 'seniority':
          return employee.jobGrade || '-'
        case 'team':
          return employee.team || '-'
        case 'department':
          return employee.department || '-'
        case 'reviewer':
          return employee.reportsToName || '-'
        case 'grade':
          return grade ? gradeLabel(grade) : '-'
        case 'status':
          return status ? SCORECARD_STATUS_LIST_LABEL[status] : '-'
        case 'cycle-group':
          return group?.name ?? 'Not included'
      }
    },
    [cycle.name, groupByEmployeeId, packetByEmployee],
  )

  const columnFilterOptions = useMemo(
    () =>
      Object.fromEntries(
        CYCLE_PEOPLE_COLUMN_IDS.map((columnId) => {
          const values = [
            ...new Set(
              employees.map((employee) =>
                valueForColumn(employee, columnId),
              ),
            ),
          ].sort((left, right) => left.localeCompare(right))
          return [
            columnId,
            values.map(
              (value): ColumnFilterOption => ({ value, label: value }),
            ),
          ]
        }),
      ) as Record<CyclePeopleColumnId, ColumnFilterOption[]>,
    [employees, valueForColumn],
  )

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        (
          Object.entries(columnFilters) as [
            CyclePeopleColumnId,
            string[],
          ][]
        ).every(
          ([columnId, selected]) =>
            selected.length === 0 ||
            selected.includes(valueForColumn(employee, columnId)),
        ),
      ),
    [columnFilters, employees, valueForColumn],
  )

  const filteredSelectedCount = useMemo(
    () =>
      filteredEmployees.reduce(
        (count, employee) =>
          selectedIds.has(employee.employeeId) ? count + 1 : count,
        0,
      ),
    [filteredEmployees, selectedIds],
  )
  const allFilteredSelected =
    filteredEmployees.length > 0 &&
    filteredSelectedCount === filteredEmployees.length
  const someFilteredSelected =
    filteredSelectedCount > 0 && !allFilteredSelected

  const filteredEmployeeIds = useMemo(
    () => filteredEmployees.map((employee) => employee.employeeId),
    [filteredEmployees],
  )

  const toggleSelectAllFiltered = useCallback(() => {
    startTransition(() => {
      setSelectedIds((current) => {
        const allSelected =
          filteredEmployeeIds.length > 0 &&
          filteredEmployeeIds.every((id) => current.has(id))
        const next = new Set(current)
        for (const id of filteredEmployeeIds) {
          if (allSelected) next.delete(id)
          else next.add(id)
        }
        return next
      })
    })
  }, [filteredEmployeeIds])

  const selectionApi = useMemo<CyclePeopleSelectionApi>(
    () => ({
      allFilteredSelected,
      someFilteredSelected,
      filteredCount: filteredEmployees.length,
      bulkSaving,
      toggleSelectAllFiltered,
    }),
    [
      allFilteredSelected,
      bulkSaving,
      filteredEmployees.length,
      someFilteredSelected,
      toggleSelectAllFiltered,
    ],
  )

  const setColumnFilter = useCallback(
    (columnId: CyclePeopleColumnId, values: string[]) => {
      setColumnFilters((current) => ({ ...current, [columnId]: values }))
    },
    [],
  )

  const columnLabel = useCallback(
    (
      columnId: CyclePeopleColumnId,
      label: ReactNode,
      filterLabel: string,
    ): ReactNode => (
      <span className="pd-cycle-groups-members__column-heading">
        {label}
        <ColumnMultiSelectFilter
          label={filterLabel}
          options={columnFilterOptions[columnId]}
          selected={columnFilters[columnId] ?? EMPTY_FILTER_SELECTION}
          onChange={(values) => setColumnFilter(columnId, values)}
        />
      </span>
    ),
    [columnFilterOptions, columnFilters, setColumnFilter],
  )

  const columns = useMemo<ResizableColumn[]>(
    () =>
      [
        {
          id: 'select',
          name: 'Select',
          minWidth: 48,
          label: <CyclePeopleSelectAllHeader />,
        },
        {
          id: 'employee',
          name: 'Employee',
          label: columnLabel('employee', 'Employee', 'Employee'),
        },
        {
          id: 'cycle',
          name: 'Cycle',
          label: columnLabel('cycle', 'Cycle', 'Cycle'),
        },
        {
          id: 'role',
          name: 'Role',
          label: columnLabel('role', 'Role', 'Role'),
        },
        {
          id: 'seniority',
          name: 'Seniority',
          label: columnLabel('seniority', 'Seniority', 'Seniority'),
        },
        {
          id: 'team',
          name: 'Team',
          label: columnLabel('team', 'Team', 'Team'),
        },
        {
          id: 'department',
          name: 'Department',
          label: columnLabel('department', 'Department', 'Department'),
        },
        {
          id: 'reviewer',
          name: 'Reviewer',
          label: columnLabel('reviewer', 'Reviewer', 'Reviewer'),
        },
        {
          id: 'grade',
          name: 'Grade',
          label: columnLabel(
            'grade',
            <span className="pd-people__th pd-reviews-scorecards__grade-th">
              Grade
              <button
                type="button"
                className="pd-reviews-scorecards__grade-toggle"
                aria-label={
                  allGradesVisible ? 'Hide All Grades' : 'Show All Grades'
                }
                title={
                  allGradesVisible ? 'Hide All Grades' : 'Show All Grades'
                }
                aria-pressed={allGradesVisible}
                onClick={() => {
                  setGradesRevealed(!allGradesVisible)
                  setGradeOverrides({})
                }}
              >
                {allGradesVisible ? (
                  <Eye size={14} strokeWidth={1.75} aria-hidden />
                ) : (
                  <EyeOff size={14} strokeWidth={1.75} aria-hidden />
                )}
              </button>
            </span>,
            'Grade',
          ),
        },
        {
          id: 'status',
          name: 'Status',
          label: columnLabel('status', 'Status', 'Status'),
        },
        {
          id: 'cycle-group',
          name: 'Cycle Assignment',
          label: columnLabel(
            'cycle-group',
            'Cycle Assignment',
            'Cycle Assignment',
          ),
        },
      ].filter(
        (column) =>
          column.id === 'select' || visibleColumnSet.has(column.id),
      ),
    [allGradesVisible, columnLabel, visibleColumnSet],
  )

  const groupAssignOptions = useMemo<ListboxOption[]>(
    () => [
      ...(cycle.groups ?? []).map((option) => ({
        value: option.id,
        label: option.name,
      })),
      {
        value: CREATE_GROUP_OPTION,
        label: 'Create New Group',
        leading: <Plus size={14} strokeWidth={2} aria-hidden />,
        className: 'pd-listbox__option--action',
      },
    ],
    [cycle.groups],
  )

  const groupAssignLabelById = useMemo(() => {
    const labels = new Map<string, string>()
    for (const option of groupAssignOptions) {
      labels.set(option.value, option.label)
    }
    return labels
  }, [groupAssignOptions])

  const visibleColumns = useMemo(
    () => ({
      employee: visibleColumnSet.has('employee'),
      cycle: visibleColumnSet.has('cycle'),
      role: visibleColumnSet.has('role'),
      seniority: visibleColumnSet.has('seniority'),
      team: visibleColumnSet.has('team'),
      department: visibleColumnSet.has('department'),
      reviewer: visibleColumnSet.has('reviewer'),
      grade: visibleColumnSet.has('grade'),
      status: visibleColumnSet.has('status'),
      cycleGroup: visibleColumnSet.has('cycle-group'),
    }),
    [visibleColumnSet],
  )

  const onToggleSelected = useCallback((employeeId: number) => {
    startTransition(() => {
      setSelectedIds((current) => {
        const next = new Set(current)
        if (next.has(employeeId)) next.delete(employeeId)
        else next.add(employeeId)
        return next
      })
    })
  }, [])

  const onToggleGrade = useCallback((employeeId: number, revealed: boolean) => {
    setGradeOverrides((current) => ({
      ...current,
      [employeeId]: revealed,
    }))
  }, [])

  const onAssignOne = useCallback(
    (employeeId: number, value: string) => {
      if (value === CREATE_GROUP_OPTION) {
        onCreateGroup()
        return
      }
      void changeCycleGroup(employeeId, value)
    },
    [changeCycleGroup, onCreateGroup],
  )

  const tableRows = useMemo(
    () =>
      filteredEmployees.map((employee) => {
        const group = groupByEmployeeId.get(employee.employeeId)
        const packet = packetByEmployee.get(employee.employeeId)
        const grade = packet ? gradeFromPacket(packet) : null
        const reviewer =
          (employee.reportsToId != null
            ? employeesById.get(employee.reportsToId)
            : undefined) ??
          employeesByName.get(
            employee.reportsToName.trim().toLocaleLowerCase(),
          )
        const status = packet
          ? scorecardStatusFromPacket(packet.status)
          : group
            ? 'not_started'
            : null
        return {
          employee,
          groupId: group?.id ?? '',
          grade: grade?.grade ?? null,
          status,
          reviewerAvatarUrl: reviewer?.avatarUrl || undefined,
        }
      }),
    [
      employeesById,
      employeesByName,
      filteredEmployees,
      groupByEmployeeId,
      packetByEmployee,
    ],
  )

  const shouldVirtualize = tableRows.length >= VIRTUALIZE_AFTER
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? tableRows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => VIRTUAL_ROW_ESTIMATE,
    overscan: VIRTUAL_OVERSCAN,
  })

  useLayoutEffect(() => {
    if (!shouldVirtualize) return
    virtualizer.measure()
  }, [shouldVirtualize, tableRows.length, virtualizer, columns.length])

  const virtualRows = shouldVirtualize ? virtualizer.getVirtualItems() : null
  const paddingTop = virtualRows?.[0]?.start ?? 0
  const lastVirtualRow = virtualRows?.[virtualRows.length - 1]
  const paddingBottom = virtualRows
    ? virtualizer.getTotalSize() - (lastVirtualRow?.end ?? 0)
    : 0
  const visibleRows =
    virtualRows && virtualRows.length > 0
      ? virtualRows
          .map((row) => tableRows[row.index])
          .filter((row): row is (typeof tableRows)[number] => Boolean(row))
      : tableRows.slice(
          0,
          shouldVirtualize ? VIRTUALIZE_AFTER : tableRows.length,
        )

  return (
    <CyclePeopleSelectionContext.Provider value={selectionApi}>
      <section
        className="pd-cycle-setup__people-table"
        aria-label="Cycle people eligibility"
      >
        <header className="pd-cycle-setup__people-table-toolbar">
          {groupChangeError ? (
            <p className="pd-cycle-setup__people-table-error" role="alert">
              {groupChangeError}
            </p>
          ) : null}
          <div
            className="pd-cycle-setup__people-bulk"
            hidden={selectedIds.size === 0}
            aria-hidden={selectedIds.size === 0}
          >
            <p className="pd-cycle-setup__people-bulk-count">
              {peopleCountLabel(selectedIds.size)} selected
            </p>
            <ListboxSelect
              className="pd-cycle-setup__group-select pd-cycle-setup__people-bulk-assign"
              value=""
              options={groupAssignOptions}
              placeholder={bulkSaving ? 'Assigning…' : 'Assign to group'}
              emptyLabel="Not included"
              portal
              disabled={bulkSaving || selectedIds.size === 0}
              aria-label="Assign selected people to a cycle group"
              onValueChange={(value) => {
                if (value === CREATE_GROUP_OPTION) {
                  onCreateGroup()
                  return
                }
                void bulkAssignCycleGroup(value)
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={bulkSaving || selectedIds.size === 0}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
          <ColumnVisibility
            columns={CYCLE_PEOPLE_COLUMN_OPTIONS}
            visibleIds={visibleColumnIds}
            defaultVisibleIds={CYCLE_PEOPLE_DEFAULT_VISIBLE_IDS}
            onChange={(next) => {
              const selected = new Set(next)
              selected.add('employee')
              const ordered = CYCLE_PEOPLE_COLUMN_IDS.filter((id) =>
                selected.has(id),
              )
              setVisibleColumnIds(ordered)
              writeVisibleColumnIds(CYCLE_PEOPLE_COLUMNS_STORAGE_KEY, ordered)
            }}
          />
        </header>
        <div className="pd-people__panel pd-people__panel--table pd-cycle-setup__people-table-panel">
          <div ref={scrollRef} className="pd-people__table-wrap">
            <ResizableTable
              className="pd-people__table pd-cycle-setup__eligibility-table"
              storageKey="cycle-people-eligibility-column-widths-v6"
              columns={columns}
              fitKey={`${cycle.id}:${visibleColumnIds.join('|')}`}
            >
              <tbody>
                <CyclePeopleSpacerRow
                  height={paddingTop}
                  columnCount={columns.length}
                />
                {visibleRows.map((row) => (
                  <CyclePeopleTableRow
                    key={row.employee.employeeId}
                    employee={row.employee}
                    cycleName={cycle.name}
                    groupId={row.groupId}
                    groupLabel={
                      groupAssignLabelById.get(row.groupId) ?? 'Not included'
                    }
                    grade={row.grade}
                    gradeRevealed={
                      gradeOverrides[row.employee.employeeId] ?? gradesRevealed
                    }
                    status={row.status}
                    reviewerAvatarUrl={row.reviewerAvatarUrl}
                    selected={selectedIds.has(row.employee.employeeId)}
                    bulkSaving={bulkSaving}
                    saving={savingEmployeeId === row.employee.employeeId}
                    visibleColumns={visibleColumns}
                    groupAssignOptions={groupAssignOptions}
                    onToggleSelected={onToggleSelected}
                    onToggleGrade={onToggleGrade}
                    onAssign={onAssignOne}
                  />
                ))}
                <CyclePeopleSpacerRow
                  height={paddingBottom}
                  columnCount={columns.length}
                />
              </tbody>
            </ResizableTable>
          </div>
        </div>
      </section>
    </CyclePeopleSelectionContext.Provider>
  )
}

type CyclePeopleVisibleColumns = {
  employee: boolean
  cycle: boolean
  role: boolean
  seniority: boolean
  team: boolean
  department: boolean
  reviewer: boolean
  grade: boolean
  status: boolean
  cycleGroup: boolean
}

function CyclePeopleSpacerRow({
  height,
  columnCount,
}: {
  height: number
  columnCount: number
}) {
  if (height <= 0) return null
  return (
    <tr className="pd-people__virtual-pad" aria-hidden>
      <td colSpan={columnCount} style={{ height }} />
    </tr>
  )
}

const LazyCycleAssignSelect = memo(function LazyCycleAssignSelect({
  groupId,
  groupLabel,
  options,
  disabled,
  ariaLabel,
  onAssign,
}: {
  groupId: string
  groupLabel: string
  options: ListboxOption[]
  disabled: boolean
  ariaLabel: string
  onAssign: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <div className="pd-listbox pd-cycle-setup__group-select">
        <button
          type="button"
          className={[
            'pd-listbox__trigger',
            groupId ? '' : 'pd-listbox__trigger--placeholder',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => setEditing(true)}
        >
          <span className="pd-listbox__value">
            <span className="pd-listbox__value-text">
              {groupId ? groupLabel : 'Not included'}
            </span>
          </span>
          <ChevronDown
            className="pd-listbox__chevron"
            size={14}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </div>
    )
  }

  return (
    <ListboxSelect
      className="pd-cycle-setup__group-select"
      value={groupId}
      options={options}
      placeholder="Not included"
      emptyLabel="Not included"
      portal
      defaultOpen
      aria-label={ariaLabel}
      disabled={disabled}
      onValueChange={(value) => {
        setEditing(false)
        onAssign(value)
      }}
    />
  )
})

const CyclePeopleTableRow = memo(function CyclePeopleTableRow({
  employee,
  cycleName,
  groupId,
  groupLabel,
  grade,
  gradeRevealed,
  status,
  reviewerAvatarUrl,
  selected,
  bulkSaving,
  saving,
  visibleColumns,
  groupAssignOptions,
  onToggleSelected,
  onToggleGrade,
  onAssign,
}: {
  employee: PlatformEmployee
  cycleName: string
  groupId: string
  groupLabel: string
  grade: ReturnType<typeof gradeFromPacket>['grade']
  gradeRevealed: boolean
  status: ScorecardStatus | null
  reviewerAvatarUrl?: string
  selected: boolean
  bulkSaving: boolean
  saving: boolean
  visibleColumns: CyclePeopleVisibleColumns
  groupAssignOptions: ListboxOption[]
  onToggleSelected: (employeeId: number) => void
  onToggleGrade: (employeeId: number, revealed: boolean) => void
  onAssign: (employeeId: number, value: string) => void
}) {
  const employeeAvatar = useMemo(
    () => avatarStyle(employee.fullName),
    [employee.fullName],
  )
  const reviewerAvatar = useMemo(
    () =>
      employee.reportsToName
        ? avatarStyle(employee.reportsToName)
        : undefined,
    [employee.reportsToName],
  )

  return (
    <tr className={selected ? 'is-selected' : undefined}>
      <td className="pd-cycle-setup__people-select-cell">
        <label className="pd-cycle-setup__people-select">
          <input
            type="checkbox"
            className="pd-sr-only"
            checked={selected}
            disabled={bulkSaving}
            aria-label={`Select ${employee.fullName}`}
            onChange={() => onToggleSelected(employee.employeeId)}
          />
          <span
            className={[
              'pd-cycle-extensions__search-check',
              selected ? 'is-checked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden
          />
        </label>
      </td>
      {visibleColumns.employee ? (
        <td className="pd-people__name-cell">
          <span className="pd-people__person">
            <Avatar
              name={employee.fullName}
              src={employee.avatarUrl || undefined}
              size="md"
              className="pd-people__avatar"
              style={employeeAvatar}
            />
            <span className="pd-people__person-name">{employee.fullName}</span>
          </span>
        </td>
      ) : null}
      {visibleColumns.cycle ? (
        <td className="pd-reviews-scorecards__muted">{cycleName}</td>
      ) : null}
      {visibleColumns.role ? <td>{employee.jobTitle || '-'}</td> : null}
      {visibleColumns.seniority ? <td>{employee.jobGrade || '-'}</td> : null}
      {visibleColumns.team ? <td>{employee.team || '-'}</td> : null}
      {visibleColumns.department ? (
        <td>{employee.department || '-'}</td>
      ) : null}
      {visibleColumns.reviewer ? (
        <td>
          {employee.reportsToName ? (
            <span className="pd-people__person">
              <Avatar
                name={employee.reportsToName}
                src={reviewerAvatarUrl}
                size="sm"
                className="pd-people__avatar"
                style={reviewerAvatar}
              />
              <span className="pd-people__person-name">
                {employee.reportsToName}
              </span>
            </span>
          ) : (
            '-'
          )}
        </td>
      ) : null}
      {visibleColumns.grade ? (
        <td>
          {!grade ? (
            '-'
          ) : !gradeRevealed ? (
            <button
              type="button"
              className="pd-reviews-scorecards__grade-toggle"
              aria-label={`Show ${employee.fullName}'s grade`}
              title="Show Grade"
              onClick={() => onToggleGrade(employee.employeeId, true)}
            >
              <EyeOff size={14} strokeWidth={1.75} aria-hidden />
            </button>
          ) : (
            <span className="pd-reviews-scorecards__grade">
              <span className="pd-reviews-scorecards__grade-value">
                {gradeLabel(grade)}
              </span>
              <button
                type="button"
                className="pd-reviews-scorecards__grade-toggle"
                aria-label={`Hide ${employee.fullName}'s grade`}
                title="Hide Grade"
                onClick={() => onToggleGrade(employee.employeeId, false)}
              >
                <Eye size={14} strokeWidth={1.75} aria-hidden />
              </button>
            </span>
          )}
        </td>
      ) : null}
      {visibleColumns.status ? (
        <td className="pd-cycle-setup__people-table-nowrap">
          {status ? (
            <span
              className={[
                'pd-reviews-score-status',
                scorecardStatusClass(status),
              ].join(' ')}
            >
              {SCORECARD_STATUS_LIST_LABEL[status]}
            </span>
          ) : (
            '-'
          )}
        </td>
      ) : null}
      {visibleColumns.cycleGroup ? (
        <td className="pd-cycle-setup__people-table-nowrap">
          <LazyCycleAssignSelect
            groupId={groupId}
            groupLabel={groupLabel}
            options={groupAssignOptions}
            disabled={bulkSaving || saving}
            ariaLabel={`Cycle group for ${employee.fullName}`}
            onAssign={(value) => onAssign(employee.employeeId, value)}
          />
        </td>
      ) : null}
    </tr>
  )
})

function GroupCard({
  group,
  onOpen,
  onDelete,
}: {
  group: CycleGroup
  onOpen: () => void
  onDelete: () => void
}) {
  const people = peopleCountLabel(group.memberIds.length)
  const countId = `${group.id}-people-count`

  return (
    <article className="pd-cycle-setup__group">
      <button
        type="button"
        className="pd-cycle-setup__group-main"
        aria-label={group.name}
        aria-describedby={countId}
        onClick={onOpen}
      >
        <span className="pd-cycle-setup__group-icon" aria-hidden>
          <UsersRound size={28} strokeWidth={1.75} />
        </span>
        <span className="pd-cycle-setup__group-name">{group.name}</span>
        <span className="pd-cycle-setup__group-count" id={countId}>
          {people}
        </span>
      </button>
      <button
        type="button"
        className="pd-cycle-setup__group-delete"
        aria-label={`Delete ${group.name}`}
        onClick={onDelete}
      >
        <Trash2 size={14} strokeWidth={2} aria-hidden />
      </button>
    </article>
  )
}
