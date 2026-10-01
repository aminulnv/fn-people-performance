import { GRADE_BAND_META, OVERALL_GRADE_ORDER } from '@/lib/reviews/labels'
import type { GradeBandId } from '@/lib/reviews/types'

export type OverallGradeReasonNeed = {
  required: boolean
  title: string
  hint: string
}

function gradeRank(grade: GradeBandId | null | undefined): number | null {
  if (!grade) return null
  const index = OVERALL_GRADE_ORDER.indexOf(grade)
  return index >= 0 ? index : null
}

export function gradeBandGap(
  left: GradeBandId | null | undefined,
  right: GradeBandId | null | undefined,
): number {
  const leftRank = gradeRank(left)
  const rightRank = gradeRank(right)
  if (leftRank == null || rightRank == null) return 0
  return Math.abs(leftRank - rightRank)
}

export function overallGradeReasonNeed(input: {
  actorRole: 'self' | 'manager'
  overallGrade: GradeBandId | null | ''
  leave?: boolean
  suggestedGrade?: GradeBandId | null
  selfOverallGrade?: GradeBandId | null
  gapCommentTiers?: number
}): OverallGradeReasonNeed | null {
  if (input.actorRole !== 'manager' || input.leave || !input.overallGrade) {
    return null
  }

  const overall = input.overallGrade
  const suggested = input.suggestedGrade ?? null
  const selfGrade = input.selfOverallGrade ?? null
  const gapTiers = Math.max(0, input.gapCommentTiers ?? 0)
  const differsFromSuggested = Boolean(suggested && suggested !== overall)
  const selfGap = gradeBandGap(overall, selfGrade)
  const differsFromSelf = Boolean(selfGrade && gapTiers > 0 && selfGap >= gapTiers)

  if (!differsFromSuggested && !differsFromSelf) return null

  if (differsFromSuggested && differsFromSelf) {
    return {
      required: true,
      title: 'Why this overall grade?',
      hint: `You chose a different grade than the calculated ${GRADE_BAND_META[suggested!].label}. Please add a short justification.`,
    }
  }
  if (differsFromSuggested) {
    return {
      required: true,
      title: 'Why this overall grade?',
      hint: `You chose a different grade than the calculated ${GRADE_BAND_META[suggested!].label}. Please add a short justification.`,
    }
  }
  return {
    required: true,
    title: 'Why this overall grade?',
    hint: 'Your grade is quite different from the self-review. Please add a short justification.',
  }
}

export function overallGradeReasonIsComplete(
  need: OverallGradeReasonNeed | null,
  reason: string,
): boolean {
  if (!need?.required) return true
  return reason.trim().length > 0
}
