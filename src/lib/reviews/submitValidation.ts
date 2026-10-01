import { GRADE_BAND_ORDER } from './labels'
import { overallGradeReasonIsComplete, overallGradeReasonNeed } from './overallGradeReason'
import { incompleteRequiredQuestions } from './questionAnswers'
import {
  enabledPillars,
  enabledQuestions,
  feedbackEnabledForVisibility,
  gradesGoalsSeparately,
  gradesOverall,
  scorecardFeedbackOf,
} from './reviewPolicy'
import type { GradeBandId, ReviewActorRole, ReviewPolicy } from './types'
import {
  isSkillScorePillarId,
  normalizeSkillGrade,
  skillIdFromScorePillarId,
} from '@/lib/skills/reviewScores'
import {
  isValueScorePillarId,
  valueIdFromScorePillarId,
} from '@/lib/values/reviewScores'

const PACKED_FEEDBACK_IDS = new Set(['strengths', 'developments'])

export type ScorecardSubmitPillarScore = {
  pillarId: string
  grade?: string | null
}

export type DescribeScorecardSubmitBlockInput = {
  policy: ReviewPolicy
  actorRole: ReviewActorRole
  leave?: boolean
  overallGrade?: string | null
  goalsGrade?: string | null
  q4Grade?: string | null
  /** Manager annual: Goals come from the quarter rollup; Q4 is the typed grade. */
  useWeightedSuggest?: boolean
  answersById?: Record<string, string | null | undefined>
  pillarScores?: ScorecardSubmitPillarScore[]
  skillIds?: readonly string[]
  skillGrades?: Record<string, string | null | undefined>
  valueIds?: readonly string[]
  valueGrades?: Record<string, string | null | undefined>
  strengths?: string | null
  developments?: string | null
  suggestedGrade?: string | null
  selfOverallGrade?: string | null
  gapCommentTiers?: number
  overrideReason?: string | null
}

function isPerformanceGrade(value: string | null | undefined): boolean {
  return Boolean(value && GRADE_BAND_ORDER.includes(value as GradeBandId))
}

function isGradedSkill(value: string | null | undefined): boolean {
  return Boolean(normalizeSkillGrade(value))
}

function visibilityForActor(
  actorRole: ReviewActorRole,
): 'employee' | 'manager' {
  return actorRole === 'self' ? 'employee' : 'manager'
}

function gradeFromPillar(
  scores: ScorecardSubmitPillarScore[] | undefined,
  pillarId: string,
): string | null {
  const match = scores?.find((score) => score.pillarId === pillarId)
  return match?.grade ?? null
}

function skillGradeFor(
  skillId: string,
  input: DescribeScorecardSubmitBlockInput,
): string | null | undefined {
  if (input.skillGrades && Object.prototype.hasOwnProperty.call(input.skillGrades, skillId)) {
    return input.skillGrades[skillId]
  }
  const pillarId = `skill:${skillId}`
  const fromScores = input.pillarScores?.find((score) => score.pillarId === pillarId)
  if (fromScores) return fromScores.grade
  const prefixed = input.pillarScores?.find(
    (score) => skillIdFromScorePillarId(score.pillarId) === skillId,
  )
  return prefixed?.grade
}

function valueGradeFor(
  valueId: string,
  input: DescribeScorecardSubmitBlockInput,
): string | null | undefined {
  if (input.valueGrades && Object.prototype.hasOwnProperty.call(input.valueGrades, valueId)) {
    return input.valueGrades[valueId]
  }
  return input.pillarScores?.find(
    (score) =>
      score.pillarId === `value:${valueId}` ||
      valueIdFromScorePillarId(score.pillarId) === valueId,
  )?.grade
}

/**
 * First reason this scorecard cannot be submitted, or null when complete.
 * Drafts skip this. Optional questions and optional feedback stay optional.
 */
export function describeScorecardSubmitBlock(
  input: DescribeScorecardSubmitBlockInput,
): string | null {
  const { policy, actorRole } = input
  const leave = Boolean(input.leave)
  const pillars = enabledPillars(policy)
  const gradeGoals = gradesGoalsSeparately(policy)
  const gradeOverall = gradesOverall(policy)
  const visibility = visibilityForActor(actorRole)

  if (gradeGoals && !leave) {
    const goalsOn = pillars.some((pillar) => pillar.id === 'goals')
    if (goalsOn) {
      if (input.useWeightedSuggest && actorRole === 'manager') {
        if (!isPerformanceGrade(input.q4Grade ?? null)) {
          return 'Select a Q4 Goals grade before submitting.'
        }
      } else if (
        !isPerformanceGrade(
          input.goalsGrade ?? gradeFromPillar(input.pillarScores, 'goals'),
        )
      ) {
        return 'Select a Goals grade before submitting.'
      }
    }
  }

  const skillsOn = pillars.some((pillar) => pillar.id === 'skills')
  if (skillsOn) {
    const skillIds = input.skillIds ?? []
    if (
      skillIds.some((skillId) => !isGradedSkill(skillGradeFor(skillId, input)))
    ) {
      return 'Grade every skill before submitting.'
    }
  }

  const valuesOn = pillars.some((pillar) => pillar.id === 'values')
  if (valuesOn) {
    const valueIds = input.valueIds ?? []
    if (
      valueIds.some((valueId) => !isPerformanceGrade(valueGradeFor(valueId, input)))
    ) {
      return 'Grade every core value before submitting.'
    }
  }

  for (const pillar of pillars) {
    if (
      pillar.id === 'goals' ||
      pillar.id === 'skills' ||
      pillar.id === 'values'
    ) {
      continue
    }
    const fromScores = gradeFromPillar(input.pillarScores, pillar.id)
    if (!isPerformanceGrade(fromScores)) {
      return `Select a ${pillar.label} grade before submitting.`
    }
  }

  const questions = enabledQuestions(policy, visibility).filter(
    (question) => !PACKED_FEEDBACK_IDS.has(question.id),
  )
  if (
    incompleteRequiredQuestions(questions, input.answersById ?? {}).length > 0
  ) {
    return 'Answer every required question before submitting.'
  }

  if (gradeOverall && !leave && !isPerformanceGrade(input.overallGrade ?? null)) {
    return 'Select an overall grade before submitting.'
  }

  if (feedbackEnabledForVisibility(policy, visibility)) {
    const feedback = scorecardFeedbackOf(policy)
    if (feedback.required) {
      const strengths = String(input.strengths ?? '').trim()
      const developments = String(input.developments ?? '').trim()
      if (!strengths || !developments) {
        const [labelA, labelB] = feedback.labels
        return `Fill in ${labelA} and ${labelB} before submitting.`
      }
    }
  }

  if (actorRole === 'manager') {
    const need = overallGradeReasonNeed({
      actorRole: 'manager',
      overallGrade: (input.overallGrade ?? '') as GradeBandId | '',
      leave,
      suggestedGrade: (input.suggestedGrade ?? null) as GradeBandId | null,
      selfOverallGrade: (input.selfOverallGrade ?? null) as GradeBandId | null,
      gapCommentTiers:
        input.gapCommentTiers ?? policy.managerReview.gapCommentTiers,
    })
    if (!overallGradeReasonIsComplete(need, input.overrideReason ?? '')) {
      return 'Write why this overall grade differs before submitting.'
    }
  }

  return null
}

/** Skill / value ids present on a packet — used when the catalog is not passed. */
export function skillIdsFromPillarScores(
  scores: ScorecardSubmitPillarScore[],
): string[] {
  return scores
    .filter((score) => isSkillScorePillarId(score.pillarId))
    .map((score) => skillIdFromScorePillarId(score.pillarId))
    .filter((id): id is string => Boolean(id))
}

export function valueIdsFromPillarScores(
  scores: ScorecardSubmitPillarScore[],
): string[] {
  return scores
    .filter((score) => isValueScorePillarId(score.pillarId))
    .map((score) => valueIdFromScorePillarId(score.pillarId))
    .filter((id): id is string => Boolean(id))
}
