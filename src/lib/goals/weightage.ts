import {
  hasMeasurePanelName,
  measurementPanels,
  normalizeMetricStrategy,
  sumPanelWeights,
} from './measurements'
import type { GoalCountPolicy } from '@/lib/reviews/types'
import type { Goal, Measurement } from './types'

export function sumGoalWeights(goals: { weight?: number }[]): number {
  return goals.reduce((sum, g) => sum + (Number(g.weight) || 0), 0)
}

/** True when at least one goal has no weight — 0 and empty both count. */
export function hasUnassignedGoalWeight(
  goals: { weight?: number }[],
): boolean {
  return goals.some((goal) => !(Number(goal.weight) || 0))
}

export function goalWeightIssue(
  goals: { weight?: number }[],
): string | null {
  if (goals.length === 0) return null
  if (hasUnassignedGoalWeight(goals)) return 'Every goal needs a weight.'
  if (sumGoalWeights(goals) !== 100) return 'Weights need to add up to 100%.'
  return null
}

/** How much of the 100% set is still free. Negative when the set is over. */
export function remainingGoalWeight(allocated: number): number {
  return 100 - allocated
}

/** One caption for the table total: allocated and remaining of the same 100%. */
export function allocatedWeightCaption(allocated: number): string {
  const remaining = remainingGoalWeight(allocated)
  if (remaining < 0) return `${allocated}% allocated · ${-remaining}% over`
  if (remaining === 0) return `${allocated}% allocated`
  return `${allocated}% allocated · ${remaining}% left`
}

/** Split 100% across goals. Leftover points go to the last goals. */
export function distributeGoalWeights<T extends { weight: number }>(
  goals: T[],
): T[] {
  if (goals.length === 0) return goals
  const each = Math.floor(100 / goals.length)
  const leftover = 100 - each * goals.length
  return goals.map((goal, index) => ({
    ...goal,
    weight: each + (index >= goals.length - leftover ? 1 : 0),
  }))
}

function goalWeightTotal<T extends { weight: number }>(goals: T[]): number {
  return goals.reduce((sum, goal) => sum + (Number(goal.weight) || 0), 0)
}

/** True when weights still match an even 100% split (or have never been set). */
export function isEvenGoalSplit<T extends { weight: number }>(goals: T[]): boolean {
  if (goals.length === 0) return true
  if (goals.every((goal) => !(Number(goal.weight) || 0))) return true
  const even = distributeGoalWeights(goals)
  return goals.every((goal, index) => goal.weight === even[index]?.weight)
}

/**
 * Add a goal and fill its weight. Even sets are re-split; a manual split keeps
 * its numbers and the new goal takes whatever is left of 100%.
 */
export function appendGoalWithWeight<T extends { weight: number }>(
  goals: T[],
  next: T,
): T[] {
  if (goals.length === 0) return [{ ...next, weight: 100 }]
  if (isEvenGoalSplit(goals)) return distributeGoalWeights([...goals, next])
  return [
    ...goals,
    { ...next, weight: Math.max(0, remainingGoalWeight(goalWeightTotal(goals))) },
  ]
}

/** Drop a goal. Even sets re-split; a manual split is left as the user typed it. */
export function removeGoalKeepingWeights<T extends { id: string; weight: number }>(
  goals: T[],
  goalId: string,
): T[] {
  const remaining = goals.filter((goal) => goal.id !== goalId)
  if (remaining.length === 0) return remaining
  if (isEvenGoalSplit(goals)) return distributeGoalWeights(remaining)
  return remaining
}

export function sumMeasurementWeights(measurements: Measurement[]): number {
  return sumPanelWeights(measurements)
}

export type SubmitGoalBlocker = {
  reason: string
  goalId?: string
  goalTitle?: string
  suffix?: string
  /** Solution the owner can take from the notice. */
  action?: 'add_goal'
}

export function goalCountWarning(
  goalCount: number,
  policy: GoalCountPolicy,
): string | null {
  if (goalCount < policy.recommendedMinimum) {
    return `This goal set has ${goalCount} goals. This cycle recommends ${policy.recommendedMinimum} to ${policy.recommendedMaximum} goals.`
  }
  if (goalCount > policy.recommendedMaximum) {
    return `This goal set has ${goalCount} goals. This cycle recommends keeping the focus on ${policy.recommendedMinimum} to ${policy.recommendedMaximum} goals.`
  }
  return null
}

const LEGACY_UNTITLED_CASCADE = /^untitled cascading goal from /i

export function isBlankGoalTitle(
  goal: Pick<Goal, 'description'>,
): boolean {
  const trimmed = goal.description.trim()
  return !trimmed || LEGACY_UNTITLED_CASCADE.test(trimmed)
}

/** Shown in tables and blockers. Cascaded goals use the manager title, never "Untitled". */
export function displayGoalTitle(goal: Goal, index: number): string {
  if (!isBlankGoalTitle(goal)) return goal.description.trim()
  const linked = goal.linkedGoalLabel?.trim()
  if (linked) return linked
  if (goal.cascadedFromGoalId) return 'This cascaded goal'
  return `Untitled goal ${index + 1}`
}

/** Value for the name field — strip the old untitled cascade placeholder. */
export function editorGoalTitle(goal: Pick<Goal, 'description'>): string {
  return isBlankGoalTitle(goal) ? '' : goal.description
}

function goalName(goal: Goal, index: number): string {
  return displayGoalTitle(goal, index)
}

function goalBlocker(
  goal: Goal,
  index: number,
  suffix: string,
): SubmitGoalBlocker {
  const goalTitle = goalName(goal, index)
  return {
    reason: `${goalTitle}${suffix}`,
    goalId: goal.id,
    goalTitle,
    suffix,
  }
}

/** Per-goal submit problems — used for the table icon and named banner links. */
export function collectGoalSubmitBlockers(goals: Goal[]): SubmitGoalBlocker[] {
  const blockers: SubmitGoalBlocker[] = []
  for (const [index, goal] of goals.entries()) {
    if (isBlankGoalTitle(goal)) {
      blockers.push(goalBlocker(goal, index, ' needs a title.'))
      continue
    }
    if (goal.measurements.length < 1) {
      blockers.push(
        goalBlocker(
          goal,
          index,
          goal.cascadedFromGoalId
            ? ' still needs a metric — or remove it.'
            : ' still needs a metric.',
        ),
      )
      continue
    }
    if (
      measurementPanels(goal.measurements).some((panel) => !hasMeasurePanelName(panel))
    ) {
      blockers.push(goalBlocker(goal, index, ' still needs a name on each metric.'))
      continue
    }
    if (sumMeasurementWeights(goal.measurements) !== 100) {
      blockers.push(
        goalBlocker(goal, index, ' metrics need to add up to 100%.'),
      )
    }
  }
  return blockers
}

export function submitBlockersForGoal(
  goalId: string,
  blockers: SubmitGoalBlocker[],
): SubmitGoalBlocker[] {
  return blockers.filter((blocker) => blocker.goalId === goalId)
}

const WEIGHT_SET_REASONS = new Set([
  'Every goal needs a weight.',
  'Weights need to add up to 100%.',
])

/** Count problems for the set banner. Weight stays on the Weight column. */
export function submitSetBlockers(
  blockers: SubmitGoalBlocker[],
): SubmitGoalBlocker[] {
  return blockers.filter(
    (blocker) => !blocker.goalId && !WEIGHT_SET_REASONS.has(blocker.reason),
  )
}

export function submitIssueForGoal(
  goalId: string,
  blockers: SubmitGoalBlocker[],
): string | undefined {
  return submitBlockersForGoal(goalId, blockers)[0]?.reason
}

/** Metric problems belong in the Metrics cell, not on the goal title. */
export function isMeasureGoalIssue(issue: string): boolean {
  return /needs a (measure|metric)|name on each (measure|metric)|(measures|metrics) need to add up/i.test(
    issue,
  )
}

/** Standalone sentence from a blocker suffix — no goal name. */
export function sentenceFromSuffix(suffix: string): string {
  const trimmed = suffix.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const MEASURE_ISSUE_TAILS = [
  /still needs a (?:measure|metric) — or remove it\.?$/i,
  /still needs a name on each (?:measure|metric)\.?$/i,
  /still needs a (?:measure|metric)\.?$/i,
  /(?:measures|metrics) need to add up to \d+%\.$/i,
  /(?:measures|metrics) need to add up\.?$/i,
]

/** Metrics-cell tooltip — the goal name is already on the row. */
export function measureIssueLabel(issue: string): string {
  for (const pattern of MEASURE_ISSUE_TAILS) {
    const match = issue.match(pattern)
    if (match) return sentenceFromSuffix(match[0])
  }
  return issue
}

/** Submit-button hover — same table wording, with the goal named when it helps. */
export function submitHoverHint(blocker: SubmitGoalBlocker): string {
  if (blocker.goalTitle && blocker.suffix) {
    const what = isMeasureGoalIssue(blocker.reason)
      ? measureIssueLabel(blocker.reason)
      : sentenceFromSuffix(blocker.suffix)
    return `${blocker.goalTitle}: ${what}`
  }
  return blocker.reason
}

export function submitHoverHints(blockers: SubmitGoalBlocker[]): string[] {
  const hints: string[] = []
  const seen = new Set<string>()
  for (const blocker of blockers) {
    const hint = submitHoverHint(blocker)
    if (seen.has(hint)) continue
    seen.add(hint)
    hints.push(hint)
  }
  return hints
}

export function canSubmitGoals(
  goals: Goal[],
  policy: GoalCountPolicy,
): {
  ok: boolean
  reasons: string[]
  blockers: SubmitGoalBlocker[]
  warning: string | null
} {
  const blockers: SubmitGoalBlocker[] = []
  if (goals.length < policy.minimumRequired) {
    blockers.push({
      reason: `Add at least ${policy.minimumRequired} ${policy.minimumRequired === 1 ? 'goal' : 'goals'}.`,
      action: 'add_goal',
    })
  }
  if (policy.maximumAllowed !== null && goals.length > policy.maximumAllowed) {
    blockers.push({
      reason: `This cycle allows no more than ${policy.maximumAllowed} goals.`,
    })
  }
  if (hasUnassignedGoalWeight(goals)) {
    blockers.push({ reason: 'Every goal needs a weight.' })
  }
  if (goals.length > 0 && sumGoalWeights(goals) !== 100) {
    blockers.push({ reason: 'Weights need to add up to 100%.' })
  }
  blockers.push(...collectGoalSubmitBlockers(goals))
  return {
    ok: blockers.length === 0,
    reasons: blockers.map((blocker) => blocker.reason),
    blockers,
    warning: goalCountWarning(goals.length, policy),
  }
}

export function measurementProgress(m: Measurement): number {
  if (m.kind === 'milestone') return m.complete ? 100 : 0

  const strategy = normalizeMetricStrategy(m.direction)

  const startValue = m.startValue ?? 0
  const targetValue = m.targetValue ?? 0
  const currentValue = m.currentValue ?? 0

  if (strategy === 'decrease') {
    if (startValue === targetValue) {
      return currentValue <= targetValue ? 100 : 0
    }
    const span = startValue - targetValue
    if (span <= 0) return 0
    return Math.max(
      0,
      Math.min(100, ((startValue - currentValue) / span) * 100),
    )
  }

  if (strategy === 'between') {
    const min = m.rangeMin ?? Math.min(startValue, targetValue)
    const max = m.rangeMax ?? Math.max(startValue, targetValue)
    return currentValue >= min && currentValue <= max ? 100 : 0
  }

  if (strategy === 'keep_above') {
    const threshold = m.rangeMin ?? targetValue
    return currentValue >= threshold ? 100 : 0
  }

  if (strategy === 'keep_below') {
    const threshold = m.rangeMax ?? targetValue
    return currentValue <= threshold ? 100 : 0
  }

  // increase (and legacy greater_than)
  const span = targetValue - startValue
  if (span <= 0) return currentValue >= targetValue ? 100 : 0
  return Math.max(0, Math.min(100, ((currentValue - startValue) / span) * 100))
}

export function goalCompletion(goal: Goal): number {
  if (goal.measurements.length === 0) return 0
  const total = sumMeasurementWeights(goal.measurements) || 100
  return goal.measurements.reduce((sum, m) => {
    return sum + (measurementProgress(m) * m.weight) / total
  }, 0)
}

export function overallCompletion(goals: Goal[]): number {
  if (goals.length === 0) return 0
  const total = sumGoalWeights(goals) || 100
  return goals.reduce(
    (sum, g) => sum + (goalCompletion(g) * g.weight) / total,
    0,
  )
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}
