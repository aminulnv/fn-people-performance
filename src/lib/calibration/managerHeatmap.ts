import { officialGrade } from '@/lib/analytics/dashboard'
import type { PlatformEmployee } from '@/lib/employees/types'
import { cycleMemberIds } from '@/lib/reviews/cycleGroups'
import { GRADE_BAND_META, OVERALL_GRADE_ORDER } from '@/lib/reviews/labels'
import { bandForScore, scoreForBand } from '@/lib/reviews/rollup'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import { sharePercent } from './distribution'

export const HEATMAP_BAND_ORDER: GradeBandId[] = [...OVERALL_GRADE_ORDER]

export const HEATMAP_INFO =
  'Each cell is the share of that manager’s graded team in the band. Red outline marks outlier concentration: ≥40% Developing & below, or >60% Exceeding & above. Team avg is the mean 1–5 score; Vs org compares that mean to the cycle overall.'

const LOW_OUTLIER_PERCENT = 40
const HIGH_OUTLIER_PERCENT = 60
const ON_AVG_DELTA = 0.25

export type HeatmapCell = {
  bandId: GradeBandId
  count: number
  percent: number
  outlier: boolean
}

export type HeatmapVsOrgKind = 'on' | 'above' | 'below'

export type ManagerHeatmapRow = {
  managerEmployeeId: number
  managerName: string
  shortName: string
  teamSize: number
  cells: HeatmapCell[]
  averageScore: number | null
  averageBand: GradeBandId | null
  vsOrgKind: HeatmapVsOrgKind | null
  vsOrgDelta: number | null
}

export type ManagerRatingHeatmap = {
  rows: ManagerHeatmapRow[]
  orgAverageScore: number | null
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

export function shortManagerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Unknown'
  if (parts.length === 1) return parts[0]!
  const first = parts[0]!
  const last = parts[parts.length - 1]!
  return `${first} ${last.charAt(0).toUpperCase()}.`
}

export function vsOrgKind(delta: number): HeatmapVsOrgKind {
  if (Math.abs(delta) < ON_AVG_DELTA) return 'on'
  return delta > 0 ? 'above' : 'below'
}

function managerIdForPacket(
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

export function buildManagerRatingHeatmap(input: {
  cycle: Pick<ReviewCycle, 'groups'>
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
}): ManagerRatingHeatmap {
  const memberIds = new Set(cycleMemberIds(input.cycle))
  const employeeById = new Map(
    input.employees.map((employee) => [employee.employeeId, employee]),
  )

  const byManager = new Map<
    number,
    { counts: Record<GradeBandId, number>; total: number }
  >()
  let orgTotal = 0
  let orgScoreSum = 0

  for (const packet of input.packets) {
    if (!memberIds.has(packet.employeeId)) continue
    const grade = officialGrade(packet)
    if (!grade) continue
    const employee = employeeById.get(packet.employeeId)
    const managerId = managerIdForPacket(packet, employee)
    if (managerId == null || managerId === packet.employeeId) continue

    const bucket = byManager.get(managerId) ?? {
      counts: emptyCounts(),
      total: 0,
    }
    bucket.counts[grade] += 1
    bucket.total += 1
    byManager.set(managerId, bucket)

    orgTotal += 1
    orgScoreSum += scoreForBand(grade)
  }

  const orgAverageScore =
    orgTotal > 0 ? Math.round((orgScoreSum / orgTotal) * 100) / 100 : null

  const rows: ManagerHeatmapRow[] = [...byManager.entries()]
    .map(([managerEmployeeId, bucket]) => {
      const manager = employeeById.get(managerEmployeeId)
      const managerName = manager?.fullName.trim() || `Manager ${managerEmployeeId}`
      const lowShare =
        sharePercent(
          bucket.counts.developing + bucket.counts.unsatisfactory,
          bucket.total,
        )
      const highShare =
        sharePercent(
          bucket.counts.exceeding + bucket.counts.exceptional,
          bucket.total,
        )
      const lowOutlier = lowShare >= LOW_OUTLIER_PERCENT
      const highOutlier = highShare > HIGH_OUTLIER_PERCENT

      const cells = HEATMAP_BAND_ORDER.map((bandId) => {
        const count = bucket.counts[bandId]
        const percent = sharePercent(count, bucket.total)
        const outlier =
          (lowOutlier &&
            (bandId === 'unsatisfactory' || bandId === 'developing')) ||
          (highOutlier &&
            (bandId === 'exceeding' || bandId === 'exceptional'))
        return { bandId, count, percent, outlier }
      })

      let scoreSum = 0
      for (const bandId of HEATMAP_BAND_ORDER) {
        scoreSum += scoreForBand(bandId) * bucket.counts[bandId]
      }
      const averageScore =
        bucket.total > 0
          ? Math.round((scoreSum / bucket.total) * 10) / 10
          : null
      const averageBand =
        averageScore == null ? null : bandForScore(averageScore)
      const vsOrgDelta =
        averageScore != null && orgAverageScore != null
          ? Math.round((averageScore - orgAverageScore) * 100) / 100
          : null

      return {
        managerEmployeeId,
        managerName,
        shortName: shortManagerName(managerName),
        teamSize: bucket.total,
        cells,
        averageScore,
        averageBand,
        vsOrgKind: vsOrgDelta == null ? null : vsOrgKind(vsOrgDelta),
        vsOrgDelta,
      }
    })
    .sort((left, right) => {
      if (right.teamSize !== left.teamSize) return right.teamSize - left.teamSize
      return left.shortName.localeCompare(right.shortName)
    })

  return { rows, orgAverageScore }
}

export function heatmapBandLabel(bandId: GradeBandId): string {
  return GRADE_BAND_META[bandId].label
}

/** Intensity bucket for cell fill (0 empty → 4 peak). */
export function heatmapIntensity(percent: number, count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || percent <= 0) return 0
  if (percent >= 60) return 4
  if (percent >= 40) return 3
  if (percent >= 25) return 2
  return 1
}
