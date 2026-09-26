import { useMemo } from 'react'
import { useHydratedGoalsSnapshot } from '@/lib/goals/useSharedGoalsSnapshot'
import { getReviewCycle } from '@/lib/reviews/store'
import { useCurrentPerson } from '@/lib/useCurrentPerson'
import {
  resolveHomeOrientation,
  type HomeOrientation,
} from './homeOrientation'

export function useHomeOrientation(): {
  orientation: HomeOrientation | null
  ready: boolean
} {
  const person = useCurrentPerson()
  const snapshot = useHydratedGoalsSnapshot()

  return useMemo(() => {
    if (!person || !snapshot) return { orientation: null, ready: false }
    const cycleId =
      snapshot.availableCycles.find((option) => option.status === 'current')
        ?.id ?? snapshot.cycle.id
    const review = getReviewCycle(cycleId)
    return {
      orientation: resolveHomeOrientation(
        person,
        new Date(),
        snapshot,
        review,
      ),
      ready: true,
    }
  }, [person, snapshot])
}
