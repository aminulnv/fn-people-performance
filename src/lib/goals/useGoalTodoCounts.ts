import { useMemo } from 'react'
import { useSharedGoalsSnapshot } from '@/lib/goals/useSharedGoalsSnapshot'
import {
  countGoalTodosForPerson,
  totalGoalTodos,
  type GoalTodoCounts,
} from '@/lib/goals/todoCounts'
import { useCurrentPerson } from '@/lib/useCurrentPerson'

const EMPTY_COUNTS: GoalTodoCounts = { own: 0, reports: 0 }

/** Signed-in person’s My Goals + My Reports badge counts for the active cycle. */
export function useGoalTodoCounts(): GoalTodoCounts & { total: number } {
  const actor = useCurrentPerson()
  const snapshot = useSharedGoalsSnapshot()

  return useMemo(() => {
    if (!actor) return { ...EMPTY_COUNTS, total: 0 }
    const person =
      snapshot.people.find((candidate) => candidate.id === actor.id) ?? actor
    const counts = countGoalTodosForPerson(person, snapshot)
    return { ...counts, total: totalGoalTodos(counts) }
  }, [actor, snapshot])
}
