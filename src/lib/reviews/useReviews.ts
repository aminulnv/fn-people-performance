import { useEffect, useSyncExternalStore } from 'react'
import {
  areReviewCyclesHydrated,
  ensureReviewCyclesLoaded,
  getReviewsSnapshot,
  subscribeReviewsStore,
} from './store'
import type { ReviewsSnapshot } from './types'

function useHydrateReviewCycles() {
  useEffect(() => {
    void ensureReviewCyclesLoaded().catch(() => {
      /* pages treat unhydrated + empty as loading and retry on remount */
    })
  }, [])
}

export function useReviewsSnapshot(): ReviewsSnapshot {
  useHydrateReviewCycles()
  return useSyncExternalStore(
    subscribeReviewsStore,
    getReviewsSnapshot,
    getReviewsSnapshot,
  )
}

export function useReviewCyclesHydrated(): boolean {
  useHydrateReviewCycles()
  return useSyncExternalStore(
    subscribeReviewsStore,
    areReviewCyclesHydrated,
    areReviewCyclesHydrated,
  )
}
