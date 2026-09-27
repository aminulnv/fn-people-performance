import { useEffect, useMemo, useRef, useState } from 'react'
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
  ColumnVisibility,
  ConfirmDialog,
  EmptyState,
  ListboxSelect,
  Modal,
  ResizableTable,
  Textarea,
  type ColumnVisibilityOption,
  type ResizableColumn,
} from '@/components/ui'
import { cx } from '@/lib/cx'
import { avatarStyle } from '@/lib/employees/avatar'
import { pipStatusLabel } from '@/lib/employees/career'
import type { PlatformEmployee } from '@/lib/employees/types'
import { calibrateReviewPacket } from '@/lib/reviews/packetsApi'
import { annualSourceLinks } from '@/lib/reviews/annualQuarters'
import { GRADE_BAND_META, OVERALL_GRADE_ORDER } from '@/lib/reviews/labels'
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
  reasonWithHrbpCosign,
  requiresHrbpCosign,
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
import { queryClient, queryKeys } from '@/lib/queryClient'
import { DepartmentCalibratorsDialog } from '@/pages/calibration/DepartmentCalibratorsDialog'
import {
  RATING_TABLE_COLUMN_OPTIONS,
  RATING_TABLE_QUICK_FILTERS,
  buildEmployeeRatingRows,
  defaultVisibleColumnIds,
  filterRatingTableRows,
  formatGapLabel,
  formatRatingTrend,
  gradeLabel,
  ratingTableCsv,
  ratingTableProgress,
  type RatingTableColumnId,
  type RatingTableQuickFilterId,
  type RatingTableRow,
} from '@/lib/calibration/ratingTable'
import { CalibrationEmployeeDrawer } from '@/pages/calibration/CalibrationEmployeeDrawer'
import { PipDisplayOnlyMark } from '@/pages/profile/PipDisplayOnlyMark'

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
      ? `Up ${trend} vs prior`
      : trend < 0
        ? `Down ${Math.abs(trend)} vs prior`
        : 'No change vs prior'
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null,
  )
  const {
    data: sitting = null,
    isError: sittingQueryError,
    error: sittingQueryErr,
  } = useCalibrationSitting(cycle.id)
  const sittingError = sittingQueryError
    ? sittingQueryErr instanceof Error
      ? sittingQueryErr.message
      : 'Could not load the calibration session.'
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
  const [confirmingClean, setConfirmingClean] = useState(false)
  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false)
  const [flagRow, setFlagRow] = useState<RatingTableRow | null>(null)
  const [overrideRow, setOverrideRow] = useState<RatingTableRow | null>(null)
  const [overrideGrade, setOverrideGrade] = useState<GradeBandId | ''>('')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [hrbpCosign, setHrbpCosign] = useState(false)

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

  const confirmedEmployeeIds = useMemo(() => {
    const ids = new Set<number>()
    for (const person of sitting?.employees ?? []) {
      if (person.status === 'confirmed') ids.add(person.employeeId)
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

  const cleanPendingConfirmIds = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            !row.isFlagged &&
            !row.isAdjusted &&
            !confirmedEmployeeIds.has(row.employeeId),
        )
        .map((row) => row.employeeId),
    [rows, confirmedEmployeeIds],
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
    if (columnId === 'prior') return `${priorYearLabel} Rating`
    if (columnId === 'q1') return quarterColumnLabels[0] || fallback
    if (columnId === 'q2') return quarterColumnLabels[1] || fallback
    if (columnId === 'q3') return quarterColumnLabels[2] || fallback
    if (columnId === 'q4') return quarterColumnLabels[3] || fallback
    return fallback
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

  const filteredRows = useMemo(
    () =>
      filterRatingTableRows(rows, {
        quickFilter,
        department: departments,
        team: teams,
        market: markets,
        jobLevel: jobLevels,
        manager: managers.length > 0 ? managers : undefined,
      }),
    [rows, quickFilter, departments, teams, markets, jobLevels, managers],
  )

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
      ].join('|'),
    [quickFilter, departments, teams, markets, jobLevels, managers],
  )
  const tableFilterReady = useRef(false)
  const [tableEnterKey, setTableEnterKey] = useState(0)

  useEffect(() => {
    if (!tableFilterReady.current) {
      tableFilterReady.current = true
      return
    }
    setTableEnterKey((current) => current + 1)
  }, [tableFilterSignature])

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
        label: 'Developing & below',
        value: developingBelow,
        icon: TrendingDown,
      },
      {
        id: 'exceeding_above' as const,
        label: 'Exceeding & above',
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
    const defs: Array<{ id: RatingTableColumnId; grow?: boolean }> = [
      { id: 'employee', grow: true },
      { id: 'department' },
      { id: 'team' },
      { id: 'market' },
      { id: 'jobGrade' },
      { id: 'manager' },
      { id: 'calibrationStatus' },
      { id: 'q1' },
      { id: 'q2' },
      { id: 'q3' },
      { id: 'q4' },
      { id: 'qAvg' },
      { id: 'annual' },
      { id: 'self' },
      { id: 'gap' },
      { id: 'prior' },
      { id: 'trend' },
      { id: 'joinDate' },
      { id: 'timeInGrade' },
      { id: 'lastPromo' },
      { id: 'pip' },
      { id: 'adjusted' },
      { id: 'notes' },
      { id: 'flags' },
      { id: 'action' },
    ]
    return defs
      .filter((column) => visibleSet.has(column.id))
      .map((column) => {
        const meta = RATING_TABLE_COLUMN_OPTIONS.find(
          (item) => item.id === column.id,
        )
        return {
          id: column.id,
          label: columnTitle(column.id, meta?.label ?? column.id),
          grow: column.grow,
        }
      })
  }, [visibleSet, priorYearLabel, quarterColumnLabels])

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
          : 'Could not record this grade change.',
      )
    }
  }

  async function confirmClean() {
    setConfirmingClean(true)
    setActionError(null)
    const cleanEmployeeIds =
      cleanPendingConfirmIds.length > 0
        ? cleanPendingConfirmIds
        : rows
            .filter((row) => !row.isFlagged && !row.isAdjusted)
            .map((row) => row.employeeId)
    try {
      setSitting(await confirmCalibrationClean(cycle.id, cleanEmployeeIds))
      setConfirmCleanOpen(false)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Could not confirm the clean ratings.',
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
    setOverrideRow(row)
    setOverrideGrade(row.annualGrade ?? '')
    setOverrideReason('')
    setOverrideError(null)
    setHrbpCosign(false)
  }

  async function saveOverride() {
    if (!overrideRow?.packetId || !overrideGrade || !overrideReason.trim()) return
    const needsCosign = requiresHrbpCosign(overrideRow.annualGrade, overrideGrade)
    if (needsCosign && !hrbpCosign) {
      setOverrideError(
        'This is a 3+ tier change. Confirm HRBP co-sign before saving.',
      )
      return
    }
    setOverrideSaving(true)
    setOverrideError(null)
    try {
      const next = await calibrateReviewPacket(overrideRow.packetId, {
        toGrade: overrideGrade,
        reason: reasonWithHrbpCosign(overrideReason, needsCosign),
      })
      onPacketUpdated(next)
      void rememberAdjusted(overrideRow.employeeId)
      setOverrideRow(null)
      setHrbpCosign(false)
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
        description="Add people to this cycle’s groups to build the rating table."
      />
    )
  }

  return (
    <section className="pd-cal-rt" aria-label="Employee rating table">
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Calibration rating totals"
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
                  title={`${progress.clean} of ${progress.total} clean`}
                >
                  {cleanShare}% clean
                </span>
              ) : null}
            </div>
            {progress.total === 0 ? (
              <p className="pd-cal-rt__progress-summary">
                No employees in this sitting yet.
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
          {canAssignCalibrators ? (
            <div className="pd-cal-rt__progress-actions">
              <button
                type="button"
                className="pd-people__ghost-btn pd-people__ghost-btn--outline"
                onClick={() => {
                  setActionError(null)
                  setConfirmCleanOpen(true)
                }}
                disabled={
                  sitting == null ||
                  Boolean(sitting.lockedAt) ||
                  cleanPendingConfirmIds.length === 0 ||
                  confirmingClean
                }
              >
                <Check size={16} strokeWidth={1.75} aria-hidden />
                {sitting?.cleanConfirmedAt && cleanPendingConfirmIds.length > 0
                  ? `Confirm remaining (${cleanPendingConfirmIds.length})`
                  : 'Confirm all clean'}
              </button>
              <button
                type="button"
                className="pd-people__ghost-btn"
                onClick={() => {
                  setSelectedEmployeeId(null)
                  setCalibratorsOpen(true)
                }}
              >
                <Users size={16} strokeWidth={1.75} aria-hidden />
                Assign calibrators
              </button>
            </div>
          ) : null}
        </div>

        <div
          className="pd-cal-rt__bar"
          role="img"
          aria-label={`${progress.flagged} flagged, ${progress.adjusted} adjusted, ${progress.clean} clean`}
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

        <div
          className="pd-cal-rt__legend"
          role="group"
          aria-label="Progress breakdown"
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
            Export CSV
          </button>
        </div>
      </div>

      <div
        className="pd-cal-rt__chips"
        role="toolbar"
        aria-label="Quick filters"
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
            description="Try a different filter or reset the table filters."
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
              storageKey="calibration-rating-table-v3"
              columns={tableColumns}
              fitKey={`${visibleColumnIds.join('|')}:${filteredRows.length}`}
            >
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.employeeId}
                    className={cx(
                      row.isFlagged && 'is-flagged',
                      row.isAdjusted && 'is-adjusted',
                    )}
                  >
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
                          onClick={() => setSelectedEmployeeId(row.employeeId)}
                        >
                          {row.fullName}
                        </button>
                      </span>
                    </td>
                  ) : null}
                  {visibleSet.has('department') ? (
                    <td>{row.department}</td>
                  ) : null}
                  {visibleSet.has('team') ? <td>{row.team}</td> : null}
                  {visibleSet.has('market') ? <td>{row.market}</td> : null}
                  {visibleSet.has('jobGrade') ? <td>{row.jobGrade}</td> : null}
                  {visibleSet.has('manager') ? (
                    <td>
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
                  {visibleSet.has('annual') ? (
                    <td>
                      <GradePill grade={row.annualGrade} />
                    </td>
                  ) : null}
                  {visibleSet.has('self') ? (
                    <td>
                      <GradePill grade={row.selfGrade} />
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
                  {visibleSet.has('adjusted') ? (
                    <td className="pd-cal-rt__center">
                      {row.isAdjusted ? (
                        <span className="pd-cal-rt__adjusted-yes" title="Adjusted this session">
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
                        <span
                          className="pd-cal-rt__notes"
                          title={row.sessionNotes}
                        >
                          <StickyNote size={14} strokeWidth={2.25} aria-hidden />
                          <span className="pd-sr-only">Has notes</span>
                        </span>
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
                              ? `1 flag for ${row.fullName}. View details.`
                              : `${row.flags.length} flags for ${row.fullName}. View details.`
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
                  {visibleSet.has('action') ? (
                    <td>
                      <button
                        type="button"
                        className="pd-people__ghost-btn pd-people__ghost-btn--outline pd-cal-rt__override-btn"
                        disabled={
                          !row.packetId ||
                          Boolean(sitting?.lockedAt) ||
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
                          })
                        }
                        onClick={() => openOverride(row)}
                      >
                        <PenLine size={15} strokeWidth={1.75} aria-hidden />
                        Override
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </ResizableTable>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCleanOpen}
        onClose={() => {
          if (confirmingClean) return
          setConfirmCleanOpen(false)
        }}
        onConfirm={() => {
          if (confirmingClean) return
          void confirmClean()
        }}
        title="Confirm ratings with no flags?"
        description={
          cleanPendingConfirmIds.length === 1
            ? '1 person with no flags will be marked Confirmed. Flagged people stay unchanged.'
            : `${cleanPendingConfirmIds.length} people with no flags will be marked Confirmed. Flagged people stay unchanged.`
        }
        confirmLabel={
          confirmingClean
            ? 'Confirming…'
            : cleanPendingConfirmIds.length === 1
              ? 'Confirm 1 person'
              : `Confirm ${cleanPendingConfirmIds.length} people`
        }
        cancelLabel="Cancel"
      />

      <Modal
        open={flagRow != null}
        onClose={() => setFlagRow(null)}
        title={flagRow ? `Flags · ${flagRow.fullName}` : 'Flags'}
        description="Calibration indicators that include this person."
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
          <p className="pd-cal-rt__muted">No flags.</p>
        )}
      </Modal>

      <Modal
        open={overrideRow != null}
        onClose={() => {
          if (overrideSaving) return
          setOverrideRow(null)
        }}
        title={
          overrideRow ? `Override · ${overrideRow.fullName}` : 'Override rating'
        }
        description="A written reason is required. The person’s manager is notified."
        actions={
          <>
            <button
              type="button"
              className="pd-btn pd-btn--ghost pd-btn--sm pd-btn--pill"
              disabled={overrideSaving}
              onClick={() => setOverrideRow(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pd-btn pd-btn--primary pd-btn--sm pd-btn--pill"
              disabled={
                overrideSaving ||
                !overrideGrade ||
                !overrideReason.trim() ||
                !overrideRow?.packetId ||
                (Boolean(overrideRow) &&
                  requiresHrbpCosign(
                    overrideRow.annualGrade,
                    overrideGrade || null,
                  ) &&
                  !hrbpCosign)
              }
              onClick={() => {
                void saveOverride()
              }}
            >
              {overrideSaving ? 'Saving…' : 'Save override'}
            </button>
          </>
        }
      >
        {overrideRow ? (
          <div className="pd-cal-rt__override">
            <p className="pd-cal-rt__override-current">
              Current: {gradeLabel(overrideRow.annualGrade)}
              {overrideRow.selfGrade
                ? ` · Self: ${gradeLabel(overrideRow.selfGrade)}`
                : ''}
            </p>
            <label className="pd-cal-rt__override-field">
              <span>Calibrated grade</span>
              <ListboxSelect
                value={overrideGrade}
                onValueChange={(value) => {
                  setOverrideGrade((value as GradeBandId) || '')
                  setHrbpCosign(false)
                  setOverrideError(null)
                }}
                options={OVERALL_GRADE_ORDER.map((id) => ({
                  value: id,
                  label: GRADE_BAND_META[id].label,
                }))}
                allowEmpty={false}
                portal={false}
                aria-label="Calibrated grade"
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
            {overrideRow &&
              requiresHrbpCosign(overrideRow.annualGrade, overrideGrade || null) ? (
              <label className="pd-cal-rt__cosign">
                <input
                  type="checkbox"
                  checked={hrbpCosign}
                  onChange={(event) => setHrbpCosign(event.target.checked)}
                />
                <span>
                  This is a 3+ tier change. Flag for HRBP co-sign and continue.
                </span>
              </label>
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
          onClose={() => setCalibratorsOpen(false)}
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
          onClose={() => setSelectedEmployeeId(null)}
          onPacketUpdated={onPacketUpdated}
          sittingEmployee={
            sitting?.employees.find(
              (person) => person.employeeId === selectedRow.employeeId,
            ) ?? null
          }
          sittingReady={sitting != null}
          sessionLocked={Boolean(sitting?.lockedAt)}
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
          })}
          onSittingSaved={setSitting}
          onRatingAdjusted={() => void rememberAdjusted(selectedRow.employeeId)}
        />
      ) : null}
    </section>
  )
}
