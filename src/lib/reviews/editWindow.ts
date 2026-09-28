import { formatShortDate } from './periods'
import { stageProgress } from './stageProgress'
import { resolveCycleStatus } from './status'
import {
  getReviewStage,
  REVIEW_STAGE_LABEL,
} from './reviewStages'
import type {
  ReviewCycle,
  ReviewStageConfig,
  ReviewStageId,
} from './types'
import type { ScorecardViewStage } from './scorecardStages'

export type ReviewEditWindowLock = {
  title: string
  message: string
}

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
      title: 'Read Only',
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
    title: 'Read Only',
    message: `The ${REVIEW_STAGE_LABEL[formStage]} window closed on ${formatShortDate(endDate)}. This form is read-only.`,
  }
}
