import { officialGrade } from '@/lib/analytics/dashboard'
import type { PlatformEmployee } from '@/lib/employees/types'
import { cyclePurposeOf } from '@/lib/reviews/purpose'
import { cycleMemberIds } from '@/lib/reviews/cycleGroups'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'

export const CALIBRATION_INDICATOR_IDS = [
  'previous_cycle_gap',
  'self_higher_than_manager',
  'self_lower_than_manager',
  'promoted_last_12_months',
] as const

export type CalibrationIndicatorId = (typeof CALIBRATION_INDICATOR_IDS)[number]

export type CalibrationIndicatorTone =
  | 'info'
  | 'positive'
  | 'warning'
  | 'critical'

export type CalibrationIndicator = {
  id: CalibrationIndicatorId
  title: string
  definition: string
  tone: CalibrationIndicatorTone
  count: number
  employeeIds: number[]
}

const TIER_INDEX: Record<GradeBandId, number> = {
  unsatisfactory: 0,
  developing: 1,
  performing: 2,
  exceeding: 3,
  exceptional: 4,
}

const META: Record<
  CalibrationIndicatorId,
  {
    title: string
    definition: string
    tone: CalibrationIndicatorTone
  }
> = {
  previous_cycle_gap: {
    title: '2+ bands from the previous cycle',
    definition:
      'Official grade is more than one band away from the immediately previous annual cycle. Half-year appraisals are annual cycles, so the previous cycle of Annual 2026 is H2 2025.',
    tone: 'warning',
  },
  self_higher_than_manager: {
    title: 'Self-rating 2+ tiers higher than manager',
    definition:
      'Self overall grade is two or more bands above the manager overall grade on this packet.',
    tone: 'warning',
  },
  self_lower_than_manager: {
    title: 'Self-rating 2+ tiers lower than manager',
    definition:
      'Self overall grade is two or more bands below the manager overall grade on this packet.',
    tone: 'info',
  },
  promoted_last_12_months: {
    title: 'Promoted in the last 12 months',
    definition:
      'Received a promotion between 1 January and 31 December of this cycle’s year.',
    tone: 'info',
  },
}

export function promotionYearWindow(cycle: {
  startDate: string
  endDate: string
}): { start: string; end: string } {
  const year = (cycle.endDate || cycle.startDate).slice(0, 4)
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

export function monthsBetweenDates(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00.000Z`)
  const to = Date.parse(`${toIso.slice(0, 10)}T00:00:00.000Z`)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0
  const fromDate = new Date(from)
  const toDate = new Date(to)
  return (
    (toDate.getUTCFullYear() - fromDate.getUTCFullYear()) * 12 +
    (toDate.getUTCMonth() - fromDate.getUTCMonth())
  )
}

export function gradeTierDelta(
  from: GradeBandId | null,
  to: GradeBandId | null,
): number | null {
  if (!from || !to) return null
  return TIER_INDEX[to] - TIER_INDEX[from]
}

export function previousCyclesOfSamePurpose(
  cycle: Pick<ReviewCycle, 'id' | 'periodKey' | 'type' | 'startDate'>,
  cycles: readonly ReviewCycle[],
  limit: number,
): ReviewCycle[] {
  const purpose = cyclePurposeOf(cycle)
  return cycles
    .filter(
      (item) =>
        item.id !== cycle.id &&
        cyclePurposeOf(item) === purpose &&
        item.startDate < cycle.startDate,
    )
    .sort((left, right) => right.startDate.localeCompare(left.startDate))
    .slice(0, limit)
}

function packetByEmployee(
  packets: readonly ReviewPacket[],
): Map<number, ReviewPacket> {
  return new Map(packets.map((packet) => [packet.employeeId, packet]))
}

function gradeForEmployee(
  byEmployee: Map<number, ReviewPacket>,
  employeeId: number,
): GradeBandId | null {
  return officialGrade(byEmployee.get(employeeId))
}

function toIndicator(
  id: CalibrationIndicatorId,
  employeeIds: number[],
): CalibrationIndicator {
  const meta = META[id]
  return {
    id,
    title: meta.title,
    definition: meta.definition,
    tone: meta.tone,
    count: employeeIds.length,
    employeeIds: [...employeeIds].sort((left, right) => left - right),
  }
}

export function buildCalibrationIndicators(input: {
  cycle: ReviewCycle
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  /** Most recent previous annual cycle first. Half-year appraisals count. */
  previousPackets?: readonly (readonly ReviewPacket[])[]
  /** Employee ids promoted in the cycle year’s calendar window. */
  promotedInWindowEmployeeIds?: ReadonlySet<number>
}): CalibrationIndicator[] {
  const memberIds = new Set(cycleMemberIds(input.cycle))
  const scopedIds = new Set(
    input.employees
      .map((employee) => employee.employeeId)
      .filter((employeeId) => memberIds.has(employeeId)),
  )
  const currentByEmployee = packetByEmployee(
    input.packets.filter((packet) => scopedIds.has(packet.employeeId)),
  )
  const previousGrade = packetByEmployee(input.previousPackets?.[0] ?? [])
  const promotedWindow = input.promotedInWindowEmployeeIds ?? new Set<number>()

  const previousGap: number[] = []
  const selfHigher: number[] = []
  const selfLower: number[] = []
  const promotedYear: number[] = []

  for (const employeeId of scopedIds) {
    if (promotedWindow.has(employeeId)) promotedYear.push(employeeId)
  }

  for (const [employeeId, packet] of currentByEmployee) {
    const grade = officialGrade(packet)
    if (!grade) continue
    const delta = gradeTierDelta(gradeForEmployee(previousGrade, employeeId), grade)
    if (delta != null && Math.abs(delta) > 1) previousGap.push(employeeId)

    if (packet.selfOverallGrade && packet.managerOverallGrade) {
      const selfDelta =
        TIER_INDEX[packet.selfOverallGrade] -
        TIER_INDEX[packet.managerOverallGrade]
      if (selfDelta >= 2) selfHigher.push(employeeId)
      if (selfDelta <= -2) selfLower.push(employeeId)
    }
  }

  return [
    toIndicator('previous_cycle_gap', previousGap),
    toIndicator('self_higher_than_manager', selfHigher),
    toIndicator('self_lower_than_manager', selfLower),
    toIndicator('promoted_last_12_months', promotedYear),
  ]
}
