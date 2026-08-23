import type {
  CycleSourceLink,
  GradeBandId,
  ReviewPolicy,
  ScorecardPillar,
} from './types'
import { DEFAULT_GRADE_BANDS } from './reviewPolicy'

export type QuarterOutcome =
  | { kind: 'grade'; grade: GradeBandId }
  | { kind: 'zero' }
  | { kind: 'inapplicable' }
  | { kind: 'leave' }

export type LinkedQuarterInput = {
  sourceCycleId: string;
  label: string
  outcome: QuarterOutcome
}

const BAND_SCORE: Record<GradeBandId, number> = {
  exceptional: 5,
  exceeding: 4,
  performing: 3,
  developing: 2,
  unsatisfactory: 1,
}

export function scoreForBand(
  grade: GradeBandId,
  bands: ReviewPolicy['scorecard']['bands'] = DEFAULT_GRADE_BANDS,
): number {
  const maxSort = Math.max(...bands.map((band) => band.sort))
  const band = bands.find((item) => item.id === grade)
  if (!band) return BAND_SCORE[grade] ?? 0
  return maxSort - band.sort + 1
}

export function bandForScore(
  score: number,
  bands: ReviewPolicy['scorecard']['bands'] = DEFAULT_GRADE_BANDS,
): GradeBandId {
  const maxSort = Math.max(...bands.map((band) => band.sort))
  const rounded = Math.round(Math.min(maxSort, Math.max(1, score)))
  const sort = maxSort - rounded + 1
  return (
    bands.find((band) => band.sort === sort)?.id ??
    bands.find((band) => band.id === 'performing')?.id ??
    'performing'
  )
}

function linkForSource(
  sourceCycleId: string,
  links: CycleSourceLink[],
): CycleSourceLink | undefined {
  return links.find((link) => link.sourceCycleId === sourceCycleId)
}

export function isQuarterApplicable(
  outcome: QuarterOutcome,
  link?: CycleSourceLink,
): boolean {
  if (link?.excluded) return false
  if (outcome.kind === 'inapplicable' || outcome.kind === 'leave') return false
  return true
}

export function resolveQuarterGrade(
  outcome: QuarterOutcome,
  link?: CycleSourceLink,
): GradeBandId | null {
  if (!isQuarterApplicable(outcome, link)) return null
  if (outcome.kind === 'zero') return 'unsatisfactory'
  return outcome.kind === 'grade' ? outcome.grade : null
}

export function rollupGoalsPillar(input: {
  quarters: LinkedQuarterInput[]
  links: CycleSourceLink[]
  bands?: ReviewPolicy['scorecard']['bands']
}): {
  applicable: Array<{ sourceCycleId: string; label: string; grade: GradeBandId; weight: number }>
  averageScore: number | null
  averageGrade: GradeBandId | null
} {
  const bands = input.bands ?? DEFAULT_GRADE_BANDS
  const applicable = input.quarters
    .map((quarter) => {
      const link = linkForSource(quarter.sourceCycleId, input.links)
      const grade = resolveQuarterGrade(quarter.outcome, link)
      if (!grade || !link) return null
      return {
        sourceCycleId: quarter.sourceCycleId,
        label: quarter.label,
        grade,
        weight: link.weightPercent,
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))

  if (applicable.length === 0) {
    return { applicable: [], averageScore: null, averageGrade: null }
  }

  const weightTotal = applicable.reduce((sum, row) => sum + row.weight, 0)
  const averageScore =
    applicable.reduce(
      (sum, row) => sum + scoreForBand(row.grade, bands) * row.weight,
      0,
    ) / weightTotal

  return {
    applicable,
    averageScore,
    averageGrade: bandForScore(averageScore, bands),
  }
}

export function combinePillarScores(input: {
  policy: ReviewPolicy
  pillarGrades: Record<string, GradeBandId | null>
}): {
  weightedScore: number | null
  suggestedGrade: GradeBandId | null
  used: Array<{ pillar: ScorecardPillar; grade: GradeBandId; score: number }>
} {
  const used = input.policy.scorecard.pillars.flatMap((pillar) => {
    if (!pillar.enabled) return []
    const grade = input.pillarGrades[pillar.id]
    if (!grade) return []
    return [
      {
        pillar,
        grade,
        score: scoreForBand(grade, input.policy.scorecard.bands),
      },
    ]
  })
  const weightTotal = used.reduce((sum, row) => sum + row.pillar.weight, 0)
  if (used.length === 0 || weightTotal <= 0) {
    return { weightedScore: null, suggestedGrade: null, used }
  }
  const weightedScore =
    used.reduce((sum, row) => sum + row.score * row.pillar.weight, 0) / weightTotal
  return {
    weightedScore,
    suggestedGrade: bandForScore(weightedScore, input.policy.scorecard.bands),
    used,
  }
}
