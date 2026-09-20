import { useMemo } from 'react'
import { useHydratedGoalsSnapshot } from '@/lib/goals/useSharedGoalsSnapshot'
import { useCurrentPerson } from '@/lib/useCurrentPerson'
import { resolveHomeBanners, type HomeBannerContent } from './homeBanner'

/**
 * Home banners need a hydrated goals snapshot. Before the API responds, the
 * store projects placeholder draft rows for every employee - those must not
 * drive banner CTAs or they flash away once real submissions load.
 */
export function useHomeBanners(): {
  banners: HomeBannerContent[]
  ready: boolean
} {
  const person = useCurrentPerson()
  const snapshot = useHydratedGoalsSnapshot()

  return useMemo(() => {
    if (!person || !snapshot) return { banners: [], ready: false }
    return {
      banners: resolveHomeBanners(person, new Date(), snapshot),
      ready: true,
    }
  }, [person, snapshot])
}
