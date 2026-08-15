import {
  getReviewCycle,
  listReviewCycles,
} from '@/lib/reviews/store'
import {
  cycleStatusLabel,
  resolveCycleStatus,
} from '@/lib/reviews/status'
import type { ReviewCycle, ReviewCycleStatus } from '@/lib/reviews/types'
import type { DemoPhase, GoalsCycle, GoalsCycleOption } from './types'

export { cycleStatusLabel }

/** Map a review cycle into the Goals cycle shape (same identity). */
export function reviewCycleToGoalsCycle(
  cycle: ReviewCycle,
  phase: DemoPhase = 'window_open',
): GoalsCycle {
  return {
    id: cycle.id,
    label: cycle.name,
    day1: cycle.startDate,
    phase,
  }
}

export function listGoalCycleOptions(
  phaseByCycle: Record<string, DemoPhase> = {},
  today = new Date(),
): GoalsCycleOption[] {
  return listReviewCycles().map((cycle) => ({
    ...reviewCycleToGoalsCycle(
      cycle,
      phaseByCycle[cycle.id] ?? 'window_open',
    ),
    status: resolveCycleStatus(cycle, today),
  }))
}

/** Prefer current → most recent previous → first available. */
export function pickDefaultCycleId(
  options: GoalsCycleOption[],
): string | null {
  const current = options.find((c) => c.status === 'current')
  if (current) return current.id

  const previous = [...options]
    .filter((c) => c.status === 'previous')
    .sort((a, b) => b.day1.localeCompare(a.day1))[0]
  if (previous) return previous.id

  return options[0]?.id ?? null
}

export function resolveGoalsCycle(
  cycleId: string,
  phase: DemoPhase,
): GoalsCycle | null {
  const review = getReviewCycle(cycleId)
  if (!review) return null
  return reviewCycleToGoalsCycle(review, phase)
}

export function resolveGoalsCycleStatus(
  cycleId: string,
  today = new Date(),
): ReviewCycleStatus | null {
  const review = getReviewCycle(cycleId)
  if (!review) return null
  return resolveCycleStatus(review, today)
}

export function getCurrentReviewCycleId(today = new Date()): string | null {
  const current = listReviewCycles().find(
    (cycle) => resolveCycleStatus(cycle, today) === 'current',
  )
  return current?.id ?? null
}
