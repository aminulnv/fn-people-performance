import type { PlatformEmployee } from '@/lib/employees/types'
import { cycleMemberIds } from '@/lib/reviews/cycleGroups'
import { GRADE_BAND_META, OVERALL_GRADE_ORDER } from '@/lib/reviews/labels'
import type { GradeBandId, ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import { shortManagerName } from './managerHeatmap'

export const RATING_GRID_BAND_ORDER: GradeBandId[] = [...OVERALL_GRADE_ORDER]

const TIER_INDEX: Record<GradeBandId, number> = {
  unsatisfactory: 0,
  developing: 1,
  performing: 2,
  exceeding: 3,
  exceptional: 4,
}

export type RatingGridDotTone =
  | 'aligned'
  | 'mgr_higher'
  | 'amber_gap'
  | 'red_gap'

export type RatingGridPerson = {
  employeeId: number
  fullName: string
  shortName: string
  selfGrade: GradeBandId
  managerGrade: GradeBandId
  /** Manager tier minus self tier. Positive = manager rated higher. */
  tierDelta: number
  tone: RatingGridDotTone
}

export type RatingGridCell = {
  selfGrade: GradeBandId
  managerGrade: GradeBandId
  tone: RatingGridDotTone
  people: RatingGridPerson[]
}

export type RatingGridModel = {
  cells: RatingGridCell[]
  people: RatingGridPerson[]
  total: number
  redFlagCount: number
  amberCount: number
  redFlagOutliers: RatingGridPerson[]
}

export function shortBandLabel(bandId: GradeBandId): string {
  if (bandId === 'unsatisfactory') return 'Unsatis.'
  return GRADE_BAND_META[bandId].label
}

export function ratingGridTone(tierDelta: number): RatingGridDotTone {
  if (tierDelta === 0) return 'aligned'
  if (Math.abs(tierDelta) >= 2) return 'red_gap'
  if (tierDelta > 0) return 'mgr_higher'
  return 'amber_gap'
}

export function buildSelfManagerRatingGrid(input: {
  cycle: Pick<ReviewCycle, 'groups'>
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
}): RatingGridModel {
  const memberIds = new Set(cycleMemberIds(input.cycle))
  const employeeById = new Map(
    input.employees.map((employee) => [employee.employeeId, employee]),
  )
  const people: RatingGridPerson[] = []

  for (const packet of input.packets) {
    if (!memberIds.has(packet.employeeId)) continue
    const selfGrade = packet.selfOverallGrade
    const managerGrade = packet.managerOverallGrade
    if (!selfGrade || !managerGrade) continue
    const employee = employeeById.get(packet.employeeId)
    const fullName =
      employee?.fullName.trim() || `Employee ${packet.employeeId}`
    const tierDelta = TIER_INDEX[managerGrade] - TIER_INDEX[selfGrade]
    people.push({
      employeeId: packet.employeeId,
      fullName,
      shortName: shortManagerName(fullName),
      selfGrade,
      managerGrade,
      tierDelta,
      tone: ratingGridTone(tierDelta),
    })
  }

  people.sort((left, right) => {
    const gap = Math.abs(right.tierDelta) - Math.abs(left.tierDelta)
    if (gap !== 0) return gap
    return left.shortName.localeCompare(right.shortName)
  })

  const cellMap = new Map<string, RatingGridPerson[]>()
  for (const person of people) {
    const key = `${person.selfGrade}:${person.managerGrade}`
    const list = cellMap.get(key) ?? []
    list.push(person)
    cellMap.set(key, list)
  }

  const cells: RatingGridCell[] = []
  for (const managerGrade of RATING_GRID_BAND_ORDER) {
    for (const selfGrade of RATING_GRID_BAND_ORDER) {
      const list = cellMap.get(`${selfGrade}:${managerGrade}`) ?? []
      const tierDelta = TIER_INDEX[managerGrade] - TIER_INDEX[selfGrade]
      cells.push({
        selfGrade,
        managerGrade,
        tone: ratingGridTone(tierDelta),
        people: list,
      })
    }
  }

  const redFlagOutliers = people.filter(
    (person) => Math.abs(person.tierDelta) >= 2,
  )
  const amberCount = people.filter(
    (person) => Math.abs(person.tierDelta) === 1,
  ).length

  return {
    cells,
    people,
    total: people.length,
    redFlagCount: redFlagOutliers.length,
    amberCount,
    redFlagOutliers,
  }
}

export function formatTierGap(tierDelta: number): string {
  const abs = Math.abs(tierDelta)
  const unit = abs === 1 ? 'tier' : 'tiers'
  if (tierDelta > 0) return `+${tierDelta} ${unit}`
  if (tierDelta < 0) return `${tierDelta} ${unit}`
  return '0 tiers'
}
