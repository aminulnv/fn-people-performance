import { officialGrade } from '@/lib/analytics/dashboard'
import type { PlatformEmployee } from '@/lib/employees/types'
import { cycleMemberIds } from '@/lib/reviews/cycleGroups'
import { GRADE_BAND_META, OVERALL_GRADE_ORDER } from '@/lib/reviews/labels'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'

export const RATING_BREAKDOWNS = [
  { id: 'overall', label: 'Overall' },
  { id: 'track', label: 'IC vs Managerial' },
  { id: 'market', label: 'By Market' },
  { id: 'department', label: 'By Department' },
] as const

export type RatingBreakdownId = (typeof RATING_BREAKDOWNS)[number]['id']

export type RatingBandRow = {
  id: GradeBandId
  label: string
  count: number
  percent: number
  guidelinePercent: number
}

export type RatingSeries = {
  id: string
  label: string
  total: number
  bands: RatingBandRow[]
}

export type RatingCountShare = {
  count: number
  percent: number
}

export type RatingSummary = {
  total: number
  exceedingAndAbove: RatingCountShare
  performing: RatingCountShare
  developingAndBelow: RatingCountShare
}

export type RatingDistribution = {
  bands: RatingBandRow[]
  series: RatingSeries[]
  summary: RatingSummary
}

export function sharePercent(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

export function chartScale(values: readonly number[]): number {
  const peak = values.reduce((highest, value) => Math.max(highest, value), 0)
  if (peak <= 0) return 40
  const padded = peak + 5
  return Math.min(100, Math.max(40, Math.ceil(padded / 10) * 10))
}

export function employeeTrack(
  employeeId: number,
  managerIds: ReadonlySet<number>,
): 'ic' | 'managerial' {
  return managerIds.has(employeeId) ? 'managerial' : 'ic'
}

function emptyCounts(): Record<GradeBandId, number> {
  return {
    exceptional: 0,
    exceeding: 0,
    performing: 0,
    developing: 0,
    unsatisfactory: 0,
  }
}

function toBands(
  counts: Record<GradeBandId, number>,
  total: number,
  guideline: Record<GradeBandId, number>,
): RatingBandRow[] {
  return OVERALL_GRADE_ORDER.map((id) => ({
    id,
    label: GRADE_BAND_META[id].label,
    count: counts[id],
    percent: sharePercent(counts[id], total),
    guidelinePercent: guideline[id] ?? 0,
  }))
}

function toShare(count: number, total: number): RatingCountShare {
  return { count, percent: sharePercent(count, total) }
}

function groupLabel(
  breakdown: RatingBreakdownId,
  employeeId: number,
  employee: PlatformEmployee | undefined,
  managerIds: ReadonlySet<number>,
): { id: string; label: string } {
  if (breakdown === 'overall') return { id: 'overall', label: 'Overall' }
  if (breakdown === 'track') {
    return employeeTrack(employeeId, managerIds) === 'managerial'
      ? { id: 'managerial', label: 'Managerial' }
      : { id: 'ic', label: 'Individual contributor' }
  }
  if (breakdown === 'market') {
    const site = employee?.site.trim() || 'Unassigned'
    return { id: `market:${site.toLocaleLowerCase()}`, label: site }
  }
  const department = employee?.department.trim() || 'Unassigned'
  return { id: `dept:${department.toLocaleLowerCase()}`, label: department }
}

const TRACK_ORDER = ['ic', 'managerial']

function sortSeries(series: RatingSeries[], breakdown: RatingBreakdownId): RatingSeries[] {
  if (breakdown === 'track') {
    return [...series].sort(
      (left, right) => TRACK_ORDER.indexOf(left.id) - TRACK_ORDER.indexOf(right.id),
    )
  }
  return [...series].sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total
    return left.label.localeCompare(right.label)
  })
}

export function buildRatingDistribution(input: {
  cycle: Pick<ReviewCycle, 'groups' | 'calibration'>
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  breakdown: RatingBreakdownId
}): RatingDistribution {
  const memberIds = new Set(cycleMemberIds(input.cycle))
  const employeeById = new Map(
    input.employees.map((employee) => [employee.employeeId, employee]),
  )
  const managerIds = new Set(
    input.employees
      .map((employee) => employee.reportsToId)
      .filter((id): id is number => typeof id === 'number' && Number.isInteger(id)),
  )
  const guideline = input.cycle.calibration.gradeDistribution
  const overallCounts = emptyCounts()
  const seriesCounts = new Map<
    string,
    { label: string; counts: Record<GradeBandId, number> }
  >()

  for (const packet of input.packets) {
    if (!memberIds.has(packet.employeeId)) continue
    const grade = officialGrade(packet)
    if (!grade) continue
    overallCounts[grade] += 1
    const employee = employeeById.get(packet.employeeId)
    const group = groupLabel(
      input.breakdown,
      packet.employeeId,
      employee,
      managerIds,
    )
    const current = seriesCounts.get(group.id) ?? {
      label: group.label,
      counts: emptyCounts(),
    }
    current.counts[grade] += 1
    seriesCounts.set(group.id, current)
  }

  const total = OVERALL_GRADE_ORDER.reduce((sum, id) => sum + overallCounts[id], 0)
  const bands = toBands(overallCounts, total, guideline)
  const series = sortSeries(
    [...seriesCounts.entries()].map(([id, row]) => {
      const seriesTotal = OVERALL_GRADE_ORDER.reduce(
        (sum, bandId) => sum + row.counts[bandId],
        0,
      )
      return {
        id,
        label: row.label,
        total: seriesTotal,
        bands: toBands(row.counts, seriesTotal, guideline),
      }
    }),
    input.breakdown,
  )

  const exceedingAndAbove =
    overallCounts.exceptional + overallCounts.exceeding
  const developingAndBelow =
    overallCounts.developing + overallCounts.unsatisfactory

  return {
    bands,
    series,
    summary: {
      total,
      exceedingAndAbove: toShare(exceedingAndAbove, total),
      performing: toShare(overallCounts.performing, total),
      developingAndBelow: toShare(developingAndBelow, total),
    },
  }
}
