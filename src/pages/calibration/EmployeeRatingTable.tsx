import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeftRight,
  Check,
  Download,
  Flag,
  PenLine,
  Scale,
  StickyNote,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Avatar,
  Button,
  Checkbox,
  ColumnVisibility,
  ConfirmDialog,
  CountBadge,
  EmptyState,
  ListboxSelect,
  Modal,
  ResizableTable,
  Textarea,
  type ColumnVisibilityOption,
  type ResizableColumn,
} from '@/components/ui'
import {
  LOCKED_OVERRIDE_ACK_LABEL,
  LOCKED_OVERRIDE_HINT,
} from '@/lib/calibration/lockedOverrideCopy'
import { cx } from '@/lib/cx'
import { avatarStyle } from '@/lib/employees/avatar'
import { pipStatusLabel } from '@/lib/employees/career'
import type { PlatformEmployee } from '@/lib/employees/types'
import { calibrateReviewPacket } from '@/lib/reviews/packetsApi'
import { annualSourceLinks } from '@/lib/reviews/annualQuarters'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import type {
  GradeBandId,
  ReviewCycle,
  ReviewPacket,
} from '@/lib/reviews/types'
import type { CalibrationIndicator } from '@/lib/calibration/indicators'
import { useAuth } from '@/lib/useAuth'
import { hasSystemPermission } from '@/lib/accessControl/types'
import {
  canOverrideCalibrationGrade,
} from '@/lib/calibration/overrideAccess'
import {
  CALIBRATION_SITTING_STATUS_LABEL,
  confirmCalibrationClean,
  EMPTY_CALIBRATOR_ASSIGNMENTS,
  saveCalibrationSittingEmployee,
  type CalibrationSitting,
  type CalibratorAssignments,
} from '@/lib/calibration/sessionApi'
import {
  setCalibrationSittingCache,
  setCalibratorAssignmentsCache,
  useCalibrationSitting,
  useCalibratorAssignments,
} from '@/lib/calibration/useCalibrationSession'
import { prefetchReviewPacket } from '@/lib/reviews/useReviewPackets'
import { queryClient, queryKeys } from '@/lib/queryClient'
import { DepartmentCalibratorsDialog } from '@/pages/calibration/DepartmentCalibratorsDialog'
import {
  RATING_TABLE_COLUMN_OPTIONS,
  RATING_TABLE_FILTERABLE_COLUMN_IDS,
  RATING_TABLE_QUICK_FILTERS,
  buildEmployeeRatingRows,
  defaultVisibleColumnIds,
  filterRatingTableRows,
  formatGapLabel,
  formatRatingTrend,
  ratingTableColumnFilterValue,
  ratingTableCsv,
  ratingTableProgress,
  type RatingTableColumnId,
  type RatingTableFilterableColumnId,
  type RatingTableQuickFilterId,
  type RatingTableRow,
} from '@/lib/calibration/ratingTable'
import {
  ColumnMultiSelectFilter,
  type ColumnFilterOption,
} from '@/pages/reviews/GroupMembersEditor'
import {
  CalibrationEmployeeDrawer,
  type CalibrationDrawerFocusTarget,
} from '@/pages/calibration/CalibrationEmployeeDrawer'
import { PipDisplayOnlyMark } from '@/pages/profile/PipDisplayOnlyMark'
import { GRADE_LISTBOX_OPTIONS } from '@/pages/reviews/ScorecardGoalsCard'
import '@/styles/layout-reviews.css'

function overrideGradeSelectClass(grade: GradeBandId | null | '') {
  return [
    'pd-reviews-scorecard__goals-grade',
    grade ? `pd-reviews-scorecard__grade-select--${grade}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

const EMPTY_FILTER_SELECTION: string[] = []

function isFilterableColumnId(
  columnId: RatingTableColumnId,
): columnId is RatingTableFilterableColumnId {
  return columnId !== 'action'
}

type EmployeeRatingTableProps = {
  cycle: ReviewCycle
  cycles: readonly ReviewCycle[]
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  previousPackets: readonly ReviewPacket[]
  historyPackets: readonly (readonly ReviewPacket[])[]
  linkedPacketsByCycleId: ReadonlyMap<string, readonly ReviewPacket[]>
  indicators: readonly CalibrationIndicator[]
  departments: readonly string[]
  teams: readonly string[]
  markets: readonly string[]
  jobLevels: readonly string[]
  managers: readonly string[]
  sittingEpoch?: number
  onPacketUpdated: (packet: ReviewPacket) => void
}

function GradePill({ grade }: { grade: GradeBandId | null }) {
  if (!grade) return <span className="pd-cal-rt__muted">—</span>
  return (
    <span className={cx('pd-cal-rt__grade', `is-${grade}`)}>
      {GRADE_BAND_META[grade].label}
    </span>
  )
}

function GapCell({ gapTiers }: { gapTiers: number | null }) {
  if (gapTiers == null) return <span className="pd-cal-rt__muted">—</span>
  if (gapTiers === 0) {
    return (
      <span className="pd-cal-rt__gap is-aligned" title="Aligned">
        <Check size={14} strokeWidth={2.25} aria-hidden />
        <span className="pd-sr-only">Aligned</span>
      </span>
    )
  }
  const selfHigher = gapTiers < 0
  return (
    <span
      className={cx('pd-cal-rt__gap', selfHigher ? 'is-self' : 'is-mgr')}
      title={formatGapLabel(gapTiers)}
    >
      {formatGapLabel(gapTiers)}
    </span>
  )
}

function TrendCell({ trend }: { trend: RatingTableRow['trend'] }) {
  if (trend == null) return <span className="pd-cal-rt__muted">—</span>
  const tone = trend > 0 ? 'is-up' : trend < 0 ? 'is-down' : 'is-flat'
  const title =
    trend > 0
      ? `Up ${trend} Vs Prior`
      : trend < 0
        ? `Down ${Math.abs(trend)} Vs Prior`
        : 'No Change Vs Prior'
  return (
    <span className={cx('pd-cal-rt__trend', tone)} title={title}>
      {formatRatingTrend(trend)}
    </span>
  )
}

export function EmployeeRatingTable({
  cycle,
  cycles,
  employees,
  packets,
  previousPackets,
  historyPackets,
  linkedPacketsByCycleId,
  indicators,
  departments,
  teams,
  markets,
  jobLevels,
  managers,
  sittingEpoch = 0,
  onPacketUpdated,
}: EmployeeRatingTableProps) {
  const { user } = useAuth()
  const canAssignCalibrators = hasSystemPermission(
    user?.permissions,
    'platform.write_all',
  )
  const viewerEmployeeId = user?.employeeId ?? null
  const [quickFilter, setQuickFilter] =
    useState<RatingTableQuickFilterId>('all')
  const [columnFilters, setColumnFilters] = useState<
    Partial<Record<RatingTableFilterableColumnId, string[]>>
  >({})
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null,
  )
  const [drawerFocusTarget, setDrawerFocusTarget] =
    useState<CalibrationDrawerFocusTarget | null>(null)
  const [drawerFocusNonce, setDrawerFocusNonce] = useState(0)
  const {
    data: sitting = null,
    isFetched: sittingFetched,
    isError: sittingQueryError,
    error: sittingQueryErr,
  } = useCalibrationSitting(cycle.id)
  const sittingError = sittingQueryError
    ? sittingQueryErr instanceof Error
      ? sittingQueryErr.message
      : 'Could Not Load The Calibration Session.'
    : null
  const [actionError, setActionError] = useState<string | null>(null)
  const { data: assignments = EMPTY_CALIBRATOR_ASSIGNMENTS } =
    useCalibratorAssignments()
  const setAssignments = (next: CalibratorAssignments) => {
    setCalibratorAssignmentsCache(next)
  }
  const setSitting = (next: CalibrationSitting | null) => {
    if (next) {
      setCalibrationSittingCache(cycle.id, next)
      return
    }
    queryClient.setQueryData(queryKeys.calibrationSitting(cycle.id), null)
  }

  useEffect(() => {
    if (sittingEpoch <= 0) return
    void queryClient.invalidateQueries({
      queryKey: queryKeys.calibrationSitting(cycle.id),
    })
  }, [cycle.id, sittingEpoch])

  const [calibratorsOpen, setCalibratorsOpen] = useState(false)
  const [calibratorsPersonId, setCalibratorsPersonId] = useState<number | null>(
    null,
  )
  const [confirmingClean, setConfirmingClean] = useState(false)
  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false)
  const [confirmEmployeeIds, setConfirmEmployeeIds] = useState<number[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [flagRow, setFlagRow] = useState<RatingTableRow | null>(null)
  const [overrideRow, setOverrideRow] = useState<RatingTableRow | null>(null)
  const [overrideGrade, setOverrideGrade] = useState<GradeBandId | ''>('')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [lockedOverrideAck, setLockedOverrideAck] = useState(false)
  const sessionLocked = Boolean(sitting?.lockedAt)

  const hasQuarters = annualSourceLinks(cycle, [...cycles]).length > 0
  const [visibleColumnIds, setVisibleColumnIds] = useState<
    RatingTableColumnId[]
  >(() => defaultVisibleColumnIds(hasQuarters))

  const adjustedEmployeeIds = useMemo(() => {
    const ids = new Set<number>()
    for (const person of sitting?.employees ?? []) {
      if (person.adjustedAt) ids.add(person.employeeId)
    }
    return ids
  }, [sitting])

  const rows = useMemo(
    () =>
      buildEmployeeRatingRows({
        cycle,
        cycles,
        employees,
        packets,
        previousPackets,
        linkedPacketsByCycleId,
        indicators,
        sittingEmployees: sitting?.employees,
        adjustedEmployeeIds,
      }),
    [
      cycle,
      cycles,
      employees,
      packets,
      previousPackets,
      linkedPacketsByCycleId,
      indicators,
      sitting?.employees,
      adjustedEmployeeIds,
    ],
  )

  const priorYearLabel = rows[0]?.priorYearLabel ?? 'Prior'
  const quarterColumnLabels = useMemo(() => {
    const fromRow = rows[0]?.quarters
    if (fromRow && fromRow.length > 0) {
      return fromRow.map((quarter) => quarter.label)
    }
    return annualSourceLinks(cycle, [...cycles]).map((link, index) => {
      const source = cycles.find((item) => item.id === link.sourceCycleId)
      return source?.name?.trim() || `Q${index + 1}`
    })
  }, [rows, cycle, cycles])

  function columnTitle(columnId: RatingTableColumnId, fallback: string): string {
    if (columnId === 'annual') return 'Final Rating'
    if (columnId === 'prior') {
      return priorYearLabel === 'Prior'
        ? 'Prior Rating'
        : `${priorYearLabel} Rating`
    }
    if (columnId === 'q1') return quarterColumnLabels[0] || fallback
    if (columnId === 'q2') return quarterColumnLabels[1] || fallback
    if (columnId === 'q3') return quarterColumnLabels[2] || fallback
    if (columnId === 'q4') return quarterColumnLabels[3] || fallback
    return fallback
  }

  function columnHint(columnId: RatingTableColumnId): string | undefined {
    if (columnId === 'annual') return 'Live Calibrated Rating For This Cycle'
    if (columnId === 'self') return 'Employee Self-Rating For This Cycle'
    if (columnId === 'managerRating')
      return 'Manager Review Grade — Unchanged By Overrides'
    if (columnId === 'gap') return 'Official Vs Self-Rating, In Rating Tiers'
    if (columnId === 'prior') return 'Official Rating From The Previous Cycle'
    if (columnId === 'trend') return 'Change Vs Prior Cycle, In Rating Tiers'
    if (columnId === 'qAvg') return 'Average Of Linked Quarter Ratings'
    if (columnId === 'jobGrade') return 'Current Job Grade'
    if (columnId === 'timeInGrade') return 'Time In Current Job Grade'
    if (columnId === 'calibrationStatus') return 'Calibration Sitting Status'
    if (columnId === 'adjusted') return 'Rating Changed In This Sitting'
    return undefined
  }

  const resolvedColumnOptions = useMemo<ColumnVisibilityOption[]>(
    () =>
      RATING_TABLE_COLUMN_OPTIONS.filter(
        (column) => !column.annualOnly || hasQuarters,
      ).map((column) => ({
        id: column.id,
        label: columnTitle(column.id, column.label),
        required: column.required,
      })),
    [hasQuarters, priorYearLabel, quarterColumnLabels],
  )

  const columnFilterOptions = useMemo(() => {
    const entries = RATING_TABLE_FILTERABLE_COLUMN_IDS.map((columnId) => {
      const values = [
        ...new Set(
          rows.map((row) => ratingTableColumnFilterValue(row, columnId)),
        ),
      ].sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base' }),
      )
      return [
        columnId,
        values.map(
          (value): ColumnFilterOption => ({ value, label: value }),
        ),
      ] as const
    })
    return Object.fromEntries(entries) as Record<
      RatingTableFilterableColumnId,
      ColumnFilterOption[]
    >
  }, [rows])

  const filteredRows = useMemo(
    () =>
      filterRatingTableRows(rows, {
        quickFilter,
        department: departments,
        team: teams,
        market: markets,
        jobLevel: jobLevels,
        manager: managers.length > 0 ? managers : undefined,
        columnFilters,
      }),
    [
      rows,
      quickFilter,
      departments,
      teams,
      markets,
      jobLevels,
      managers,
      columnFilters,
    ],
  )

  const setColumnFilter = useCallback(
    (columnId: RatingTableFilterableColumnId, values: string[]) => {
      setColumnFilters((current) => ({ ...current, [columnId]: values }))
    },
    [],
  )

  const columnHeading = useCallback(
    (
      columnId: RatingTableFilterableColumnId,
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

  const filteredEmployeeIds = useMemo(
    () => filteredRows.map((row) => row.employeeId),
    [filteredRows],
  )
  const filteredSelectedCount = useMemo(
    () =>
      filteredRows.reduce(
        (count, row) => (selectedIds.has(row.employeeId) ? count + 1 : count),
        0,
      ),
    [filteredRows, selectedIds],
  )
  const allFilteredSelected =
    filteredRows.length > 0 && filteredSelectedCount === filteredRows.length
  const someFilteredSelected =
    filteredSelectedCount > 0 && !allFilteredSelected
  /** Visible selection only — confirm marks every checked row, clean or not. */
  const selectedConfirmIds = useMemo(
    () =>
      filteredRows
        .filter((row) => selectedIds.has(row.employeeId))
        .map((row) => row.employeeId),
    [filteredRows, selectedIds],
  )
  const selectedCalibratorPersonId = useMemo(() => {
    for (const row of filteredRows) {
      if (selectedIds.has(row.employeeId)) return row.employeeId
    }
    return null
  }, [filteredRows, selectedIds])

  const tableWrapRef = useRef<HTMLDivElement>(null)
  const [isScrolledX, setIsScrolledX] = useState(false)

  useEffect(() => {
    const el = tableWrapRef.current
    if (!el) {
      setIsScrolledX(false)
      return
    }
    const syncScrolledX = () => {
      setIsScrolledX(el.scrollLeft > 0)
    }
    syncScrolledX()
    el.addEventListener('scroll', syncScrolledX, { passive: true })
    return () => el.removeEventListener('scroll', syncScrolledX)
  }, [filteredRows.length, visibleColumnIds])

  const tableFilterSignature = useMemo(
    () =>
      [
        quickFilter,
        departments.join('\0'),
        teams.join('\0'),
        markets.join('\0'),
        jobLevels.join('\0'),
        managers.join('\0'),
        JSON.stringify(columnFilters),
      ].join('|'),
    [
      quickFilter,
      departments,
      teams,
      markets,
      jobLevels,
      managers,
      columnFilters,
    ],
  )
  const tableFilterReady = useRef(false)
  const [tableEnterKey, setTableEnterKey] = useState(0)

  useEffect(() => {
    if (!tableFilterReady.current) {
      tableFilterReady.current = true
      return
    }
    setTableEnterKey((current) => current + 1)
    setSelectedIds(new Set())
  }, [tableFilterSignature])

  function toggleSelected(employeeId: number) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }

  function toggleSelectAllFiltered() {
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
  }

  function openConfirmSelected(employeeIds: readonly number[]) {
    if (employeeIds.length === 0) return
    setActionError(null)
    setConfirmEmployeeIds([...employeeIds])
    setConfirmCleanOpen(true)
  }

  function openAssignCalibrators(personId: number | null = null) {
    setSelectedEmployeeId(null)
    setDrawerFocusTarget(null)
    setCalibratorsPersonId(personId)
    setCalibratorsOpen(true)
  }

  const progress = useMemo(() => ratingTableProgress(rows), [rows])

  const summaryItems = useMemo(() => {
    let gap2 = 0
    let developingBelow = 0
    let exceedingAbove = 0
    for (const row of rows) {
      if (row.gapTiers != null && Math.abs(row.gapTiers) >= 2) gap2 += 1
      if (
        row.annualGrade === 'developing' ||
        row.annualGrade === 'unsatisfactory'
      ) {
        developingBelow += 1
      }
      if (
        row.annualGrade === 'exceeding' ||
        row.annualGrade === 'exceptional'
      ) {
        exceedingAbove += 1
      }
    }
    // Flagged / Adjusted / Clean live in Calibration Progress (bar + legend).
    return [
      {
        id: 'all' as const,
        label: 'Employees',
        value: progress.total,
        icon: Users,
      },
      {
        id: 'gap_2' as const,
        label: 'Gap 2+',
        value: gap2,
        icon: ArrowLeftRight,
      },
      {
        id: 'developing_below' as const,
        label: 'Developing & Below',
        value: developingBelow,
        icon: TrendingDown,
      },
      {
        id: 'exceeding_above' as const,
        label: 'Exceeding & Above',
        value: exceedingAbove,
        icon: TrendingUp,
      },
    ]
  }, [rows, progress])

  function toggleQuickFilter(next: RatingTableQuickFilterId) {
    setQuickFilter((current) => (current === next ? 'all' : next))
  }

  const visibleSet = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds])
  const selectedRow =
    rows.find((row) => row.employeeId === selectedEmployeeId) ?? null
  const selectedEmployee = employees.find(
    (person) => person.employeeId === selectedEmployeeId,
  )
  const selectedPacket =
    packets.find((packet) => packet.employeeId === selectedEmployeeId) ?? null

  const tableColumns = useMemo<ResizableColumn[]>(() => {
    const defs: Array<{ id: RatingTableColumnId | 'select'; grow?: boolean }> = [
      ...(canAssignCalibrators ? [{ id: 'select' as const }] : []),
      { id: 'employee', grow: true },
      { id: 'manager' },
      { id: 'department' },
      { id: 'team' },
      { id: 'market' },
      { id: 'jobGrade' },
      { id: 'joinDate' },
      { id: 'timeInGrade' },
      { id: 'lastPromo' },
      { id: 'pip' },
      { id: 'calibrationStatus' },
      { id: 'adjusted' },
      { id: 'notes' },
      { id: 'flags' },
      { id: 'gap' },
      { id: 'prior' },
      { id: 'trend' },
      { id: 'q1' },
      { id: 'q2' },
      { id: 'q3' },
      { id: 'q4' },
      { id: 'qAvg' },
      { id: 'self' },
      { id: 'managerRating' },
      { id: 'annual' },
      { id: 'action' },
    ]
    return defs
      .filter(
        (column) =>
          column.id === 'select' || visibleSet.has(column.id),
      )
      .map((column) => {
        if (column.id === 'select') {
          return {
            id: 'select',
            name: 'Select',
            minWidth: 48,
            label: (
              <label className="pd-cal-rt__select">
                <input
                  type="checkbox"
                  className="pd-sr-only"
                  checked={allFilteredSelected}
                  disabled={filteredRows.length === 0 || confirmingClean}
                  aria-label={
                    allFilteredSelected
                      ? 'Clear Selection For Visible People'
                      : 'Select All Visible People'
                  }
                  onChange={toggleSelectAllFiltered}
                />
                <span
                  className={cx(
                    'pd-cycle-extensions__search-check',
                    allFilteredSelected && 'is-checked',
                    someFilteredSelected && 'is-partial',
                  )}
                  aria-hidden
                />
              </label>
            ),
          }
        }
        const meta = RATING_TABLE_COLUMN_OPTIONS.find(
          (item) => item.id === column.id,
        )
        const title = columnTitle(column.id, meta?.label ?? column.id)
        const hint = columnHint(column.id)
        const titleNode = hint ? <span title={hint}>{title}</span> : title
        return {
          id: column.id,
          name: title,
          label: isFilterableColumnId(column.id)
            ? columnHeading(column.id, titleNode, title)
            : titleNode,
          grow: column.grow,
        }
      })
  }, [
    visibleSet,
    priorYearLabel,
    quarterColumnLabels,
    canAssignCalibrators,
    allFilteredSelected,
    someFilteredSelected,
    filteredRows.length,
    confirmingClean,
    columnHeading,
  ])

  async function rememberAdjusted(employeeId: number) {
    const previous = sitting
    setActionError(null)
    const base: CalibrationSitting = sitting ?? {
      cycleId: cycle.id,
      cleanConfirmedAt: null,
      lockedAt: null,
      employees: [],
    }
    const employees = base.employees.some(
      (person) => person.employeeId === employeeId,
    )
      ? base.employees.map((person) =>
        person.employeeId === employeeId
          ? {
            ...person,
            status: 'rating_changed' as const,
            adjustedAt: person.adjustedAt ?? new Date().toISOString(),
          }
          : person,
      )
      : [
        ...base.employees,
        {
          employeeId,
          status: 'rating_changed' as const,
          notes: '',
          adjustedAt: new Date().toISOString(),
        },
      ]
    setSitting({ ...base, employees })
    try {
      const next = await saveCalibrationSittingEmployee(cycle.id, employeeId, {
        status: 'rating_changed',
        adjusted: true,
      })
      setSitting(next)
    } catch (error) {
      setSitting(previous)
      setActionError(
        error instanceof Error
          ? error.message
          : 'Could Not Record This Grade Change.',
      )
    }
  }

  async function confirmClean() {
    if (confirmEmployeeIds.length === 0) return
    setConfirmingClean(true)
    setActionError(null)
    const employeeIds = confirmEmployeeIds
    try {
      setSitting(await confirmCalibrationClean(cycle.id, employeeIds))
      setConfirmCleanOpen(false)
      setConfirmEmployeeIds([])
      setSelectedIds((current) => {
        if (current.size === 0) return current
        const next = new Set(current)
        for (const id of employeeIds) next.delete(id)
        return next
      })
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Could Not Confirm The Selected Ratings.',
      )
    } finally {
      setConfirmingClean(false)
    }
  }

  function exportCsv() {
    const csv = ratingTableCsv(filteredRows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `calibration-ratings-${cycle.id}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function openOverride(row: RatingTableRow) {
    if (!row.managerGrade) return
    setOverrideRow(row)
    setOverrideGrade(row.annualGrade ?? row.managerGrade)
    setOverrideReason('')
    setOverrideError(null)
    setLockedOverrideAck(false)
  }

  async function saveOverride() {
    if (
      !overrideRow?.packetId ||
      !overrideRow.managerGrade ||
      !overrideGrade ||
      !overrideReason.trim()
    ) {
      return
    }
    if (sessionLocked && !lockedOverrideAck) return
    setOverrideSaving(true)
    setOverrideError(null)
    try {
      const next = await calibrateReviewPacket(overrideRow.packetId, {
        toGrade: overrideGrade,
        reason: overrideReason.trim(),
        ...(sessionLocked ? { acknowledgedLockedOverride: true } : {}),
      })
      onPacketUpdated(next)
      if (sessionLocked) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.calibrationSitting(cycle.id),
        })
      } else {
        void rememberAdjusted(overrideRow.employeeId)
      }
      setOverrideRow(null)
      setLockedOverrideAck(false)
    } catch (error) {
      setOverrideError(
        error instanceof Error ? error.message : 'Could not save override.',
      )
    } finally {
      setOverrideSaving(false)
    }
  }

  const flaggedPct =
    progress.total > 0 ? (progress.flagged / progress.total) * 100 : 0
  const adjustedPct =
    progress.total > 0 ? (progress.adjusted / progress.total) * 100 : 0
  const cleanPct =
    progress.total > 0 ? (progress.clean / progress.total) * 100 : 0
  const cleanShare =
    progress.total > 0 ? Math.round((progress.clean / progress.total) * 100) : 0

  const progressLegend = [
    {
      id: 'flagged' as const,
      label: 'Flagged',
      value: progress.flagged,
      icon: Flag,
    },
    {
      id: 'adjusted' as const,
      label: 'Adjusted',
      value: progress.adjusted,
      icon: PenLine,
    },
    {
      id: 'clean' as const,
      label: 'Clean',
      value: progress.clean,
      icon: Check,
    },
  ]

  if (rows.length === 0) {
    return (
      <EmptyState
        className="pd-people__empty-panel"
        icon={Scale}
        title="No People In Cycle"
        description="Add People To This Cycle’s Groups To Build The Rating Table."
      />
    )
  }

  return (
    <section className="pd-cal-rt" aria-label="Employee Rating Table">
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Calibration Rating Totals"
      >
        {summaryItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={cx(
                'pd-people__summary-btn',
                quickFilter === item.id && 'is-active',
              )}
              aria-pressed={quickFilter === item.id}
              onClick={() => toggleQuickFilter(item.id)}
            >
              <span className="pd-people__summary-label">
                <Icon size={14} strokeWidth={1.75} aria-hidden />
                {item.label}
              </span>
              <span className="pd-people__summary-value">{item.value}</span>
            </button>
          )
        })}
      </div>

      <div className="pd-cal-rt__progress">
        <div className="pd-cal-rt__progress-head">
          <div className="pd-cal-rt__progress-copy">
            <div className="pd-cal-rt__progress-title-row">
              <h2 className="pd-cal-rt__progress-title">Calibration Progress</h2>
              {progress.total > 0 ? (
                <span
                  className="pd-cal-rt__progress-pct"
                  title={`${progress.clean} Of ${progress.total} Clean`}
                >
                  {cleanShare}% Clean
                </span>
              ) : null}
            </div>
            {progress.total === 0 ? (
              <p className="pd-cal-rt__progress-summary">
                No Employees In This Sitting Yet.
              </p>
            ) : null}
            {sittingError ? (
              <p className="pd-cal-rt__override-error" role="alert">
                {sittingError}
              </p>
            ) : null}
            {actionError ? (
              <p className="pd-cal-rt__override-error" role="alert">
                {actionError}
              </p>
            ) : null}
          </div>

          <div
            className="pd-cal-rt__legend"
            role="group"
            aria-label="Progress Breakdown"
          >
            {progressLegend.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cx(
                    'pd-cal-rt__legend-chip',
                    `is-${item.id}`,
                    quickFilter === item.id && 'is-active',
                  )}
                  aria-pressed={quickFilter === item.id}
                  onClick={() => toggleQuickFilter(item.id)}
                >
                  <span className="pd-cal-rt__legend-swatch" aria-hidden />
                  <Icon size={13} strokeWidth={2} aria-hidden />
                  <span className="pd-cal-rt__legend-value">{item.value}</span>
                  <span className="pd-cal-rt__legend-label">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div
          className="pd-cal-rt__bar"
          role="img"
          aria-label={`${progress.flagged} Flagged, ${progress.adjusted} Adjusted, ${progress.clean} Clean`}
        >
          <span
            className="pd-cal-rt__bar-seg is-flagged"
            style={{ width: `${flaggedPct}%` }}
          />
          <span
            className="pd-cal-rt__bar-seg is-adjusted"
            style={{ width: `${adjustedPct}%` }}
          />
          <span
            className="pd-cal-rt__bar-seg is-clean"
            style={{ width: `${cleanPct}%` }}
          />
        </div>
      </div>

      <div className="pd-cal-rt__toolbar">
        <div className="pd-cal-rt__toolbar-start">
          <h3 className="pd-cal-rt__title">
            <span className="pd-cal-rt__step" aria-hidden>
              1
            </span>
            Employee Rating Table
          </h3>
        </div>
        <div className="pd-cal-rt__toolbar-end">
          <ColumnVisibility
            columns={resolvedColumnOptions}
            visibleIds={visibleColumnIds}
            onChange={(next) =>
              setVisibleColumnIds(next as RatingTableColumnId[])
            }
            defaultVisibleIds={defaultVisibleColumnIds(hasQuarters)}
          />
          <button
            type="button"
            className="pd-people__ghost-btn"
            onClick={exportCsv}
          >
            <Download size={16} strokeWidth={1.75} aria-hidden />
            Export
          </button>
        </div>
      </div>

      <div className="pd-cal-rt__filters-row">
        <div
          className="pd-cal-rt__chips"
          role="toolbar"
          aria-label="Quick Filters"
        >
          {RATING_TABLE_QUICK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={cx(
                'pd-cal-rt__chip',
                quickFilter === filter.id && 'is-active',
              )}
              aria-pressed={quickFilter === filter.id}
              onClick={() => toggleQuickFilter(filter.id)}
            >
              {filter.id === 'flagged' ? (
                <Flag size={12} strokeWidth={2.25} aria-hidden />
              ) : null}
              {filter.label}
            </button>
          ))}
        </div>
        {canAssignCalibrators ? (
          <div className="pd-cal-rt__filter-actions">
            {selectedConfirmIds.length > 0 ? (
              <>
                <button
                  type="button"
                  className="pd-people__ghost-btn pd-people__ghost-btn--success"
                  onClick={() => openConfirmSelected(selectedConfirmIds)}
                  disabled={
                    sitting == null ||
                    Boolean(sitting.lockedAt) ||
                    confirmingClean
                  }
                >
                  <Check size={16} strokeWidth={1.75} aria-hidden />
                  Confirm Selected
                  <CountBadge
                    count={selectedConfirmIds.length}
                    tone="success"
                  />
                </button>
                <button
                  type="button"
                  className="pd-people__ghost-btn pd-people__ghost-btn--primary"
                  onClick={() =>
                    openAssignCalibrators(selectedCalibratorPersonId)
                  }
                >
                  <Users size={16} strokeWidth={1.75} aria-hidden />
                  Assign Calibrators
                </button>
                <button
                  type="button"
                  className="pd-people__ghost-btn"
                  disabled={confirmingClean}
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </button>
              </>
            ) : (
              <button
                type="button"
                className="pd-people__ghost-btn pd-people__ghost-btn--primary"
                onClick={() => openAssignCalibrators()}
              >
                <Users size={16} strokeWidth={1.75} aria-hidden />
                Assign Calibrators
              </button>
            )}
          </div>
        ) : null}
      </div>

      {filteredRows.length === 0 ? (
        <div
          key={tableEnterKey}
          className={cx(
            'pd-cal-rt__table-stage',
            tableEnterKey > 0 && 'pd-cal-rt__table-stage--enter',
          )}
        >
          <EmptyState
            className="pd-people__empty-panel"
            icon={Users}
            title="No Matches"
            description="Try A Different Filter Or Reset The Table Filters."
          />
        </div>
      ) : (
        <div
          key={tableEnterKey}
          className={cx(
            'pd-cal-rt__table-stage',
            tableEnterKey > 0 && 'pd-cal-rt__table-stage--enter',
          )}
        >
          <div
            ref={tableWrapRef}
            className={cx(
              'pd-people__table-wrap pd-cal-rt__table-wrap',
              isScrolledX && 'is-scrolled-x',
            )}
          >
            <ResizableTable
              className="pd-people__table pd-cal-rt__table"
              storageKey="calibration-rating-table-v4"
              columns={tableColumns}
              fitKey={`${visibleColumnIds.join('|')}:${filteredRows.length}:${canAssignCalibrators ? 'select' : 'noselect'}`}
            >
              <tbody>
                {filteredRows.map((row) => {
                  const isSelected = selectedIds.has(row.employeeId)
                  const openEmployee = (
                    focusTarget: CalibrationDrawerFocusTarget | null = null,
                  ) => {
                    prefetchReviewPacket(
                      queryClient,
                      cycle.id,
                      row.employeeId,
                    )
                    setSelectedEmployeeId(row.employeeId)
                    setDrawerFocusTarget(focusTarget)
                    if (focusTarget) {
                      setDrawerFocusNonce((nonce) => nonce + 1)
                    }
                  }
                  return (
                    <tr
                      key={row.employeeId}
                      className={cx(
                        'pd-people__row-link',
                        row.isFlagged && 'is-flagged',
                        row.isAdjusted && 'is-adjusted',
                        isSelected && 'is-selected',
                      )}
                      tabIndex={0}
                      onMouseEnter={() =>
                        prefetchReviewPacket(
                          queryClient,
                          cycle.id,
                          row.employeeId,
                        )
                      }
                      onClick={(event) => {
                        const target = event.target as HTMLElement
                        if (target.closest('a, button, input, label')) return
                        openEmployee()
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        const target = event.target as HTMLElement
                        if (target.closest('a, button, input, label')) return
                        event.preventDefault()
                        openEmployee()
                      }}
                    >
                      {canAssignCalibrators ? (
                        <td className="pd-cal-rt__select-cell">
                          <label className="pd-cal-rt__select">
                            <input
                              type="checkbox"
                              className="pd-sr-only"
                              checked={isSelected}
                              disabled={confirmingClean}
                              aria-label={`Select ${row.fullName}`}
                              onChange={() => toggleSelected(row.employeeId)}
                            />
                            <span
                              className={cx(
                                'pd-cycle-extensions__search-check',
                                isSelected && 'is-checked',
                              )}
                              aria-hidden
                            />
                          </label>
                        </td>
                      ) : null}
                      {visibleSet.has('employee') ? (
                        <td className="pd-cal-rt__employee-cell">
                          <span className="pd-cal-rt__person">
                            <Avatar
                              name={row.fullName}
                              src={row.avatarUrl || undefined}
                              size="sm"
                              style={avatarStyle(row.fullName)}
                            />
                            <button
                              type="button"
                              className="pd-cal-rt__name"
                              onMouseEnter={() =>
                                prefetchReviewPacket(
                                  queryClient,
                                  cycle.id,
                                  row.employeeId,
                                )
                              }
                              onFocus={() =>
                                prefetchReviewPacket(
                                  queryClient,
                                  cycle.id,
                                  row.employeeId,
                                )
                              }
                              onClick={openEmployee}
                            >
                              {row.fullName}
                            </button>
                          </span>
                        </td>
                      ) : null}
                      {visibleSet.has('manager') ? (
                        <td className="pd-cal-rt__start">
                          {row.managerName === '—' ? (
                            '—'
                          ) : (
                            <span className="pd-cal-rt__person">
                              <Avatar
                                name={row.managerName}
                                src={row.managerAvatarUrl || undefined}
                                size="sm"
                                style={avatarStyle(row.managerName)}
                              />
                              <span className="pd-cal-rt__manager-name">
                                {row.managerName}
                              </span>
                            </span>
                          )}
                        </td>
                      ) : null}
                      {visibleSet.has('department') ? (
                        <td className="pd-cal-rt__start">{row.department}</td>
                      ) : null}
                      {visibleSet.has('team') ? (
                        <td className="pd-cal-rt__start">{row.team}</td>
                      ) : null}
                      {visibleSet.has('market') ? (
                        <td className="pd-cal-rt__start">{row.market}</td>
                      ) : null}
                      {visibleSet.has('jobGrade') ? <td>{row.jobGrade}</td> : null}
                      {visibleSet.has('joinDate') ? (
                        <td>{row.joinDateLabel}</td>
                      ) : null}
                      {visibleSet.has('timeInGrade') ? (
                        <td>{row.timeInGradeLabel}</td>
                      ) : null}
                      {visibleSet.has('lastPromo') ? (
                        <td>{row.lastPromoLabel}</td>
                      ) : null}
                      {visibleSet.has('pip') ? (
                        <td>
                          {row.onPip ? (
                            <span className="pd-cal-rt__pip">
                              <span>{pipStatusLabel(true)}</span>
                              <PipDisplayOnlyMark />
                            </span>
                          ) : (
                            <span className="pd-cal-rt__muted">—</span>
                          )}
                        </td>
                      ) : null}
                      {visibleSet.has('calibrationStatus') ? (
                        <td>
                          <span
                            className={cx(
                              'pd-cal-rt__status-chip',
                              `is-${row.calibrationStatus}`,
                            )}
                          >
                            {
                              CALIBRATION_SITTING_STATUS_LABEL[
                              row.calibrationStatus
                              ]
                            }
                          </span>
                        </td>
                      ) : null}
                      {visibleSet.has('adjusted') ? (
                        <td className="pd-cal-rt__center">
                          {row.isAdjusted ? (
                            <span className="pd-cal-rt__adjusted-yes" title="Adjusted This Session">
                              <Check size={14} strokeWidth={2.25} aria-hidden />
                              Yes
                            </span>
                          ) : (
                            <span className="pd-cal-rt__muted">—</span>
                          )}
                        </td>
                      ) : null}
                      {visibleSet.has('notes') ? (
                        <td className="pd-cal-rt__center">
                          {row.sessionNotes ? (
                            <button
                              type="button"
                              className="pd-cal-rt__notes"
                              title={row.sessionNotes}
                              aria-label={`Open Session Notes For ${row.fullName}`}
                              onClick={() => openEmployee('session-notes')}
                            >
                              <StickyNote size={14} strokeWidth={2.25} aria-hidden />
                              <span className="pd-sr-only">Has Notes</span>
                            </button>
                          ) : (
                            <span className="pd-cal-rt__muted">—</span>
                          )}
                        </td>
                      ) : null}
                      {visibleSet.has('flags') ? (
                        <td className="pd-cal-rt__center">
                          {row.isFlagged ? (
                            <button
                              type="button"
                              className="pd-cal-rt__flag-chip"
                              aria-label={
                                row.flags.length === 1
                                  ? `1 Flag For ${row.fullName}. View Details.`
                                  : `${row.flags.length} Flags For ${row.fullName}. View Details.`
                              }
                              title={row.flags.map((flag) => flag.title).join(' · ')}
                              onClick={() => setFlagRow(row)}
                            >
                              <Flag size={12} strokeWidth={2.25} aria-hidden />
                              <span>{row.flags.length}</span>
                            </button>
                          ) : (
                            <span className="pd-cal-rt__muted">—</span>
                          )}
                        </td>
                      ) : null}
                      {visibleSet.has('gap') ? (
                        <td>
                          <GapCell gapTiers={row.gapTiers} />
                        </td>
                      ) : null}
                      {visibleSet.has('prior') ? (
                        <td>
                          <GradePill grade={row.priorGrade} />
                        </td>
                      ) : null}
                      {visibleSet.has('trend') ? (
                        <td className="pd-cal-rt__center">
                          <TrendCell trend={row.trend} />
                        </td>
                      ) : null}
                      {visibleSet.has('q1') ? (
                        <td>
                          <GradePill grade={row.quarters[0]?.grade ?? null} />
                        </td>
                      ) : null}
                      {visibleSet.has('q2') ? (
                        <td>
                          <GradePill grade={row.quarters[1]?.grade ?? null} />
                        </td>
                      ) : null}
                      {visibleSet.has('q3') ? (
                        <td>
                          <GradePill grade={row.quarters[2]?.grade ?? null} />
                        </td>
                      ) : null}
                      {visibleSet.has('q4') ? (
                        <td>
                          <GradePill grade={row.quarters[3]?.grade ?? null} />
                        </td>
                      ) : null}
                      {visibleSet.has('qAvg') ? (
                        <td className="pd-cal-rt__num">
                          {row.quarterAverageScore?.toFixed(1) ?? '—'}
                        </td>
                      ) : null}
                      {visibleSet.has('self') ? (
                        <td>
                          <GradePill grade={row.selfGrade} />
                        </td>
                      ) : null}
                      {visibleSet.has('managerRating') ? (
                        <td>
                          <GradePill grade={row.managerGrade} />
                        </td>
                      ) : null}
                      {visibleSet.has('annual') ? (
                        <td>
                          <GradePill grade={row.annualGrade} />
                        </td>
                      ) : null}
                      {visibleSet.has('action') ? (
                        <td>
                          <button
                            type="button"
                            className="pd-people__ghost-btn pd-people__ghost-btn--outline pd-cal-rt__override-btn"
                            disabled={
                              !row.packetId ||
                              !row.managerGrade ||
                              !canOverrideCalibrationGrade({
                                viewerEmployeeId,
                                permissions: user?.permissions,
                                subject:
                                  employees.find(
                                    (employee) =>
                                      employee.employeeId === row.employeeId,
                                  ) ?? {
                                    employeeId: row.employeeId,
                                    department: row.department,
                                    team: row.team,
                                  },
                                assignments,
                                sessionLocked,
                              })
                            }
                            title={
                              !row.managerGrade
                                ? 'Manager rating required before override'
                                : sessionLocked
                                  ? 'Session locked — administrator exception only'
                                  : undefined
                            }
                            onClick={() => openOverride(row)}
                          >
                            <PenLine size={15} strokeWidth={1.75} aria-hidden />
                            Override
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </ResizableTable>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCleanOpen}
        onClose={() => {
          setConfirmCleanOpen(false)
          setConfirmEmployeeIds([])
        }}
        onConfirm={() => {
          void confirmClean()
        }}
        title="Confirm Selected Ratings?"
        description={
          confirmEmployeeIds.length === 1
            ? '1 Selected Person Will Be Marked Confirmed.'
            : `${confirmEmployeeIds.length} Selected People Will Be Marked Confirmed.`
        }
        confirmLabel={
          confirmEmployeeIds.length === 1
            ? 'Confirm 1 Person'
            : `Confirm ${confirmEmployeeIds.length} People`
        }
        cancelLabel="Cancel"
        confirmLoading={confirmingClean}
      />

      <Modal
        open={flagRow != null}
        onClose={() => setFlagRow(null)}
        title={flagRow ? `Flags · ${flagRow.fullName}` : 'Flags'}
        description="Calibration Indicators That Include This Person."
      >
        {flagRow && flagRow.flags.length > 0 ? (
          <ul className="pd-cal-rt__flag-list">
            {flagRow.flags.map((flag) => (
              <li key={flag.id}>
                <strong>{flag.title}</strong>
                <span>{flag.definition}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pd-cal-rt__muted">No Flags.</p>
        )}
      </Modal>

      <Modal
        open={overrideRow != null}
        onClose={() => {
          if (overrideSaving) return
          setOverrideRow(null)
          setLockedOverrideAck(false)
        }}
        title={
          overrideRow ? `Override · ${overrideRow.fullName}` : 'Override Rating'
        }
        description={
          sessionLocked
            ? LOCKED_OVERRIDE_HINT
            : 'A written reason is required. The person’s manager is notified.'
        }
        actions={
          <>
            <Button
              variant="secondary"
              disabled={overrideSaving}
              onClick={() => {
                setOverrideRow(null)
                setLockedOverrideAck(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={overrideSaving}
              disabled={
                !overrideGrade ||
                !overrideReason.trim() ||
                !overrideRow?.packetId ||
                !overrideRow.managerGrade ||
                (sessionLocked && !lockedOverrideAck)
              }
              onClick={() => {
                void saveOverride()
              }}
            >
              Save Override
            </Button>
          </>
        }
      >
        {overrideRow ? (
          <div className="pd-cal-rt__override">
            <label className="pd-cal-rt__override-field">
              <span>Calibrated Grade</span>
              <ListboxSelect
                className={overrideGradeSelectClass(overrideGrade)}
                value={overrideGrade}
                onValueChange={(value) => {
                  setOverrideGrade((value as GradeBandId) || '')
                  setOverrideError(null)
                }}
                options={GRADE_LISTBOX_OPTIONS}
                allowEmpty={false}
                portal={false}
                aria-label="Calibrated Grade"
              />
            </label>
            <label className="pd-cal-rt__override-field">
              <span>Reason</span>
              <Textarea
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                rows={3}
                placeholder="Why is this grade changing?"
              />
            </label>
            {sessionLocked ? (
              <Checkbox
                className="pd-cal-rt__override-ack"
                label={LOCKED_OVERRIDE_ACK_LABEL}
                checked={lockedOverrideAck}
                onChange={(event) => setLockedOverrideAck(event.target.checked)}
              />
            ) : null}
            {overrideError ? (
              <p className="pd-cal-rt__override-error" role="alert">
                {overrideError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {calibratorsOpen ? (
        <DepartmentCalibratorsDialog
          assignments={assignments}
          employees={employees}
          initialPersonId={calibratorsPersonId}
          onClose={() => {
            setCalibratorsOpen(false)
            setCalibratorsPersonId(null)
          }}
          onChange={setAssignments}
        />
      ) : null}

      {selectedRow ? (
        <CalibrationEmployeeDrawer
          row={selectedRow}
          employee={selectedEmployee}
          cycle={cycle}
          cycles={cycles}
          summaryPacket={selectedPacket}
          historyPackets={historyPackets}
          onClose={() => {
            setSelectedEmployeeId(null)
            setDrawerFocusTarget(null)
          }}
          onPacketUpdated={onPacketUpdated}
          sittingEmployee={
            sitting?.employees.find(
              (person) => person.employeeId === selectedRow.employeeId,
            ) ?? null
          }
          sittingReady={sittingFetched || sitting != null}
          sessionLocked={sessionLocked}
          canOverride={canOverrideCalibrationGrade({
            viewerEmployeeId,
            permissions: user?.permissions,
            subject:
              selectedEmployee ?? {
                employeeId: selectedRow.employeeId,
                department: selectedRow.department,
                team: selectedRow.team,
              },
            assignments,
            sessionLocked,
          })}
          onSittingSaved={setSitting}
          onRatingAdjusted={() => {
            if (sessionLocked) {
              void queryClient.invalidateQueries({
                queryKey: queryKeys.calibrationSitting(cycle.id),
              })
              return
            }
            void rememberAdjusted(selectedRow.employeeId)
          }}
          focusTarget={drawerFocusTarget}
          focusNonce={drawerFocusNonce}
        />
      ) : null}
    </section>
  )
}
