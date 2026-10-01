import { formatShortDate } from './periods'
import { managerMissedDeadlineNotice } from './managerMissedDeadline'
import { selfReviewSubmitted } from './packetVisibility'
import { stageProgress } from './stageProgress'
import { resolveCycleStatus } from './status'
import {
  getReviewStage,
  REVIEW_STAGE_LABEL,
} from './reviewStages'
import type {
  ReviewCycle,
  ReviewPacket,
  ReviewStageConfig,
  ReviewStageId,
} from './types'
import type { ScorecardViewStage } from './scorecardStages'

export type ReviewEditWindowLock = {
  title: string
  message: string
}

const READ_ONLY = 'Read Only' as const

function stageEndDate(stage: ReviewStageConfig | undefined): string | null {
  return stage?.end?.date?.trim() || null
}

function stageAsTimeline(stage: ReviewStageConfig) {
  return {
    id: stage.id as 'self_review',
    label: REVIEW_STAGE_LABEL[stage.id],
    startDate: stage.start?.date ?? '',
    endDate: stage.end?.date,
  }
}

/** Stages where a person still writes a review form. */
export function reviewFormStageId(
  stage: ScorecardViewStage | ReviewStageId | null | undefined,
): 'self_review' | 'manager_review' | null {
  if (stage === 'self_review' || stage === 'manager_review') return stage
  return null
}

/**
 * When the cycle or the relevant review window has ended, reviews are
 * read-only. Returns copy for the under-navbar ribbon, or null when open.
 */
export function describeReviewEditWindowLock(input: {
  cycle: Pick<ReviewCycle, 'startDate' | 'endDate' | 'name'> | null | undefined
  stages?: ReviewStageConfig[]
  /** Self or manager form the viewer would edit. */
  formStage?: ScorecardViewStage | ReviewStageId | null
  today?: Date
}): ReviewEditWindowLock | null {
  const { cycle, stages, today = new Date() } = input
  if (!cycle) return null

  if (resolveCycleStatus(cycle, today) === 'previous') {
    const endedOn = formatShortDate(cycle.endDate)
    return {
      title: READ_ONLY,
      message: `This cycle ended on ${endedOn}. Reviews are read-only.`,
    }
  }

  const formStage = reviewFormStageId(input.formStage)
  if (!formStage) return null

  const stage = getReviewStage(stages, formStage)
  if (!stage?.enabled) return null
  const endDate = stageEndDate(stage)
  if (!endDate) return null

  if (stageProgress(stageAsTimeline(stage), today) !== 'done') return null

  return {
    title: READ_ONLY,
    message: `The ${REVIEW_STAGE_LABEL[formStage]} window closed on ${formatShortDate(endDate)}. This form is read-only.`,
  }
}

/**
 * Why this scorecard form is read-only for the current viewer — window,
 * submit/release state, or role. Null when Edit should still be available.
 */
export function describeReviewEditLock(input: {
  cycle: Pick<ReviewCycle, 'startDate' | 'endDate' | 'name'> | null | undefined
  stages?: ReviewStageConfig[]
  formStage?: ScorecardViewStage | ReviewStageId | null
  packet?: Pick<
    ReviewPacket,
    | 'status'
    | 'selfSubmittedAt'
    | 'managerMissedDeadline'
    | 'managerOverallGrade'
  > | null
  isSubject?: boolean
  isManager?: boolean
  today?: Date
}): ReviewEditWindowLock | null {
  const windowLock = describeReviewEditWindowLock(input)
  if (windowLock) return windowLock

  const formStage = reviewFormStageId(input.formStage)
  if (!formStage) return null

  const { packet, isSubject = false, isManager = false } = input

  if (formStage === 'self_review') {
    if (!isSubject) {
      return {
        title: READ_ONLY,
        message: 'Only the employee can edit this self-review.',
      }
    }
    if (selfReviewSubmitted(packet)) {
      return {
        title: READ_ONLY,
        message:
          'You already submitted this self-review. This form is read-only.',
      }
    }
    return null
  }

  if (!isManager) {
    return {
      title: READ_ONLY,
      message: 'Only the line manager can edit this review.',
    }
  }
  if (formStage === 'manager_review') {
    const missed = managerMissedDeadlineNotice(packet)
    if (missed) return missed
  }
  if (
    packet &&
    (packet.status === 'released_to_managers' ||
      packet.status === 'released_to_employees')
  ) {
    return {
      title: READ_ONLY,
      message: 'Grades have been released. This form is read-only.',
    }
  }
  return null
}
