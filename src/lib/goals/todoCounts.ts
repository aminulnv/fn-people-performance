import { goalsCycleForPerson } from '@/lib/goals/cyclesFromReviews'
import {
  countPendingGoalApprovals,
  selectActorApprovalQueue,
} from '@/lib/goals/permissions'
import { canSubmitGoals } from '@/lib/goals/weightage'
import { areReviewCyclesHydrated } from '@/lib/reviews/store'
import type { DemoPerson, GoalsCycle, GoalsSnapshot, PersonGoals } from '@/lib/goals/types'

/**
 * Page-level Goals items that feed the red count badge.
 *
 * Counted on My Goals and on each visible report in My Reports
 * - Sent back for changes
 * - Action required / submit blockers
 * - Each submission waiting on this manager (My Reports only)
 *
 * Not counted — visible but not a to-do for the viewer
 * - Goal-count recommendation (non-blocking info)
 * - Late-submission / two-tier copy (the set already has a counted item)
 * - Edit-lock notices (the window is closed)
 * - Inline field errors inside a goal drawer
 */
export type GoalTodoCounts = {
  own: number
  reports: number
}

export function totalGoalTodos(counts: GoalTodoCounts): number {
  return counts.own + counts.reports
}

export function goalTodoBadgeLabel(
  count: number,
  _scope: 'own' | 'reports' | 'total' = 'total',
): string | undefined {
  if (count <= 0) return undefined
  return count === 1 ? '1 item needs attention' : `${count} items need attention`
}

function cycleAcceptsGoalInput(
  cycle: Pick<GoalsCycle, 'phase' | 'postWindowGoalPolicy'>,
): boolean {
  return (
    cycle.phase === 'window_open' ||
    (cycle.phase === 'hard_lock' &&
      cycle.postWindowGoalPolicy === 'two_tier_approval')
  )
}

function hasSubmitBlockers(
  row: PersonGoals,
  cycle: Pick<GoalsCycle, 'goalCountPolicy'>,
): boolean {
  if (row.status !== 'draft' && row.status !== 'sent_back') return false
  return !canSubmitGoals(row.goals, cycle.goalCountPolicy).ok
}

/** Warning/error banners on a goal set for the current cycle. */
export function countOwnGoalTodos(
  row: PersonGoals | null | undefined,
  cycle: Pick<GoalsCycle, 'goalCountPolicy'>,
  options?: { canSubmit?: boolean },
): number {
  if (!row) return 0
  const canSubmit = options?.canSubmit ?? true
  let count = 0
  if (row.status === 'sent_back') count += 1
  if (canSubmit && hasSubmitBlockers(row, cycle)) count += 1
  return count
}

/** Same attention items as My Goals, plus each set waiting on this manager. */
export function countReportGoalTodos(
  reports: readonly { row: PersonGoals }[],
  cycle: Pick<
    GoalsCycle,
    'goalCountPolicy' | 'assignedGroupId' | 'phase' | 'postWindowGoalPolicy'
  >,
): number {
  if (cycle.assignedGroupId === null) {
    return reports.filter(({ row }) => row.status === 'submitted').length
  }
  const canSubmit = cycleAcceptsGoalInput(cycle)
  return reports.reduce((total, { row }) => {
    const awaitingReview = row.status === 'submitted' ? 1 : 0
    return (
      total + awaitingReview + countOwnGoalTodos(row, cycle, { canSubmit })
    )
  }, 0)
}

export function countGoalTodosForPerson(
  person: DemoPerson,
  snapshot: Pick<GoalsSnapshot, 'cycle' | 'people' | 'byPerson'>,
  options?: { canSubmitOwn?: boolean },
): GoalTodoCounts {
  const queue = selectActorApprovalQueue(
    person,
    snapshot.people,
    snapshot.byPerson,
  )
  if (!areReviewCyclesHydrated()) {
    return { own: 0, reports: countPendingGoalApprovals(queue) }
  }
  const personCycle = goalsCycleForPerson(snapshot.cycle, person.id)
  const reports = countReportGoalTodos(queue, snapshot.cycle)
  if (personCycle.assignedGroupId === null) {
    return { own: 0, reports }
  }
  return {
    own: countOwnGoalTodos(snapshot.byPerson[person.id], personCycle, {
      canSubmit: options?.canSubmitOwn,
    }),
    reports,
  }
}
