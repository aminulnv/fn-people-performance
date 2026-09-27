import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { Avatar, ListboxSelect, Pagination } from '@/components/ui'
import { officialGrade } from '@/lib/analytics/dashboard'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'
import { HintIcon } from '@/pages/reviews/HintIcon'
import {
  ColumnMultiSelectFilter,
  ColumnNumericRangeFilter,
  EMPTY_NUMERIC_RANGE_FILTER,
  matchesNumericRangeFilter,
  type ColumnFilterOption,
  type NumericRangeFilter,
} from '@/pages/reviews/GroupMembersEditor'
import {
  HEATMAP_BAND_ORDER,
  heatmapBandLabel,
  heatmapIntensity,
  type HeatmapCell,
  type ManagerHeatmapRow,
  type ManagerRatingHeatmap,
} from '@/lib/calibration/managerHeatmap'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import type { GradeBandId, ReviewPacket } from '@/lib/reviews/types'
import { cx } from '@/lib/cx'
import {
  CalibrationPeopleListPanel,
  type CalibrationListPerson,
} from '@/pages/calibration/CalibrationPeopleListPanel'

const HEATMAP_HINT = (
  <ul className="pd-help-tip">
    <li>
      <strong>Cells</strong>
      Share of that manager’s graded team. Band colour intensity = share %.
      Click a cell to open the people in that band.
    </li>
    <li>
      <strong>Outline</strong>
      Outlier: &gt;40% of team at Developing & below (red), or &gt;60% at
      Exceeding & above (green).
    </li>
    <li>
      <strong>Team avg / Vs org</strong>
      Mean score from 1–5, compared with the cycle overall.
    </li>
  </ul>
)

const PAGE_SIZE_KEY = 'pd-cal-heatmap-page-size'
const DEFAULT_PAGE_SIZE = 15
const PAGE_SIZE_ALL = 'all' as const
const EMPTY_FILTER_SELECTION: string[] = []

const PAGE_SIZE_OPTIONS = [
  { value: '15', label: '15' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: PAGE_SIZE_ALL, label: 'All' },
] as const

type HeatmapPageSize = number | typeof PAGE_SIZE_ALL

type CategoricalColumnId = 'manager' | 'vsOrg'
type NumericColumnId = GradeBandId | 'teamAvg'
type HeatmapColumnId = CategoricalColumnId | NumericColumnId

const CATEGORICAL_COLUMN_IDS: CategoricalColumnId[] = ['manager', 'vsOrg']

function isHeatmapPageSize(value: string | null): value is `${number}` | typeof PAGE_SIZE_ALL {
  return (
    value === PAGE_SIZE_ALL ||
    value === '15' ||
    value === '25' ||
    value === '50'
  )
}

function readHeatmapPageSize(): HeatmapPageSize {
  try {
    const stored = localStorage.getItem(PAGE_SIZE_KEY)
    if (!isHeatmapPageSize(stored)) return DEFAULT_PAGE_SIZE
    return stored === PAGE_SIZE_ALL ? PAGE_SIZE_ALL : Number(stored)
  } catch {
    return DEFAULT_PAGE_SIZE
  }
}

function writeHeatmapPageSize(size: HeatmapPageSize) {
  try {
    localStorage.setItem(PAGE_SIZE_KEY, String(size))
  } catch {
    /* ignore quota / private mode */
  }
}

function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? 'employee' : 'employees'}`
}

function formatDelta(delta: number): string {
  const rounded = Math.round(delta * 100) / 100
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}`
}

function vsOrgValue(row: ManagerHeatmapRow): string {
  if (row.vsOrgKind == null) return '—'
  if (row.vsOrgKind === 'on') return '≈ On avg'
  if (row.vsOrgKind === 'above') return '↑ Above avg'
  return '↓ Below avg'
}

function categoricalValue(
  row: ManagerHeatmapRow,
  columnId: CategoricalColumnId,
): string {
  if (columnId === 'manager') return row.managerName
  return vsOrgValue(row)
}

function numericValue(
  row: ManagerHeatmapRow,
  columnId: NumericColumnId,
): number | null {
  if (columnId === 'teamAvg') return row.averageScore
  const cell = row.cells.find((entry) => entry.bandId === columnId)
  if (!cell) return null
  return cell.percent
}

function columnTitle(columnId: HeatmapColumnId): string {
  if (columnId === 'manager') return 'Manager'
  if (columnId === 'teamAvg') return 'Team Avg'
  if (columnId === 'vsOrg') return 'Vs Org'
  return heatmapBandLabel(columnId)
}

function VsOrgCell({ row }: { row: ManagerHeatmapRow }) {
  if (row.vsOrgKind == null || row.vsOrgDelta == null) {
    return <span className="pd-cal-heat__dash">—</span>
  }
  const label =
    row.vsOrgKind === 'on'
      ? '≈ On avg'
      : row.vsOrgKind === 'above'
        ? '↑ Above avg'
        : '↓ Below avg'
  return (
    <span className={cx('pd-cal-heat__vs', `is-${row.vsOrgKind}`)}>
      <span className="pd-cal-heat__vs-label">{label}</span>
      <span className="pd-cal-heat__vs-delta">{formatDelta(row.vsOrgDelta)}</span>
    </span>
  )
}

function listPersonFromIds(
  employeeIds: readonly number[],
  employeeById: ReadonlyMap<number, PlatformEmployee>,
  packetByEmployeeId: ReadonlyMap<number, ReviewPacket>,
): CalibrationListPerson[] {
  return employeeIds.flatMap((employeeId) => {
    const employee = employeeById.get(employeeId)
    if (!employee) return []
    const packet = packetByEmployeeId.get(employeeId)
    return [
      {
        employeeId,
        fullName: employee.fullName,
        avatarUrl: employee.avatarUrl || undefined,
        metaLine: [employee.department, employee.site, employee.jobGrade]
          .map((value) => value.trim())
          .filter(Boolean)
          .join(' · '),
        finalGrade: officialGrade(packet) ?? null,
        selfGrade: packet?.selfOverallGrade ?? null,
        gapTiers: null,
      },
    ]
  })
}

export function ManagerRatingHeatmap({
  heatmap,
  employees,
  packets,
  onSelectEmployee,
}: {
  heatmap: ManagerRatingHeatmap
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  onSelectEmployee: (employeeId: number) => void
}) {
  const [pageSize, setPageSize] = useState<HeatmapPageSize>(readHeatmapPageSize)
  const [page, setPage] = useState(1)
  const [categoricalFilters, setCategoricalFilters] = useState<
    Partial<Record<CategoricalColumnId, string[]>>
  >({})
  const [numericFilters, setNumericFilters] = useState<
    Partial<Record<NumericColumnId, NumericRangeFilter>>
  >({})
  const [cellList, setCellList] = useState<{
    title: string
    subtitle: string
    people: CalibrationListPerson[]
  } | null>(null)

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.employeeId, employee])),
    [employees],
  )
  const packetByEmployeeId = useMemo(
    () => new Map(packets.map((packet) => [packet.employeeId, packet])),
    [packets],
  )

  function openCellPeople(row: ManagerHeatmapRow, cell: HeatmapCell) {
    if (cell.employeeIds.length === 0) return
    if (cell.employeeIds.length === 1) {
      onSelectEmployee(cell.employeeIds[0]!)
      return
    }
    setCellList({
      title: 'Manager band',
      subtitle: `${row.managerName} · ${heatmapBandLabel(cell.bandId)}`,
      people: listPersonFromIds(
        cell.employeeIds,
        employeeById,
        packetByEmployeeId,
      ),
    })
  }

  const categoricalFilterOptions = useMemo(() => {
    const entries = CATEGORICAL_COLUMN_IDS.map((columnId) => {
      const values = [
        ...new Set(
          heatmap.rows.map((row) => categoricalValue(row, columnId)),
        ),
      ].sort((left, right) => left.localeCompare(right))
      return [
        columnId,
        values.map((value): ColumnFilterOption => ({ value, label: value })),
      ] as const
    })
    return Object.fromEntries(entries) as Record<
      CategoricalColumnId,
      ColumnFilterOption[]
    >
  }, [heatmap.rows])

  const filteredRows = useMemo(
    () =>
      heatmap.rows.filter((row) => {
        const passesCategorical = (
          Object.entries(categoricalFilters) as [
            CategoricalColumnId,
            string[],
          ][]
        ).every(
          ([columnId, selected]) =>
            selected.length === 0 ||
            selected.includes(categoricalValue(row, columnId)),
        )
        if (!passesCategorical) return false
        return (
          Object.entries(numericFilters) as [
            NumericColumnId,
            NumericRangeFilter,
          ][]
        ).every(([columnId, filter]) =>
          matchesNumericRangeFilter(numericValue(row, columnId), filter),
        )
      }),
    [categoricalFilters, heatmap.rows, numericFilters],
  )

  const totalRows = filteredRows.length
  const sourceTotal = heatmap.rows.length
  const effectivePageSize =
    pageSize === PAGE_SIZE_ALL ? Math.max(totalRows, 1) : pageSize
  const pageCount =
    totalRows === 0 ? 0 : Math.ceil(totalRows / effectivePageSize)
  const safePage = pageCount === 0 ? 1 : Math.min(page, pageCount)
  const pageStart = (safePage - 1) * effectivePageSize
  const visibleRows =
    pageSize === PAGE_SIZE_ALL
      ? filteredRows
      : filteredRows.slice(pageStart, pageStart + effectivePageSize)
  const rangeStart = totalRows === 0 ? 0 : pageStart + 1
  const rangeEnd = Math.min(pageStart + effectivePageSize, totalRows)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  useEffect(() => {
    setPage(1)
  }, [categoricalFilters, numericFilters])

  function handlePageSizeChange(nextValue: string) {
    if (!isHeatmapPageSize(nextValue)) return
    const next: HeatmapPageSize =
      nextValue === PAGE_SIZE_ALL ? PAGE_SIZE_ALL : Number(nextValue)
    setPageSize(next)
    writeHeatmapPageSize(next)
    setPage(1)
  }

  const setCategoricalFilter = useCallback(
    (columnId: CategoricalColumnId, values: string[]) => {
      setCategoricalFilters((current) => ({ ...current, [columnId]: values }))
    },
    [],
  )

  const setNumericFilter = useCallback(
    (columnId: NumericColumnId, next: NumericRangeFilter) => {
      setNumericFilters((current) => ({ ...current, [columnId]: next }))
    },
    [],
  )

  const renderColumnHeading = useCallback(
    (columnId: HeatmapColumnId) => {
      const title = columnTitle(columnId)
      if (columnId === 'manager' || columnId === 'vsOrg') {
        return (
          <span className="pd-cycle-groups-members__column-heading">
            {title}
            <ColumnMultiSelectFilter
              label={title}
              options={categoricalFilterOptions[columnId]}
              selected={categoricalFilters[columnId] ?? EMPTY_FILTER_SELECTION}
              onChange={(values) => setCategoricalFilter(columnId, values)}
            />
          </span>
        )
      }
      return (
        <span className="pd-cycle-groups-members__column-heading">
          {title}
          <ColumnNumericRangeFilter
            label={title}
            unit={columnId === 'teamAvg' ? undefined : '%'}
            value={numericFilters[columnId] ?? EMPTY_NUMERIC_RANGE_FILTER}
            onChange={(next) => setNumericFilter(columnId, next)}
          />
        </span>
      )
    },
    [
      categoricalFilterOptions,
      categoricalFilters,
      numericFilters,
      setCategoricalFilter,
      setNumericFilter,
    ],
  )

  return (
    <section className="pd-cal-heat" aria-label="Manager rating heatmap">
      <header className="pd-cal-heat__head">
        <h2 className="pd-cal-heat__title">
          <span className="pd-cal-heat__step" aria-hidden>
            3
          </span>
          Manager Rating Heatmap
          <HintIcon content={HEATMAP_HINT} label="About manager rating heatmap" />
        </h2>
      </header>

      <div className="pd-cal-heat__scroller">
        <table className="pd-cal-heat__table">
          <thead>
            <tr>
              <th scope="col">{renderColumnHeading('manager')}</th>
              {HEATMAP_BAND_ORDER.map((bandId) => (
                <th key={bandId} scope="col">
                  {renderColumnHeading(bandId)}
                </th>
              ))}
              <th scope="col">{renderColumnHeading('teamAvg')}</th>
              <th scope="col">{renderColumnHeading('vsOrg')}</th>
            </tr>
          </thead>
          <tbody>
            {sourceTotal === 0 ? (
              <tr>
                <td
                  className="pd-cal-heat__empty"
                  colSpan={HEATMAP_BAND_ORDER.length + 3}
                >
                  No graded manager teams in this cycle yet. Rows appear once
                  reports have an official grade.
                </td>
              </tr>
            ) : totalRows === 0 ? (
              <tr>
                <td
                  className="pd-cal-heat__empty"
                  colSpan={HEATMAP_BAND_ORDER.length + 3}
                >
                  No managers match the current column filters.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={row.managerEmployeeId}>
                  <th scope="row">
                    <span className="pd-cal-heat__manager">
                      <Avatar
                        name={row.managerName}
                        src={row.managerAvatarUrl || undefined}
                        size="sm"
                        style={avatarStyle(row.managerName)}
                      />
                      <span className="pd-cal-heat__manager-copy">
                        <span className="pd-cal-heat__manager-name">
                          {row.managerName}
                        </span>
                        <span className="pd-cal-heat__manager-meta">
                          <Users size={11} strokeWidth={2.25} aria-hidden />
                          {peopleLabel(row.teamSize)}
                        </span>
                      </span>
                    </span>
                  </th>
                  {row.cells.map((cell) => {
                    const intensity = heatmapIntensity(cell.percent, cell.count)
                    const title =
                      cell.count > 0
                        ? `${cell.percent}% · ${cell.count} ${cell.count === 1 ? 'person' : 'people'}`
                        : 'No people in this band'
                    const cellClass = cx(
                      'pd-cal-heat__cell',
                      `is-${cell.bandId}`,
                      `is-i${intensity}`,
                      cell.outlier && 'is-outlier',
                      cell.count > 0 && 'is-clickable',
                    )
                    const body =
                      cell.count > 0 ? (
                        <>
                          <strong>{cell.percent}%</strong>
                          <em>
                            <Users size={10} strokeWidth={2.25} aria-hidden />
                            {cell.count}
                          </em>
                        </>
                      ) : (
                        <span className="pd-cal-heat__dash">—</span>
                      )
                    return (
                      <td key={cell.bandId}>
                        {cell.count > 0 ? (
                          <button
                            type="button"
                            className={cellClass}
                            title={title}
                            aria-label={`${heatmapBandLabel(cell.bandId)} for ${row.managerName}: ${title}. Open people.`}
                            onClick={() => openCellPeople(row, cell)}
                          >
                            {body}
                          </button>
                        ) : (
                          <span className={cellClass} title={title}>
                            {body}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td>
                    {row.averageScore != null && row.averageBand ? (
                      <span
                        className={cx(
                          'pd-cal-heat__avg',
                          `is-${row.averageBand}`,
                        )}
                      >
                        <span className="pd-cal-heat__avg-score">
                          {row.averageScore.toFixed(1)}
                        </span>
                        <span className="pd-cal-heat__avg-band">
                          {GRADE_BAND_META[row.averageBand].label}
                        </span>
                      </span>
                    ) : (
                      <span className="pd-cal-heat__dash">—</span>
                    )}
                  </td>
                  <td>
                    <VsOrgCell row={row} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sourceTotal > 0 ? (
        <footer className="pd-cal-heat__pager">
          <label className="pd-cal-heat__page-size">
            <span className="pd-cal-heat__page-size-label">Rows per page</span>
            <ListboxSelect
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
              options={[...PAGE_SIZE_OPTIONS]}
              allowEmpty={false}
              aria-label="Rows per page"
            />
          </label>
          <p className="pd-cal-heat__range" aria-live="polite">
            {rangeStart}–{rangeEnd} of {totalRows}
          </p>
          {pageCount > 1 ? (
            <Pagination
              page={safePage}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          ) : null}
        </footer>
      ) : null}

      {cellList ? (
        <CalibrationPeopleListPanel
          title={cellList.title}
          subtitle={cellList.subtitle}
          people={cellList.people}
          onClose={() => setCellList(null)}
          onSelectPerson={(employeeId) => {
            setCellList(null)
            onSelectEmployee(employeeId)
          }}
        />
      ) : null}
    </section>
  )
}
