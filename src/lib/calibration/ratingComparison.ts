import { officialGrade } from '@/lib/analytics/dashboard'
import type { PlatformEmployee } from '@/lib/employees/types'
import { cycleMemberIds } from '@/lib/reviews/cycleGroups'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import { bandForScore, scoreForBand } from '@/lib/reviews/rollup'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import { shortManagerName } from './managerHeatmap'

export const RATING_COMPARISON_INFO =
  'Bars show each group’s mean official grade (1–5). The vertical line is the selected comparison baseline. On par means within ±0.25 of that baseline; otherwise the bar and delta lean below (red) or above (blue).'

export const COMPARISON_VIEWS = [
  { id: 'department', label: 'Department' },
  { id: 'team_manager', label: 'Team / Manager' },
] as const

export type RatingComparisonViewId = (typeof COMPARISON_VIEWS)[number]['id']

export type RatingComparisonTone = 'on' | 'above' | 'below'

export type RatingComparisonGroup = {
  id: string
  label: string
  count: number
  averageScore: number
  averageBand: GradeBandId
}

export type RatingComparisonRow = RatingComparisonGroup & {
  delta: number
  tone: RatingComparisonTone
  barPercent: number
}

export type RatingComparisonModel = {
  groups: RatingComparisonGroup[]
  rows: RatingComparisonRow[]
  baselineScore: number | null
  baselineLabel: string
  baselineLinePercent: number | null
}

const ON_AVG_DELTA = 0.25
const SCORE_MAX = 5

function managerIdFor(
  packet: ReviewPacket,
  employee: PlatformEmployee | undefined,
): number | null {
  if (
    typeof packet.managerEmployeeId === 'number' &&
    Number.isInteger(packet.managerEmployeeId)
  ) {
    return packet.managerEmployeeId
  }
  if (
    employee &&
    typeof employee.reportsToId === 'number' &&
    Number.isInteger(employee.reportsToId)
  ) {
    return employee.reportsToId
  }
  return null
}

function groupKey(
  view: RatingComparisonViewId,
  packet: ReviewPacket,
  employee: PlatformEmployee | undefined,
  employeeById: Map<number, PlatformEmployee>,
): { id: string; label: string } | null {
  if (view === 'department') {
    const department = employee?.department.trim() || 'Unassigned'
    return {
      id: `dept:${department.toLocaleLowerCase()}`,
      label: department,
    }
  }
  const managerId = managerIdFor(packet, employee)
  if (managerId == null) return null
  const manager = employeeById.get(managerId)
  const fullName = manager?.fullName.trim() || `Manager ${managerId}`
  const team = employee?.team.trim()
  const label = team
    ? `${team} · ${shortManagerName(fullName)}`
    : shortManagerName(fullName)
  return { id: `mgr:${managerId}`, label }
}

export function comparisonTone(delta: number): RatingComparisonTone {
  if (Math.abs(delta) < ON_AVG_DELTA) return 'on'
  return delta > 0 ? 'above' : 'below'
}

export function scoreToBarPercent(score: number): number {
  return Math.max(0, Math.min(100, (score / SCORE_MAX) * 100))
}

export function buildRatingComparisonGroups(input: {
  cycle: Pick<ReviewCycle, 'groups'>
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  view: RatingComparisonViewId
}): RatingComparisonGroup[] {
  const memberIds = new Set(cycleMemberIds(input.cycle))
  const employeeById = new Map(
    input.employees.map((employee) => [employee.employeeId, employee]),
  )
  const buckets = new Map<
    string,
    { label: string; scoreSum: number; count: number }
  >()

  for (const packet of input.packets) {
    if (!memberIds.has(packet.employeeId)) continue
    const grade = officialGrade(packet)
    if (!grade) continue
    const employee = employeeById.get(packet.employeeId)
    const key = groupKey(input.view, packet, employee, employeeById)
    if (!key) continue
    const bucket = buckets.get(key.id) ?? {
      label: key.label,
      scoreSum: 0,
      count: 0,
    }
    bucket.scoreSum += scoreForBand(grade)
    bucket.count += 1
    buckets.set(key.id, bucket)
  }

  return [...buckets.entries()]
    .map(([id, bucket]) => {
      const averageScore = Math.round((bucket.scoreSum / bucket.count) * 100) / 100
      return {
        id,
        label: bucket.label,
        count: bucket.count,
        averageScore,
        averageBand: bandForScore(averageScore),
      }
    })
    .sort((left, right) => {
      if (right.averageScore !== left.averageScore) {
        return right.averageScore - left.averageScore
      }
      return left.label.localeCompare(right.label)
    })
}

export function buildRatingComparisonModel(input: {
  groups: readonly RatingComparisonGroup[]
  /** `all` = every group, otherwise a group id to show alone. */
  scopeId: string
  /** `avg` = mean of scoped groups, otherwise a group id baseline. */
  baselineId: string
}): RatingComparisonModel {
  const scoped =
    input.scopeId === 'all'
      ? [...input.groups]
      : input.groups.filter((group) => group.id === input.scopeId)

  const avgOfScoped =
    scoped.length === 0
      ? null
      : Math.round(
          (scoped.reduce((sum, group) => sum + group.averageScore * group.count, 0) /
            scoped.reduce((sum, group) => sum + group.count, 0)) *
            100,
        ) / 100

  let baselineScore: number | null = null
  let baselineLabel = 'Avg of All'

  if (input.baselineId === 'avg') {
    baselineScore = avgOfScoped
    baselineLabel = 'Avg of All'
  } else {
    const baselineGroup =
      input.groups.find((group) => group.id === input.baselineId) ?? null
    baselineScore = baselineGroup?.averageScore ?? null
    baselineLabel = baselineGroup?.label ?? 'Baseline'
  }

  const rows: RatingComparisonRow[] = scoped.map((group) => {
    const delta =
      baselineScore == null
        ? 0
        : Math.round((group.averageScore - baselineScore) * 100) / 100
    return {
      ...group,
      delta,
      tone: baselineScore == null ? 'on' : comparisonTone(delta),
      barPercent: scoreToBarPercent(group.averageScore),
    }
  })

  return {
    groups: [...input.groups],
    rows,
    baselineScore,
    baselineLabel,
    baselineLinePercent:
      baselineScore == null ? null : scoreToBarPercent(baselineScore),
  }
}

export function ratingBandCaption(band: GradeBandId): string {
  return GRADE_BAND_META[band].label
}
