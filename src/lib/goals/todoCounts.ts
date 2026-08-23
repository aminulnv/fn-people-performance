import { goalsCycleForPerson } from '@/lib/goals/cyclesFromReviews'
import { countPendingGoalApprovalsForManager } from '@/lib/goals/permissions'
import { canSubmitGoals } from '@/lib/goals/weightage'
import { areReviewCyclesHydrated } from '@/lib/reviews/store'
import type { DemoPerson, GoalsCycle, GoalsSnapshot, PersonGoals } from '@/lib/goals/types'

/**
 * Page-level Goals items that feed the red count badge.
 *
 * Counted
 * - Sent back for changes (My Goals warning)
 * - Action required / submit blockers (My Goals error)
 * - Each report submission waiting on this manager (My Reports)
 *
 * Not counted — visible but not a to-do for the viewer
 * - Goal-count recommendation (non-blocking info)
 * - Late-approval “waiting on your manager” copy
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
  scope: 'own' | 'reports' | 'total',
): string | undefined {
  if (count <= 0) return undefined
  if (scope === 'reports') {
    return `${count} awaiting review`
  }
  return count === 1 ? '1 item needs attention' : `${count} items need attention`
}

function hasSubmitBlockers(
  row: PersonGoals,
  cycle: Pick<GoalsCycle, 'goalCountPolicy'>,
): boolean {
  if (row.status !== 'draft' && row.status !== 'sent_back') return false
  return !canSubmitGoals(row.goals, cycle.goalCountPolicy).ok
}

/** Warning/error banners on My Goals for this person’s current cycle. */
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

export function countGoalTodosForPerson(
  person: DemoPerson,
  snapshot: Pick<GoalsSnapshot, 'cycle' | 'people' | 'byPerson'>,
  options?: { canSubmitOwn?: boolean },
): GoalTodoCounts {
  const reports = countPendingGoalApprovalsForManager(
    person,
    snapshot.people,
    snapshot.byPerson,
  )
  if (!areReviewCyclesHydrated()) {
    return { own: 0, reports }
  }
  const personCycle = goalsCycleForPerson(snapshot.cycle, person.id)
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
