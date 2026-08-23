import { useSyncExternalStore } from 'react'
import {
  areReviewCyclesHydrated,
  getReviewsSnapshot,
  subscribeReviewsStore,
} from './store'
import type { ReviewsSnapshot } from './types'

export function useReviewsSnapshot(): ReviewsSnapshot {
  return useSyncExternalStore(
    subscribeReviewsStore,
    getReviewsSnapshot,
    getReviewsSnapshot,
  )
}

export function useReviewCyclesHydrated(): boolean {
  return useSyncExternalStore(
    subscribeReviewsStore,
    areReviewCyclesHydrated,
    areReviewCyclesHydrated,
  )
}
