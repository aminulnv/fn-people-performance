import { officialGrade } from '@/lib/analytics/dashboard'
import { inGradeLabel, lastPromoLabel } from '@/lib/employees/career'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  annualSourceLinks,
  gradeFromLinkedPacket,
} from '@/lib/reviews/annualQuarters'
import { cycleMemberIds } from '@/lib/reviews/cycleGroups'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import { formatShortDate } from '@/lib/reviews/periods'
import { scoreForBand } from '@/lib/reviews/rollup'
import type {
  GradeBandId,
  ReviewCycle,
  ReviewPacket,
} from '@/lib/reviews/types'
import {
  gradeTierDelta,
  previousCyclesOfSamePurpose,
  type CalibrationIndicator,
} from './indicators'

export const GRADE_SHORT_LABEL: Record<GradeBandId, string> = {
  exceptional: 'Excp',
  exceeding: 'Exce',
  performing: 'Perf',
  developing: 'Deve',
  unsatisfactory: 'Unsa',
}

export const RATING_TABLE_QUICK_FILTERS = [
  { id: 'all', label: 'All employees' },
  { id: 'flagged', label: 'Flagged only' },
  { id: 'gap_2', label: 'Gap 2+ tiers' },
  { id: 'developing_below', label: 'Developing & below' },
  { id: 'exceeding_above', label: 'Exceeding & above' },
  { id: 'annual_neq_qavg', label: 'Annual ≠ Q avg' },
  { id: 'adjusted', label: 'Adjusted this session' },
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

export type RatingTableTrend = 'up' | 'down' | 'flat' | null

export type RatingTableRow = {
  employeeId: number
  fullName: string
  department: string
  market: string
  jobGrade: string
  managerName: string
  packetId: string | null
  quarters: RatingTableQuarter[]
  quarterAverageScore: number | null
  quarterAverageGrade: GradeBandId | null
  annualGrade: GradeBandId | null
  selfGrade: GradeBandId | null
  /**
   * Annual tier minus self tier.
   * Negative means self is higher than annual (shown as “−N Self”).
   */
  gapTiers: number | null
  priorGrade: GradeBandId | null
  priorYearLabel: string
  trend: RatingTableTrend
  joinDateLabel: string
  timeInGradeLabel: string
  lastPromoLabel: string
  flags: RatingTableFlag[]
  isFlagged: boolean
  isAdjusted: boolean
  annualDiffersFromQuarterAvg: boolean
}

export type RatingTableProgress = {
  total: number
  flagged: number
  adjusted: number
  clean: number
}

export type RatingTableColumnId =
  | 'employee'
  | 'department'
  | 'market'
  | 'jobGrade'
  | 'manager'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'qAvg'
  | 'annual'
  | 'self'
  | 'gap'
  | 'prior'
  | 'trend'
  | 'joinDate'
  | 'timeInGrade'
  | 'lastPromo'
  | 'flags'
  | 'action'

export const RATING_TABLE_COLUMN_OPTIONS: ReadonlyArray<{
  id: RatingTableColumnId
  label: string
  required?: boolean
  annualOnly?: boolean
}> = [
  { id: 'employee', label: 'Employee', required: true },
  { id: 'department', label: 'Dept.' },
  { id: 'market', label: 'Market' },
  { id: 'jobGrade', label: 'Grade' },
  { id: 'manager', label: 'Manager' },
  { id: 'q1', label: 'Q1', annualOnly: true },
  { id: 'q2', label: 'Q2', annualOnly: true },
  { id: 'q3', label: 'Q3', annualOnly: true },
  { id: 'q4', label: 'Q4', annualOnly: true },
  { id: 'qAvg', label: 'Q Avg', annualOnly: true },
  { id: 'annual', label: 'Annual' },
  { id: 'self', label: 'Self' },
  { id: 'gap', label: 'Gap' },
  { id: 'prior', label: 'Prior rating' },
  { id: 'trend', label: 'Trend' },
  { id: 'joinDate', label: 'Join Date' },
  { id: 'timeInGrade', label: 'In Grade' },
  { id: 'lastPromo', label: 'Last Promo' },
  { id: 'flags', label: 'Flags' },
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
  cycle: Pick<ReviewCycle, 'yearKey' | 'startDate' | 'name'> | null | undefined,
): string {
  if (!cycle) return 'Prior'
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
  const delta = gradeTierDelta(prior, current)
  if (delta == null) return null
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

export function buildEmployeeRatingRows(input: {
  cycle: ReviewCycle
  cycles: readonly ReviewCycle[]
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  previousPackets?: readonly ReviewPacket[]
  linkedPacketsByCycleId?: ReadonlyMap<string, readonly ReviewPacket[]>
  indicators?: readonly CalibrationIndicator[]
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
  const previousCycle =
    previousCyclesOfSamePurpose(input.cycle, input.cycles, 1)[0] ?? null
  const priorYearLabel = yearLabelFromCycle(previousCycle)
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
    const annualGrade = officialGrade(packet)
    const selfGrade = packet?.selfOverallGrade ?? null
    const priorGrade = officialGrade(
      previousByEmployee.get(employeeId) ?? null,
    )
    const flags = flagsByEmployee.get(employeeId) ?? []
    const isAdjusted = Boolean(input.adjustedEmployeeIds?.has(employeeId))
    const annualDiffersFromQuarterAvg =
      annualGrade != null &&
      quarterAvg.grade != null &&
      annualGrade !== quarterAvg.grade

    rows.push({
      employeeId,
      fullName: employee.fullName,
      department: employee.department.trim() || '—',
      market: employee.site.trim() || '—',
      jobGrade: employee.jobGrade.trim() || '—',
      managerName: employee.reportsToName.trim() || '—',
      packetId: packet?.id ?? null,
      quarters,
      quarterAverageScore: quarterAvg.score,
      quarterAverageGrade: quarterAvg.grade,
      annualGrade,
      selfGrade,
      gapTiers: gradeTierDelta(selfGrade, annualGrade),
      priorGrade,
      priorYearLabel,
      trend: trendBetween(priorGrade, annualGrade),
      joinDateLabel: employee.startDate
        ? formatShortDate(employee.startDate)
        : '—',
      timeInGradeLabel: inGradeLabel(employee.gradeEffectiveOn),
      lastPromoLabel: lastPromoLabel(employee.lastPromotionOn),
      flags,
      isFlagged: flags.length > 0,
      isAdjusted,
      annualDiffersFromQuarterAvg,
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

export function filterRatingTableRows(
  rows: readonly RatingTableRow[],
  input: {
    quickFilter: RatingTableQuickFilterId
    department?: string
    market?: string
    jobGrade?: string
    manager?: string
  },
): RatingTableRow[] {
  return rows.filter((row) => {
    if (input.department && row.department !== input.department) return false
    if (input.market && row.market !== input.market) return false
    if (input.jobGrade && row.jobGrade !== input.jobGrade) return false
    if (input.manager && row.managerName !== input.manager) return false

    switch (input.quickFilter) {
      case 'all':
        return true
      case 'flagged':
        return row.isFlagged
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
      case 'annual_neq_qavg':
        return row.annualDiffersFromQuarterAvg
      case 'adjusted':
        return row.isAdjusted
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
  const headers = [
    'Employee',
    'Department',
    'Market',
    'Grade',
    'Manager',
    'Q1',
    'Q2',
    'Q3',
    'Q4',
    'Q Avg',
    'Annual',
    'Self',
    'Gap',
    'Prior rating',
    'Trend',
    'Join Date',
    'In Grade',
    'Last Promo',
    'Flags',
  ]
  const lines = rows.map((row) => {
    const q = [0, 1, 2, 3].map((index) => {
      const grade = row.quarters[index]?.grade
      return grade ? GRADE_BAND_META[grade].label : ''
    })
    return [
      row.fullName,
      row.department,
      row.market,
      row.jobGrade,
      row.managerName,
      ...q,
      row.quarterAverageScore?.toFixed(1) ?? '',
      gradeLabel(row.annualGrade),
      gradeLabel(row.selfGrade),
      formatGapLabel(row.gapTiers),
      gradeLabel(row.priorGrade),
      row.trend ?? '',
      row.joinDateLabel,
      row.timeInGradeLabel,
      row.lastPromoLabel,
      row.flags.map((flag) => flag.title).join('; '),
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
