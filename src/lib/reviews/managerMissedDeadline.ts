import type { ReviewCycle, ReviewPacket, ReviewPacketStatus } from './types'
import { managerReviewIsComplete } from './scorecardStages'

const PRE_MANAGER_SUBMITTED: ReviewPacketStatus[] = [
  'not_started',
  'self_in_progress',
  'self_submitted',
  'manager_in_progress',
]

/** End of the manager review window (date-only YYYY-MM-DD). */
export function managerReviewDeadlineDate(
  cycle: Pick<ReviewCycle, 'stagesConfig'> | null | undefined,
): string | null {
  if (!cycle?.stagesConfig) return null
  const stages = cycle.stagesConfig.reviewStages ?? []
  const managerStage = stages.find((stage) => stage.id === 'manager_review')
  const fromStage = managerStage?.end?.date?.trim()
  if (fromStage) return fromStage
  return cycle.stagesConfig.performance?.managerEnd?.date?.trim() || null
}

function endOfLocalDayMs(dateOnly: string): number {
  const [year, month, day] = dateOnly.split('-').map(Number)
  if (!year || !month || !day) return Number.NaN
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
}

export function managerReviewDeadlinePassed(
  cycle: Pick<ReviewCycle, 'stagesConfig'> | null | undefined,
  today: Date = new Date(),
): boolean {
  const deadline = managerReviewDeadlineDate(cycle)
  if (!deadline) return false
  const endMs = endOfLocalDayMs(deadline)
  if (Number.isNaN(endMs)) return false
  return today.getTime() > endMs
}

export function packetNeedsManagerForceMove(
  packet: Pick<ReviewPacket, 'status' | 'managerMissedDeadline' | 'leaveQuarter'>,
  cycle: Pick<ReviewCycle, 'stagesConfig'> | null | undefined,
  today: Date = new Date(),
): boolean {
  if (packet.leaveQuarter) return false
  if (packet.managerMissedDeadline) return false
  if (managerReviewIsComplete(packet.status)) return false
  if (!PRE_MANAGER_SUBMITTED.includes(packet.status)) return false
  return managerReviewDeadlinePassed(cycle, today)
}

export function managerMissedDeadlineNotice(packet: {
  managerMissedDeadline?: boolean
  managerOverallGrade?: string | null
} | null | undefined): { title: string; message: string } | null {
  if (!packet?.managerMissedDeadline) return null
  const hasManagerGrade = Boolean(packet.managerOverallGrade)
  return {
    title: 'Manager Missed Deadline',
    message: hasManagerGrade
      ? 'The manager review window closed before submission was complete. This packet moved to calibration so the HOD can finish the rating.'
      : 'The line manager did not submit by the deadline. This packet moved to calibration without a manager rating. The HOD can assign the final rating.',
  }
}
