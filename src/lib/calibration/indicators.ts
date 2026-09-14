import { officialGrade } from '@/lib/analytics/dashboard'
import type { PlatformEmployee } from '@/lib/employees/types'
import { annualSourceLinks, gradeFromLinkedPacket } from '@/lib/reviews/annualQuarters'
import { cyclePurposeOf } from '@/lib/reviews/purpose'
import { rollupGoalsPillar } from '@/lib/reviews/rollup'
import { cycleMemberIds } from '@/lib/reviews/cycleGroups'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'

export const CALIBRATION_INDICATOR_IDS = [
  'new_hire_exceeding',
  'two_cycles_exceeding',
  'three_cycles_exceeding',
  'promoted_exceeding_again',
  'two_cycles_developing',
  'three_cycles_developing',
  'unsatisfactory_no_pip',
  'dropped_two_tiers',
  'improved_two_tiers',
  'annual_vs_quarterly',
  'self_higher_than_manager',
  'self_lower_than_manager',
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
  new_hire_exceeding: {
    title: 'With us <6 months exceeding & above',
    definition:
      'People with less than 6 months tenure (as of this cycle’s start) whose official grade is Exceeding or Exceptional.',
    tone: 'info',
  },
  two_cycles_exceeding: {
    title: '2 consecutive cycles exceeding & above',
    definition:
      'Official grade is Exceeding or Exceptional in this cycle and the immediately previous cycle of the same type.',
    tone: 'positive',
  },
  three_cycles_exceeding: {
    title: '3 consecutive cycles exceeding & above',
    definition:
      'Official grade is Exceeding or Exceptional in this cycle and the two previous cycles of the same type.',
    tone: 'positive',
  },
  promoted_exceeding_again: {
    title: 'Promoted last cycle exceeding again',
    definition:
      'Promoted in the previous cycle and Exceeding or Exceptional again this cycle. Counts only people flagged in the promotion set when that data is available.',
    tone: 'positive',
  },
  two_cycles_developing: {
    title: '2 consecutive cycles developing & below',
    definition:
      'Official grade is Developing or Unsatisfactory in this cycle and the immediately previous cycle of the same type.',
    tone: 'warning',
  },
  three_cycles_developing: {
    title: '3 consecutive cycles developing & below',
    definition:
      'Official grade is Developing or Unsatisfactory in this cycle and the two previous cycles of the same type.',
    tone: 'critical',
  },
  unsatisfactory_no_pip: {
    title: 'Rated unsatisfactory no PIP initiated',
    definition:
      'Official grade is Unsatisfactory and the person is not on an active PIP. When PIP data is missing, every Unsatisfactory rating is counted.',
    tone: 'critical',
  },
  dropped_two_tiers: {
    title: 'Dropped 2+ tiers from previous cycle',
    definition:
      'Official grade fell by two or more bands versus the previous cycle of the same type (for example Exceeding → Developing).',
    tone: 'warning',
  },
  improved_two_tiers: {
    title: 'Improved 2+ tiers from previous cycle',
    definition:
      'Official grade rose by two or more bands versus the previous cycle of the same type (for example Developing → Exceeding).',
    tone: 'info',
  },
  annual_vs_quarterly: {
    title: 'Annual rating ≠ quarterly average',
    definition:
      'On annual cycles, the official annual grade differs from the weighted average of linked Q1–Q4 grades. Empty on non-annual cycles or when quarter grades are missing.',
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
}

function isExceedingOrAbove(grade: GradeBandId | null): boolean {
  return grade === 'exceeding' || grade === 'exceptional'
}

function isDevelopingOrBelow(grade: GradeBandId | null): boolean {
  return grade === 'developing' || grade === 'unsatisfactory'
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

function averageLinkedQuarterGrade(
  employeeId: number,
  cycle: ReviewCycle,
  cycles: readonly ReviewCycle[],
  linkedPacketsByCycleId: ReadonlyMap<string, readonly ReviewPacket[]>,
): GradeBandId | null {
  const links = annualSourceLinks(cycle, [...cycles])
  if (links.length === 0) return null
  const quarters = links.map((link) => {
    const packets = linkedPacketsByCycleId.get(link.sourceCycleId) ?? []
    const packet = packets.find((row) => row.employeeId === employeeId)
    const grade = gradeFromLinkedPacket(packet)
    return {
      sourceCycleId: link.sourceCycleId,
      label: link.sourceCycleId,
      outcome: grade
        ? ({ kind: 'grade' as const, grade })
        : ({ kind: 'inapplicable' as const }),
    }
  })
  return rollupGoalsPillar({ quarters, links }).averageGrade
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
  /** All cycles — used to resolve suggested annual source links. */
  cycles?: readonly ReviewCycle[]
  /** Most recent previous cycle first. */
  previousPackets?: readonly (readonly ReviewPacket[])[]
  /** Linked quarter packets keyed by source cycle id (annual only). */
  linkedPacketsByCycleId?: ReadonlyMap<string, readonly ReviewPacket[]>
  /** Employee ids promoted in the previous cycle. */
  promotedEmployeeIds?: ReadonlySet<number>
  /** Employee ids currently on a PIP. */
  pipEmployeeIds?: ReadonlySet<number>
}): CalibrationIndicator[] {
  const allCycles = input.cycles ?? []
  const memberIds = new Set(cycleMemberIds(input.cycle))
  const employeeById = new Map(
    input.employees.map((employee) => [employee.employeeId, employee]),
  )
  const currentByEmployee = packetByEmployee(
    input.packets.filter((packet) => memberIds.has(packet.employeeId)),
  )
  const previous = (input.previousPackets ?? []).map((packets) =>
    packetByEmployee(packets),
  )
  const prev1 = previous[0] ?? new Map<number, ReviewPacket>()
  const prev2 = previous[1] ?? new Map<number, ReviewPacket>()
  const promoted = input.promotedEmployeeIds ?? new Set<number>()
  const onPip = input.pipEmployeeIds
  const linked = input.linkedPacketsByCycleId ?? new Map()
  const hasAnnualLinks =
    cyclePurposeOf(input.cycle) === 'annual_appraisal' &&
    annualSourceLinks(input.cycle, [...allCycles]).length > 0

  const newHireExceeding: number[] = []
  const twoExceeding: number[] = []
  const threeExceeding: number[] = []
  const promotedExceeding: number[] = []
  const twoDeveloping: number[] = []
  const threeDeveloping: number[] = []
  const unsatisfactoryNoPip: number[] = []
  const dropped: number[] = []
  const improved: number[] = []
  const annualMismatch: number[] = []
  const selfHigher: number[] = []
  const selfLower: number[] = []

  for (const [employeeId, packet] of currentByEmployee) {
    const grade = officialGrade(packet)
    if (!grade) continue
    const employee = employeeById.get(employeeId)
    const prevGrade = gradeForEmployee(prev1, employeeId)
    const prev2Grade = gradeForEmployee(prev2, employeeId)

    if (
      employee &&
      monthsBetweenDates(employee.startDate, input.cycle.startDate) < 6 &&
      isExceedingOrAbove(grade)
    ) {
      newHireExceeding.push(employeeId)
    }

    if (isExceedingOrAbove(grade) && isExceedingOrAbove(prevGrade)) {
      twoExceeding.push(employeeId)
      if (isExceedingOrAbove(prev2Grade)) threeExceeding.push(employeeId)
    }

    if (
      promoted.has(employeeId) &&
      isExceedingOrAbove(grade) &&
      isExceedingOrAbove(prevGrade)
    ) {
      promotedExceeding.push(employeeId)
    }

    if (isDevelopingOrBelow(grade) && isDevelopingOrBelow(prevGrade)) {
      twoDeveloping.push(employeeId)
      if (isDevelopingOrBelow(prev2Grade)) threeDeveloping.push(employeeId)
    }

    if (grade === 'unsatisfactory' && !(onPip?.has(employeeId) ?? false)) {
      unsatisfactoryNoPip.push(employeeId)
    }

    const delta = gradeTierDelta(prevGrade, grade)
    if (delta != null && delta <= -2) dropped.push(employeeId)
    if (delta != null && delta >= 2) improved.push(employeeId)

    if (hasAnnualLinks) {
      const quarterAverage = averageLinkedQuarterGrade(
        employeeId,
        input.cycle,
        allCycles,
        linked,
      )
      if (quarterAverage && quarterAverage !== grade) {
        annualMismatch.push(employeeId)
      }
    }

    if (packet.selfOverallGrade && packet.managerOverallGrade) {
      const selfDelta =
        TIER_INDEX[packet.selfOverallGrade] -
        TIER_INDEX[packet.managerOverallGrade]
      if (selfDelta >= 2) selfHigher.push(employeeId)
      if (selfDelta <= -2) selfLower.push(employeeId)
    }
  }

  return [
    toIndicator('new_hire_exceeding', newHireExceeding),
    toIndicator('two_cycles_exceeding', twoExceeding),
    toIndicator('three_cycles_exceeding', threeExceeding),
    toIndicator('promoted_exceeding_again', promotedExceeding),
    toIndicator('two_cycles_developing', twoDeveloping),
    toIndicator('three_cycles_developing', threeDeveloping),
    toIndicator('unsatisfactory_no_pip', unsatisfactoryNoPip),
    toIndicator('dropped_two_tiers', dropped),
    toIndicator('improved_two_tiers', improved),
    toIndicator('annual_vs_quarterly', annualMismatch),
    toIndicator('self_higher_than_manager', selfHigher),
    toIndicator('self_lower_than_manager', selfLower),
  ]
}
