import {
  inGradeLabel,
  lastPromoLabel,
  pipStatusLabel,
} from '@/lib/employees/career'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  annualSourceLinks,
  gradeFromLinkedPacket,
} from '@/lib/reviews/annualQuarters'
import { cycleMemberIds } from '@/lib/reviews/cycleGroups'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import {
  findPeriod,
  formatShortDate,
  isHalfYearPeriodKey,
} from '@/lib/reviews/periods'
import { scoreForBand } from '@/lib/reviews/rollup'
import type {
  GradeBandId,
  ReviewCycle,
  ReviewPacket,
} from '@/lib/reviews/types'
import {
  CALIBRATION_SITTING_STATUS_LABEL,
  type CalibrationSittingEmployee,
  type CalibrationSittingStatus,
} from './sessionApi'
import {
  gradeTierDelta,
  previousCyclesOfSamePurpose,
  type CalibrationIndicator,
} from './indicators'

const JOB_LEVEL_ORDER = ['IC1', 'IC2', 'IC3+', 'Manager']

/**
 * Live calibrated / final grade for the rating table.
 * Does not fall back to self — calibration needs a manager rating first.
 */
export function calibrationFinalGrade(
  packet: Pick<
    ReviewPacket,
    'publishedOverallGrade' | 'calibratedOverallGrade' | 'managerOverallGrade'
  > | null | undefined,
): GradeBandId | null {
  if (!packet) return null
  return (
    packet.publishedOverallGrade ??
    packet.calibratedOverallGrade ??
    packet.managerOverallGrade ??
    null
  )
}

/** IC1, IC2, and IC3+ (IC3 and above). Manager grades stay in their own bucket. */
export function jobLevelOf(jobGrade: string): string {
  const compact = jobGrade.trim().toUpperCase().replace(/[\s_-]+/g, '')
  const individual = compact.match(/^IC(\d+)/)
  if (individual) {
    const level = Number(individual[1])
    if (level <= 1) return 'IC1'
    if (level === 2) return 'IC2'
    return 'IC3+'
  }
  if (/^(M\d|MGMT|MANAGER)/.test(compact)) return 'Manager'
  return jobGrade.trim() || '—'
}

export function sortJobLevels(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value && value !== '—'))].sort(
    (left, right) => {
      const leftRank = JOB_LEVEL_ORDER.indexOf(left)
      const rightRank = JOB_LEVEL_ORDER.indexOf(right)
      const leftOrder = leftRank === -1 ? JOB_LEVEL_ORDER.length : leftRank
      const rightOrder = rightRank === -1 ? JOB_LEVEL_ORDER.length : rightRank
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return left.localeCompare(right, undefined, { sensitivity: 'base' })
    },
  )
}

export const RATING_TABLE_QUICK_FILTERS = [
  { id: 'all', label: 'All Employees' },
  { id: 'flagged', label: 'Flagged Only' },
  { id: 'gap_2', label: 'Gap 2+ Tiers' },
  { id: 'developing_below', label: 'Developing & Below' },
  { id: 'exceeding_above', label: 'Exceeding & Above' },
  { id: 'previous_cycle_gap', label: '2+ From Previous Cycle' },
  { id: 'adjusted', label: 'Adjusted This Session' },
  { id: 'clean', label: 'Clean (No Flags)' },
] as const

export type RatingTableQuickFilterId =
  (typeof RATING_TABLE_QUICK_FILTERS)[number]['id']

export type RatingTableQuarter = {
  sourceCycleId: string
  label: string
  shortLabel: string
  grade: GradeBandId | null
}

export type RatingTableFlag = {
  id: string
  title: string
  definition: string
}

/** Signed grade-tier change vs the prior cycle. Positive is up, negative is down, 0 is flat. */
export type RatingTableTrend = number | null

export type RatingTableRow = {
  employeeId: number
  fullName: string
  avatarUrl: string
  department: string
  team: string
  market: string
  jobGrade: string
  jobLevel: string
  managerName: string
  managerAvatarUrl: string
  packetId: string | null
  quarters: RatingTableQuarter[]
  quarterAverageScore: number | null
  quarterAverageGrade: GradeBandId | null
  annualGrade: GradeBandId | null
  selfGrade: GradeBandId | null
  /** Manager review grade — unchanged by calibration overrides. */
  managerGrade: GradeBandId | null
  /**
   * Annual tier minus self tier.
   * Negative means self is higher than annual (shown as “−N Self”).
   */
  gapTiers: number | null
  priorGrade: GradeBandId | null
  /** Display label for the current cycle rating column (cycle name). */
  cycleLabel: string
  priorYearLabel: string
  trend: RatingTableTrend
  joinDateLabel: string
  timeInGradeLabel: string
  lastPromoLabel: string
  onPip: boolean
  calibrationStatus: CalibrationSittingStatus
  sessionNotes: string
  flags: RatingTableFlag[]
  isFlagged: boolean
  isAdjusted: boolean
}

export type RatingTableProgress = {
  total: number
  flagged: number
  adjusted: number
  clean: number
}

export type RatingTableColumnId =
  | 'employee'
  | 'manager'
  | 'department'
  | 'team'
  | 'market'
  | 'jobGrade'
  | 'annual'
  | 'self'
  | 'managerRating'
  | 'gap'
  | 'prior'
  | 'trend'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'qAvg'
  | 'joinDate'
  | 'timeInGrade'
  | 'lastPromo'
  | 'pip'
  | 'calibrationStatus'
  | 'adjusted'
  | 'notes'
  | 'flags'
  | 'action'

/** Catalog order = table/CSV column order. Keep in sync with EmployeeRatingTable. */
export const RATING_TABLE_COLUMN_OPTIONS: ReadonlyArray<{
  id: RatingTableColumnId
  label: string
  required?: boolean
  annualOnly?: boolean
}> = [
  // Identity & ownership
  { id: 'employee', label: 'Employee', required: true },
  { id: 'manager', label: 'Manager' },
  { id: 'department', label: 'Department' },
  { id: 'team', label: 'Team' },
  { id: 'market', label: 'Market' },
  { id: 'jobGrade', label: 'Job Grade' },
  // Career context
  { id: 'joinDate', label: 'Join Date' },
  { id: 'timeInGrade', label: 'Time In Grade' },
  { id: 'lastPromo', label: 'Last Promotion' },
  { id: 'pip', label: 'PIP' },
  // Sitting workflow
  { id: 'calibrationStatus', label: 'Status' },
  { id: 'adjusted', label: 'Adjusted' },
  { id: 'notes', label: 'Notes' },
  { id: 'flags', label: 'Flags' },
  // Decision ratings last (beside Override) — evidence first, then Self → Manager → live annual
  { id: 'gap', label: 'Gap' },
  { id: 'prior', label: 'Prior Rating' },
  { id: 'trend', label: 'Trend' },
  { id: 'q1', label: 'Q1', annualOnly: true },
  { id: 'q2', label: 'Q2', annualOnly: true },
  { id: 'q3', label: 'Q3', annualOnly: true },
  { id: 'q4', label: 'Q4', annualOnly: true },
  { id: 'qAvg', label: 'Quarter Average', annualOnly: true },
  { id: 'self', label: 'Self-Rating' },
  { id: 'managerRating', label: 'Manager Rating' },
  { id: 'annual', label: 'Final Rating' },
  { id: 'action', label: 'Action', required: true },
]

const BAND_NEAREST_ORDER: GradeBandId[] = [
  'unsatisfactory',
  'developing',
  'performing',
  'exceeding',
  'exceptional',
]

function quarterShortLabel(label: string, index: number): string {
  const match = label.match(/q\s*([1-4])/i)
  if (match) return `Q${match[1]}`
  return `Q${index + 1}`
}

function yearLabelFromCycle(
  cycle: Pick<ReviewCycle, 'yearKey' | 'startDate' | 'name' | 'periodKey'> | null | undefined,
): string {
  if (!cycle) return 'Prior'
  if (cycle.periodKey && isHalfYearPeriodKey(cycle.periodKey)) {
    return findPeriod(cycle.periodKey)?.label ?? cycle.name ?? 'Prior'
  }
  if (cycle.yearKey) return cycle.yearKey
  const year = cycle.startDate?.slice(0, 4)
  if (year) return year
  return cycle.name || 'Prior'
}

function averageQuarterScore(grades: readonly (GradeBandId | null)[]): {
  score: number | null
  grade: GradeBandId | null
} {
  const scores = grades
    .filter((grade): grade is GradeBandId => grade != null)
    .map((grade) => scoreForBand(grade))
  if (scores.length === 0) return { score: null, grade: null }
  const score =
    Math.round(
      (scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10,
    ) / 10
  const nearest = [...BAND_NEAREST_ORDER]
    .map((id) => ({ id, distance: Math.abs(scoreForBand(id) - score) }))
    .sort((left, right) => left.distance - right.distance)[0]
  return { score, grade: nearest?.id ?? null }
}

function trendBetween(
  prior: GradeBandId | null,
  current: GradeBandId | null,
): RatingTableTrend {
  return gradeTierDelta(prior, current)
}

/** Arrow plus tier count, matching the calibration dashboard trend cell. */
export function formatRatingTrend(trend: RatingTableTrend): string {
  if (trend == null) return ''
  if (trend > 0) return `↑${trend}`
  if (trend < 0) return `↓${Math.abs(trend)}`
  return '→'
}

export function buildEmployeeRatingRows(input: {
  cycle: ReviewCycle
  cycles: readonly ReviewCycle[]
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  previousPackets?: readonly ReviewPacket[]
  linkedPacketsByCycleId?: ReadonlyMap<string, readonly ReviewPacket[]>
  indicators?: readonly CalibrationIndicator[]
  /** Per-employee sitting state (status, notes, adjusted) for this cycle. */
  sittingEmployees?: readonly CalibrationSittingEmployee[]
  /** Employees whose grade was overridden in this calibration sitting. */
  adjustedEmployeeIds?: ReadonlySet<number>
}): RatingTableRow[] {
  const memberIds = cycleMemberIds(input.cycle)
  const employeeById = new Map(
    input.employees.map((employee) => [employee.employeeId, employee]),
  )
  const packetByEmployee = new Map(
    input.packets
      .filter((packet) => packet.cycleId === input.cycle.id)
      .map((packet) => [packet.employeeId, packet]),
  )
  const previousByEmployee = new Map(
    (input.previousPackets ?? []).map((packet) => [packet.employeeId, packet]),
  )
  const sittingByEmployee = new Map(
    (input.sittingEmployees ?? []).map((person) => [person.employeeId, person]),
  )
  const previousCycle =
    previousCyclesOfSamePurpose(input.cycle, input.cycles, 1)[0] ?? null
  const priorYearLabel = yearLabelFromCycle(previousCycle)
  const cycleLabel =
    input.cycle.name?.trim() || yearLabelFromCycle(input.cycle) || 'Rating'
  const links = annualSourceLinks(input.cycle, [...input.cycles])

  const flagsByEmployee = new Map<number, RatingTableFlag[]>()
  for (const indicator of input.indicators ?? []) {
    for (const employeeId of indicator.employeeIds) {
      const list = flagsByEmployee.get(employeeId) ?? []
      list.push({
        id: indicator.id,
        title: indicator.title,
        definition: indicator.definition,
      })
      flagsByEmployee.set(employeeId, list)
    }
  }

  const rows: RatingTableRow[] = []
  for (const employeeId of memberIds) {
    const employee = employeeById.get(employeeId)
    if (!employee) continue
    const packet = packetByEmployee.get(employeeId) ?? null
    const sitting = sittingByEmployee.get(employeeId)
    const quarters: RatingTableQuarter[] = links.map((link, index) => {
      const sourcePackets =
        input.linkedPacketsByCycleId?.get(link.sourceCycleId) ?? []
      const sourcePacket =
        sourcePackets.find((row) => row.employeeId === employeeId) ?? null
      const sourceCycle = input.cycles.find(
        (cycle) => cycle.id === link.sourceCycleId,
      )
      const label = sourceCycle?.name?.trim() || link.sourceCycleId
      return {
        sourceCycleId: link.sourceCycleId,
        label,
        shortLabel: quarterShortLabel(label, index),
        grade: gradeFromLinkedPacket(sourcePacket),
      }
    })
    const quarterAvg = averageQuarterScore(quarters.map((row) => row.grade))
    const annualGrade = calibrationFinalGrade(packet)
    const selfGrade = packet?.selfOverallGrade ?? null
    const managerGrade = packet?.managerOverallGrade ?? null
    const priorGrade = calibrationFinalGrade(
      previousByEmployee.get(employeeId) ?? null,
    )
    const flags = flagsByEmployee.get(employeeId) ?? []
    const isAdjusted =
      Boolean(sitting?.adjustedAt) ||
      Boolean(input.adjustedEmployeeIds?.has(employeeId))
    const manager =
      employee.reportsToId != null
        ? employeeById.get(employee.reportsToId)
        : undefined
    const managerName = employee.reportsToName.trim() || '—'

    rows.push({
      employeeId,
      fullName: employee.fullName,
      avatarUrl: employee.avatarUrl?.trim() ?? '',
      department: employee.department.trim() || '—',
      team: employee.team.trim() || '—',
      market: employee.site.trim() || '—',
      jobGrade: employee.jobGrade.trim() || '—',
      jobLevel: jobLevelOf(employee.jobGrade),
      managerName,
      managerAvatarUrl: manager?.avatarUrl?.trim() ?? '',
      packetId: packet?.id ?? null,
      quarters,
      quarterAverageScore: quarterAvg.score,
      quarterAverageGrade: quarterAvg.grade,
      annualGrade,
      selfGrade,
      managerGrade,
      gapTiers: gradeTierDelta(selfGrade, annualGrade),
      priorGrade,
      cycleLabel,
      priorYearLabel,
      trend: trendBetween(priorGrade, annualGrade),
      joinDateLabel: employee.startDate
        ? formatShortDate(employee.startDate)
        : '—',
      timeInGradeLabel: inGradeLabel(employee.gradeEffectiveOn),
      lastPromoLabel: lastPromoLabel(employee.lastPromotionOn),
      onPip: Boolean(employee.onPip),
      calibrationStatus: sitting?.status ?? 'not_reviewed',
      sessionNotes: sitting?.notes?.trim() ?? '',
      flags,
      isFlagged: flags.length > 0,
      isAdjusted,
    })
  }

  return rows.sort((left, right) =>
    left.fullName.localeCompare(right.fullName, undefined, {
      sensitivity: 'base',
    }),
  )
}

export function ratingTableProgress(
  rows: readonly RatingTableRow[],
): RatingTableProgress {
  let flagged = 0
  let adjusted = 0
  let clean = 0
  for (const row of rows) {
    if (row.isAdjusted) adjusted += 1
    else if (row.isFlagged) flagged += 1
    else clean += 1
  }
  return { total: rows.length, flagged, adjusted, clean }
}

function selectedValues(
  value: string | readonly string[] | undefined,
): string[] | null {
  if (value == null || value === '') return null
  if (typeof value === 'string') return [value]
  return value.length === 0 ? null : [...value]
}

function matchesSelection(
  value: string,
  selected: string | readonly string[] | undefined,
): boolean {
  const values = selectedValues(selected)
  if (!values) return true
  return values.includes(value)
}

export function employeeMatchesCohort(
  employee: PlatformEmployee,
  filters: {
    department?: readonly string[]
    team?: readonly string[]
    market?: readonly string[]
    jobLevel?: readonly string[]
    manager?: readonly string[]
  },
): boolean {
  const department = employee.department.trim() || '—'
  const team = employee.team.trim() || '—'
  const market = employee.site.trim() || '—'
  const manager = employee.reportsToName.trim() || '—'
  if (!matchesSelection(department, filters.department)) return false
  if (!matchesSelection(team, filters.team)) return false
  if (!matchesSelection(market, filters.market)) return false
  if (!matchesSelection(jobLevelOf(employee.jobGrade), filters.jobLevel)) return false
  if (!matchesSelection(manager, filters.manager)) return false
  return true
}

/** Columns that support the Cycles-style header multi-select filter. */
export type RatingTableFilterableColumnId = Exclude<RatingTableColumnId, 'action'>

export const RATING_TABLE_FILTERABLE_COLUMN_IDS: readonly RatingTableFilterableColumnId[] =
  RATING_TABLE_COLUMN_OPTIONS.map((column) => column.id).filter(
    (id): id is RatingTableFilterableColumnId => id !== 'action',
  )

/** Display string used for column-header filter matching (matches cell copy). */
export function ratingTableColumnFilterValue(
  row: RatingTableRow,
  columnId: RatingTableFilterableColumnId,
): string {
  switch (columnId) {
    case 'employee':
      return row.fullName
    case 'manager':
      return row.managerName
    case 'department':
      return row.department
    case 'team':
      return row.team
    case 'market':
      return row.market
    case 'jobGrade':
      return row.jobGrade
    case 'annual':
      return gradeLabel(row.annualGrade)
    case 'self':
      return gradeLabel(row.selfGrade)
    case 'managerRating':
      return gradeLabel(row.managerGrade)
    case 'gap':
      if (row.gapTiers == null) return '—'
      if (row.gapTiers === 0) return 'Aligned'
      return formatGapLabel(row.gapTiers)
    case 'prior':
      return gradeLabel(row.priorGrade)
    case 'trend': {
      const label = formatRatingTrend(row.trend)
      return label || '—'
    }
    case 'q1':
      return gradeLabel(row.quarters[0]?.grade ?? null)
    case 'q2':
      return gradeLabel(row.quarters[1]?.grade ?? null)
    case 'q3':
      return gradeLabel(row.quarters[2]?.grade ?? null)
    case 'q4':
      return gradeLabel(row.quarters[3]?.grade ?? null)
    case 'qAvg':
      return row.quarterAverageScore != null
        ? row.quarterAverageScore.toFixed(1)
        : '—'
    case 'joinDate':
      return row.joinDateLabel
    case 'timeInGrade':
      return row.timeInGradeLabel
    case 'lastPromo':
      return row.lastPromoLabel
    case 'pip':
      return row.onPip ? pipStatusLabel(true) : '—'
    case 'calibrationStatus':
      return CALIBRATION_SITTING_STATUS_LABEL[row.calibrationStatus]
    case 'adjusted':
      return row.isAdjusted ? 'Yes' : '—'
    case 'notes':
      return row.sessionNotes ? 'Has Notes' : '—'
    case 'flags':
      return row.isFlagged
        ? row.flags.map((flag) => flag.title).join(' · ')
        : '—'
  }
}

export function matchesRatingTableColumnFilters(
  row: RatingTableRow,
  columnFilters: Partial<Record<RatingTableFilterableColumnId, string[]>>,
): boolean {
  return (
    Object.entries(columnFilters) as [RatingTableFilterableColumnId, string[]][]
  ).every(
    ([columnId, selected]) =>
      selected.length === 0 ||
      selected.includes(ratingTableColumnFilterValue(row, columnId)),
  )
}

export function filterRatingTableRows(
  rows: readonly RatingTableRow[],
  input: {
    quickFilter: RatingTableQuickFilterId
    department?: string | readonly string[]
    team?: string | readonly string[]
    market?: string | readonly string[]
    jobGrade?: string | readonly string[]
    jobLevel?: string | readonly string[]
    manager?: string | readonly string[]
    columnFilters?: Partial<Record<RatingTableFilterableColumnId, string[]>>
  },
): RatingTableRow[] {
  return rows.filter((row) => {
    if (!matchesSelection(row.department, input.department)) return false
    if (!matchesSelection(row.team, input.team)) return false
    if (!matchesSelection(row.market, input.market)) return false
    if (!matchesSelection(row.jobGrade, input.jobGrade)) return false
    if (!matchesSelection(row.jobLevel, input.jobLevel)) return false
    if (!matchesSelection(row.managerName, input.manager)) return false
    if (
      input.columnFilters &&
      !matchesRatingTableColumnFilters(row, input.columnFilters)
    ) {
      return false
    }

    switch (input.quickFilter) {
      case 'all':
        return true
      case 'flagged':
        // Same exclusive bucket as progress: flagged but not already adjusted.
        return row.isFlagged && !row.isAdjusted
      case 'gap_2':
        return row.gapTiers != null && Math.abs(row.gapTiers) >= 2
      case 'developing_below':
        return (
          row.annualGrade === 'developing' ||
          row.annualGrade === 'unsatisfactory'
        )
      case 'exceeding_above':
        return (
          row.annualGrade === 'exceeding' || row.annualGrade === 'exceptional'
        )
      case 'previous_cycle_gap': {
        const delta = gradeTierDelta(row.priorGrade, row.annualGrade)
        return delta != null && Math.abs(delta) > 1
      }
      case 'adjusted':
        return row.isAdjusted
      case 'clean':
        return !row.isFlagged && !row.isAdjusted
      default:
        return true
    }
  })
}

export function uniqueSortedValues(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value && value !== '—'))].sort(
    (left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
  )
}

export function gradeLabel(grade: GradeBandId | null | undefined): string {
  if (!grade) return '—'
  return GRADE_BAND_META[grade].label
}

export function formatGapLabel(gapTiers: number | null): string {
  if (gapTiers == null || gapTiers === 0) return ''
  const magnitude = Math.abs(gapTiers)
  // gapTiers = annual − self. Negative ⇒ self higher than annual.
  if (gapTiers < 0) return `−${magnitude} Self`
  return `+${magnitude} Mgr`
}

export function ratingTableCsv(rows: readonly RatingTableRow[]): string {
  const sample = rows[0]
  const sampleQuarters = sample?.quarters ?? []
  const priorHeader = sample?.priorYearLabel
    ? `${sample.priorYearLabel} Rating`
    : 'Prior Rating'
  const cycleHeader = 'Final Rating'
  const headers = [
    'Employee',
    'Manager',
    'Department',
    'Team',
    'Market',
    'Job Grade',
    'Join Date',
    'Time In Grade',
    'Last Promotion',
    'PIP',
    'Status',
    'Adjusted',
    'Notes',
    'Flags',
    'Gap',
    priorHeader,
    'Trend',
    sampleQuarters[0]?.label || 'Q1',
    sampleQuarters[1]?.label || 'Q2',
    sampleQuarters[2]?.label || 'Q3',
    sampleQuarters[3]?.label || 'Q4',
    'Quarter Average',
    'Self-Rating',
    'Manager Rating',
    cycleHeader,
  ]
  const lines = rows.map((row) => {
    const q = [0, 1, 2, 3].map((index) => {
      const grade = row.quarters[index]?.grade
      return grade ? GRADE_BAND_META[grade].label : ''
    })
    return [
      row.fullName,
      row.managerName,
      row.department,
      row.team,
      row.market,
      row.jobGrade,
      row.joinDateLabel,
      row.timeInGradeLabel,
      row.lastPromoLabel,
      row.onPip ? 'Active PIP' : 'No PIP On Record',
      CALIBRATION_SITTING_STATUS_LABEL[row.calibrationStatus],
      row.isAdjusted ? 'Yes' : 'No',
      row.sessionNotes,
      row.flags.map((flag) => flag.title).join('; '),
      formatGapLabel(row.gapTiers),
      gradeLabel(row.priorGrade),
      formatRatingTrend(row.trend),
      ...q,
      row.quarterAverageScore?.toFixed(1) ?? '',
      gradeLabel(row.selfGrade),
      gradeLabel(row.managerGrade),
      gradeLabel(row.annualGrade),
    ]
      .map(csvEscape)
      .join(',')
  })
  return [headers.join(','), ...lines].join('\n')
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function defaultVisibleColumnIds(
  hasQuarters: boolean,
): RatingTableColumnId[] {
  return RATING_TABLE_COLUMN_OPTIONS.filter(
    (column) => !column.annualOnly || hasQuarters,
  ).map((column) => column.id)
}
