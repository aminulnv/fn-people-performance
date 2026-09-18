import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Flag,
  Scale,
  Users,
} from 'lucide-react'
import {
  ColumnVisibility,
  EmptyState,
  ListboxSelect,
  Modal,
  ResizableTable,
  Textarea,
  type ColumnVisibilityOption,
  type ResizableColumn,
} from '@/components/ui'
import { cx } from '@/lib/cx'
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
import {
  confirmCalibrationClean,
  fetchCalibrationSitting,
  saveCalibrationSittingEmployee,
  type CalibrationSitting,
} from '@/lib/calibration/sessionApi'
import {
  RATING_TABLE_COLUMN_OPTIONS,
  RATING_TABLE_QUICK_FILTERS,
  GRADE_SHORT_LABEL,
  buildEmployeeRatingRows,
  defaultVisibleColumnIds,
  filterRatingTableRows,
  formatGapLabel,
  gradeLabel,
  ratingTableCsv,
  ratingTableProgress,
  uniqueSortedValues,
  type RatingTableColumnId,
  type RatingTableQuickFilterId,
  type RatingTableRow,
} from '@/lib/calibration/ratingTable'
import { CalibrationEmployeeDrawer } from '@/pages/calibration/CalibrationEmployeeDrawer'

type EmployeeRatingTableProps = {
  cycle: ReviewCycle
  cycles: readonly ReviewCycle[]
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  previousPackets: readonly ReviewPacket[]
  historyPackets: readonly (readonly ReviewPacket[])[]
  linkedPacketsByCycleId: ReadonlyMap<string, readonly ReviewPacket[]>
  indicators: readonly CalibrationIndicator[]
  onPacketUpdated: (packet: ReviewPacket) => void
}

function GradePill({
  grade,
  compact = false,
}: {
  grade: GradeBandId | null
  compact?: boolean
}) {
  if (!grade) return <span className="pd-cal-rt__muted">—</span>
  return (
    <span
      className={cx(
        'pd-cal-rt__grade',
        `is-${grade}`,
        compact && 'is-compact',
      )}
      title={GRADE_BAND_META[grade].label}
    >
      {compact ? GRADE_SHORT_LABEL[grade] : GRADE_BAND_META[grade].label}
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
  if (!trend) return <span className="pd-cal-rt__muted">—</span>
  if (trend === 'up') {
    return (
      <span className="pd-cal-rt__trend is-up" title="Up vs prior">
        <ArrowUpRight size={15} strokeWidth={2.25} aria-hidden />
        <span className="pd-sr-only">Up</span>
      </span>
    )
  }
  if (trend === 'down') {
    return (
      <span className="pd-cal-rt__trend is-down" title="Down vs prior">
        <ArrowDownRight size={15} strokeWidth={2.25} aria-hidden />
        <span className="pd-sr-only">Down</span>
      </span>
    )
  }
  return (
    <span className="pd-cal-rt__trend is-flat" title="Flat vs prior">
      <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
      <span className="pd-sr-only">Flat</span>
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
  onPacketUpdated,
}: EmployeeRatingTableProps) {
  const [quickFilter, setQuickFilter] =
    useState<RatingTableQuickFilterId>('all')
  const [department, setDepartment] = useState('')
  const [market, setMarket] = useState('')
  const [jobGrade, setJobGrade] = useState('')
  const [manager, setManager] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null,
  )
  const [sitting, setSitting] = useState<CalibrationSitting | null>(null)
  const [confirmingClean, setConfirmingClean] = useState(false)
  const [flagRow, setFlagRow] = useState<RatingTableRow | null>(null)
  const [overrideRow, setOverrideRow] = useState<RatingTableRow | null>(null)
  const [overrideGrade, setOverrideGrade] = useState<GradeBandId | ''>('')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)

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

  useEffect(() => {
    let cancelled = false
    setSitting(null)
    void fetchCalibrationSitting(cycle.id)
      .then((next) => {
        if (!cancelled) setSitting(next)
      })
      .catch(() => {
        if (!cancelled) {
          setSitting({
            cycleId: cycle.id,
            cleanConfirmedAt: null,
            employees: [],
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [cycle.id])

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
      adjustedEmployeeIds,
    ],
  )

  const priorYearLabel = rows[0]?.priorYearLabel ?? 'Prior'

  const resolvedColumnOptions = useMemo<ColumnVisibilityOption[]>(
    () =>
      RATING_TABLE_COLUMN_OPTIONS.filter(
        (column) => !column.annualOnly || hasQuarters,
      ).map((column) => ({
        id: column.id,
        label:
          column.id === 'prior' ? `${priorYearLabel} Rating` : column.label,
        required: column.required,
      })),
    [hasQuarters, priorYearLabel],
  )

  const filterOptions = useMemo(() => {
    return {
      departments: uniqueSortedValues(rows.map((row) => row.department)),
      markets: uniqueSortedValues(rows.map((row) => row.market)),
      jobGrades: uniqueSortedValues(rows.map((row) => row.jobGrade)),
      managers: uniqueSortedValues(rows.map((row) => row.managerName)),
    }
  }, [rows])

  const filteredRows = useMemo(
    () =>
      filterRatingTableRows(rows, {
        quickFilter,
        department: department || undefined,
        market: market || undefined,
        jobGrade: jobGrade || undefined,
        manager: manager || undefined,
      }),
    [rows, quickFilter, department, market, jobGrade, manager],
  )

  const progress = useMemo(() => ratingTableProgress(rows), [rows])
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
      { id: 'market' },
      { id: 'jobGrade' },
      { id: 'manager' },
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
      { id: 'flags' },
      { id: 'action' },
    ]
    return defs
      .filter((column) => visibleSet.has(column.id))
      .map((column) => {
        const meta = RATING_TABLE_COLUMN_OPTIONS.find(
          (item) => item.id === column.id,
        )
        const label =
          column.id === 'prior'
            ? `${priorYearLabel} Rating`
            : (meta?.label ?? column.id)
        return {
          id: column.id,
          label,
          grow: column.grow,
        }
      })
  }, [visibleSet, priorYearLabel])

  const hasActiveAttributeFilters = Boolean(
    department || market || jobGrade || manager,
  )

  function resetFilters() {
    setDepartment('')
    setMarket('')
    setJobGrade('')
    setManager('')
    setQuickFilter('all')
  }

  async function rememberAdjusted(employeeId: number) {
    setSitting((current) => {
      const base: CalibrationSitting = current ?? {
        cycleId: cycle.id,
        cleanConfirmedAt: null,
        employees: [],
      }
      const employees = base.employees.some(
        (person) => person.employeeId === employeeId,
      )
        ? base.employees.map((person) =>
            person.employeeId === employeeId
              ? { ...person, adjustedAt: person.adjustedAt ?? new Date().toISOString() }
              : person,
          )
        : [
            ...base.employees,
            {
              employeeId,
              status: 'not_reviewed' as const,
              notes: '',
              adjustedAt: new Date().toISOString(),
            },
          ]
      return { ...base, employees }
    })
    try {
      const next = await saveCalibrationSittingEmployee(cycle.id, employeeId, {
        adjusted: true,
      })
      setSitting(next)
    } catch {
      /* The grade is already saved. The count stays optimistic until reload. */
    }
  }

  async function confirmClean() {
    setConfirmingClean(true)
    try {
      setSitting(await confirmCalibrationClean(cycle.id))
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
  }

  async function saveOverride() {
    if (!overrideRow?.packetId || !overrideGrade) return
    setOverrideSaving(true)
    setOverrideError(null)
    try {
      const next = await calibrateReviewPacket(overrideRow.packetId, {
        toGrade: overrideGrade,
        reason: overrideReason.trim() || 'Calibration table override',
      })
      onPacketUpdated(next)
      void rememberAdjusted(overrideRow.employeeId)
      setOverrideRow(null)
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
      <div className="pd-cal-rt__filters">
        <ListboxSelect
          value={department}
          onValueChange={setDepartment}
          options={filterOptions.departments.map((value) => ({
            value,
            label: value,
          }))}
          emptyLabel="All Departments"
          aria-label="Filter by department"
        />
        <ListboxSelect
          value={market}
          onValueChange={setMarket}
          options={filterOptions.markets.map((value) => ({
            value,
            label: value,
          }))}
          emptyLabel="All Markets"
          aria-label="Filter by market"
        />
        <ListboxSelect
          value={jobGrade}
          onValueChange={setJobGrade}
          options={filterOptions.jobGrades.map((value) => ({
            value,
            label: value,
          }))}
          emptyLabel="All Grades"
          aria-label="Filter by grade"
        />
        <ListboxSelect
          value={manager}
          onValueChange={setManager}
          options={filterOptions.managers.map((value) => ({
            value,
            label: value,
          }))}
          emptyLabel="All Managers"
          aria-label="Filter by manager"
          searchable
        />
        {hasActiveAttributeFilters || quickFilter !== 'all' ? (
          <button
            type="button"
            className="pd-people__ghost-btn"
            onClick={resetFilters}
          >
            Reset
          </button>
        ) : null}
      </div>

      <div className="pd-cal-rt__progress">
        <div className="pd-cal-rt__progress-copy">
          <h2 className="pd-cal-rt__progress-title">Calibration Progress</h2>
          <p className="pd-cal-rt__progress-summary">
            {progress.total} employees · {progress.flagged} flagged for
            discussion · {progress.adjusted} adjusted this session
            {sitting?.cleanConfirmedAt ? ' · clean confirmed' : ''}
          </p>
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
        <ul className="pd-cal-rt__legend">
          <li>
            <Flag size={12} strokeWidth={2.25} aria-hidden />
            {progress.flagged} flagged
          </li>
          <li>
            <span className="pd-cal-rt__legend-dot is-adjusted" aria-hidden />
            {progress.adjusted} adjusted
          </li>
          <li>
            <Check size={12} strokeWidth={2.25} aria-hidden />
            {progress.clean} clean
          </li>
        </ul>
        <div className="pd-cal-rt__progress-actions">
          <button
            type="button"
            className="pd-btn pd-btn--secondary pd-btn--sm pd-btn--pill"
            onClick={() => void confirmClean()}
            disabled={
              sitting == null ||
              progress.clean === 0 ||
              Boolean(sitting.cleanConfirmedAt) ||
              confirmingClean
            }
          >
            <Check size={14} strokeWidth={2} aria-hidden />
            Confirm all clean
          </button>
          <button
            type="button"
            className="pd-btn pd-btn--ghost pd-btn--sm pd-btn--pill"
            onClick={exportCsv}
          >
            <Download size={14} strokeWidth={2} aria-hidden />
            Export CSV
          </button>
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
          <p className="pd-cal-rt__hint">
            Click employee name for profile ·{' '}
            <Flag size={11} strokeWidth={2.25} aria-hidden /> = has flags ·
            Adjusted = overridden this session
          </p>
        </div>
        <ColumnVisibility
          columns={resolvedColumnOptions}
          visibleIds={visibleColumnIds}
          onChange={(next) =>
            setVisibleColumnIds(next as RatingTableColumnId[])
          }
          defaultVisibleIds={defaultVisibleColumnIds(hasQuarters)}
        />
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
            onClick={() => setQuickFilter(filter.id)}
          >
            {filter.id === 'flagged' ? (
              <Flag size={12} strokeWidth={2.25} aria-hidden />
            ) : null}
            {filter.label}
          </button>
        ))}
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          className="pd-people__empty-panel"
          icon={Users}
          title="No Matches"
          description="Try a different filter or reset the table filters."
        />
      ) : (
        <div className="pd-people__table-wrap pd-cal-rt__table-wrap">
          <ResizableTable
            className="pd-people__table pd-cal-rt__table"
            storageKey="calibration-rating-table-v1"
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
                    <td>
                      <button
                        type="button"
                        className="pd-cal-rt__name"
                        onClick={() => setSelectedEmployeeId(row.employeeId)}
                      >
                        {row.fullName}
                      </button>
                    </td>
                  ) : null}
                  {visibleSet.has('department') ? (
                    <td>{row.department}</td>
                  ) : null}
                  {visibleSet.has('market') ? <td>{row.market}</td> : null}
                  {visibleSet.has('jobGrade') ? <td>{row.jobGrade}</td> : null}
                  {visibleSet.has('manager') ? (
                    <td>{row.managerName}</td>
                  ) : null}
                  {visibleSet.has('q1') ? (
                    <td>
                      <GradePill grade={row.quarters[0]?.grade ?? null} compact />
                    </td>
                  ) : null}
                  {visibleSet.has('q2') ? (
                    <td>
                      <GradePill grade={row.quarters[1]?.grade ?? null} compact />
                    </td>
                  ) : null}
                  {visibleSet.has('q3') ? (
                    <td>
                      <GradePill grade={row.quarters[2]?.grade ?? null} compact />
                    </td>
                  ) : null}
                  {visibleSet.has('q4') ? (
                    <td>
                      <GradePill grade={row.quarters[3]?.grade ?? null} compact />
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
                    <td>
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
                  {visibleSet.has('flags') ? (
                    <td>
                      {row.isFlagged ? (
                        <button
                          type="button"
                          className="pd-cal-rt__flag-btn"
                          aria-label={`View flags for ${row.fullName}`}
                          onClick={() => setFlagRow(row)}
                        >
                          <Flag size={14} strokeWidth={2.25} aria-hidden />
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
                        className="pd-btn pd-btn--ghost pd-btn--sm"
                        disabled={!row.packetId}
                        onClick={() => openOverride(row)}
                      >
                        Override
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </ResizableTable>
        </div>
      )}

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
        description="Sets the calibrated overall grade for this packet."
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
              disabled={overrideSaving || !overrideGrade || !overrideRow?.packetId}
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
                onValueChange={(value) =>
                  setOverrideGrade((value as GradeBandId) || '')
                }
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
            {overrideError ? (
              <p className="pd-cal-rt__override-error" role="alert">
                {overrideError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

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
          onSittingSaved={setSitting}
          onRatingAdjusted={() => void rememberAdjusted(selectedRow.employeeId)}
        />
      ) : null}
    </section>
  )
}
