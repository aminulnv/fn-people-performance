import { cyclePurposeOf, inferYearKey } from './purpose'
import type { ReviewCycle, ReviewPacket } from './types'

export type AnnualEligibilityReason =
  | 'joined_after_cutoff'
  | 'no_rated_quarter'

export type AnnualEligibilityResult = {
  eligible: boolean
  reason: AnnualEligibilityReason | null
  /** Short line for the people list. */
  message: string | null
  cutoffDate: string
}

/** Oct 1 of the annual year (YYYY-MM-DD). */
export function annualJoinCutoffDate(
  cycle: Pick<ReviewCycle, 'periodKey' | 'startDate' | 'yearKey' | 'type'> | null | undefined,
): string | null {
  if (!cycle || cyclePurposeOf(cycle) !== 'annual_appraisal') return null
  const year = cycle.yearKey ?? inferYearKey(cycle.periodKey, cycle.startDate)
  if (!year || !/^\d{4}$/.test(year)) return null
  return `${year}-10-01`
}

export function formatAnnualCutoffLabel(cutoffDate: string): string {
  const [year, month, day] = cutoffDate.split('-')
  if (!year || month !== '10' || day !== '01') return cutoffDate
  return `1 Oct ${year}`
}

export function annualEligibilityMessage(
  reason: AnnualEligibilityReason,
  cutoffDate: string,
): string {
  if (reason === 'joined_after_cutoff') {
    return `Joined after ${formatAnnualCutoffLabel(cutoffDate)}, so they’re not eligible for Annual.`
  }
  return 'No rated quarter yet, so they’re not eligible for Annual.'
}

function packetHasOverallRating(
  packet: Pick<
    ReviewPacket,
    | 'leaveQuarter'
    | 'publishedOverallGrade'
    | 'calibratedOverallGrade'
    | 'managerOverallGrade'
  > | null | undefined,
): boolean {
  if (!packet || packet.leaveQuarter) return false
  return Boolean(
    packet.publishedOverallGrade ||
      packet.calibratedOverallGrade ||
      packet.managerOverallGrade,
  )
}

/**
 * Who can be in an annual appraisal group.
 * Rated-quarter check runs only when `ratedEmployeeIds` is provided (loaded).
 */
export function annualEligibilityForEmployee(input: {
  cycle: Pick<ReviewCycle, 'periodKey' | 'startDate' | 'yearKey' | 'type'> | null | undefined
  /** Employee join / start date YYYY-MM-DD. */
  startDate: string | null | undefined
  /**
   * When set, employee must appear in this set (has ≥1 rated linked quarter).
   * When null/undefined, skip the rated-quarter rule (still loading).
   */
  ratedEmployeeIds?: Set<number> | null
  employeeId: number
}): AnnualEligibilityResult | null {
  const cutoffDate = annualJoinCutoffDate(input.cycle)
  if (!cutoffDate) return null

  const start = String(input.startDate ?? '').trim().slice(0, 10)
  if (start && start > cutoffDate) {
    return {
      eligible: false,
      reason: 'joined_after_cutoff',
      message: annualEligibilityMessage('joined_after_cutoff', cutoffDate),
      cutoffDate,
    }
  }

  if (input.ratedEmployeeIds) {
    if (!input.ratedEmployeeIds.has(input.employeeId)) {
      return {
        eligible: false,
        reason: 'no_rated_quarter',
        message: annualEligibilityMessage('no_rated_quarter', cutoffDate),
        cutoffDate,
      }
    }
  }

  return {
    eligible: true,
    reason: null,
    message: null,
    cutoffDate,
  }
}

/** Employee ids that have a manager/calibrated/published grade on any quarter packet. */
export function employeeIdsWithRatedQuarter(
  packets: Iterable<
    Pick<
      ReviewPacket,
      | 'employeeId'
      | 'leaveQuarter'
      | 'publishedOverallGrade'
      | 'calibratedOverallGrade'
      | 'managerOverallGrade'
    >
  >,
): Set<number> {
  const rated = new Set<number>()
  for (const packet of packets) {
    if (packetHasOverallRating(packet)) rated.add(packet.employeeId)
  }
  return rated
}
