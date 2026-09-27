import { useMemo } from 'react'
import { canViewAllReviews } from '@/lib/accessControl/types'
import { useAuth } from '@/lib/auth'
import { useHydratedGoalsSnapshot } from '@/lib/goals/useSharedGoalsSnapshot'
import { getReviewCycle } from '@/lib/reviews/store'
import { useCurrentPerson } from '@/lib/useCurrentPerson'
import {
  resolveHomeAbsence,
  resolveHomeOrientation,
  type HomeAbsence,
  type HomeOrientation,
} from './homeOrientation'

export function useHomeOrientation(): {
  orientation: HomeOrientation | null
  absence: HomeAbsence | null
  ready: boolean
} {
  const person = useCurrentPerson()
  const snapshot = useHydratedGoalsSnapshot()
  const { user } = useAuth()

  return useMemo(() => {
    if (!person || !snapshot) {
      return { orientation: null, absence: null, ready: false }
    }
    const cycleId =
      snapshot.availableCycles.find((option) => option.status === 'current')
        ?.id ?? snapshot.cycle.id
    const review = getReviewCycle(cycleId)
    const canOpenCalibration = canViewAllReviews(user?.permissions)
    const orientation = resolveHomeOrientation(
      person,
      new Date(),
      snapshot,
      review,
      { canOpenCalibration },
    )
    return {
      orientation,
      absence: orientation ? null : resolveHomeAbsence(person, new Date(), snapshot),
      ready: true,
    }
  }, [person, snapshot, user?.permissions])
}
