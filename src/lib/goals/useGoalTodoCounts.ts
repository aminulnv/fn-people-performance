import { useEffect, useMemo, useState } from 'react'
import {
  subscribeHydratedGoalsSnapshot,
  watchSharedGoalsSnapshot,
} from '@/lib/goals/useSharedGoalsSnapshot'
import type { GoalsSnapshot } from '@/lib/goals/types'
import {
  countGoalTodosForPerson,
  totalGoalTodos,
  type GoalTodoCounts,
} from '@/lib/goals/todoCounts'
import { getGoalsSnapshot } from '@/lib/goals/store'
import { useCurrentPerson } from '@/lib/useCurrentPerson'

const EMPTY_COUNTS: GoalTodoCounts = { own: 0, reports: 0 }

/** Signed-in person’s My Goals + My Reports badge counts for the active cycle. */
export function useGoalTodoCounts(options?: {
  /** When false, only use a snapshot another surface already loaded. */
  load?: boolean
}): GoalTodoCounts & { total: number } {
  const shouldLoad = options?.load !== false
  const actor = useCurrentPerson()
  const [snapshot, setSnapshot] = useState<GoalsSnapshot | null>(() =>
    shouldLoad ? getGoalsSnapshot() : null,
  )

  useEffect(() => {
    if (shouldLoad) return watchSharedGoalsSnapshot(setSnapshot)
    return subscribeHydratedGoalsSnapshot(setSnapshot)
  }, [shouldLoad])

  return useMemo(() => {
    if (!actor || !snapshot) return { ...EMPTY_COUNTS, total: 0 }
    const person =
      snapshot.people.find((candidate) => candidate.id === actor.id) ?? actor
    const counts = countGoalTodosForPerson(person, snapshot)
    return { ...counts, total: totalGoalTodos(counts) }
  }, [actor, snapshot])
}
