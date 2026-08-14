import { useSyncExternalStore } from 'react'
import {
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
