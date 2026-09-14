import { useEffect, useSyncExternalStore } from 'react'
import {
  areReviewCyclesHydrated,
  ensureReviewCyclesLoaded,
  getReviewsSnapshot,
  subscribeReviewsStore,
} from './store'
import {
  areScorecardFormsHydrated,
  ensureScorecardFormsLoaded,
  getScorecardFormsSnapshot,
  subscribeScorecardFormsStore,
} from './scorecardFormsStore'
import type { ReviewsSnapshot, ScorecardForm } from './types'

function useHydrateReviewCycles() {
  useEffect(() => {
    void ensureReviewCyclesLoaded().catch(() => {
      /* pages treat unhydrated + empty as loading and retry on remount */
    })
  }, [])
}

function useHydrateScorecardForms() {
  useEffect(() => {
    void ensureScorecardFormsLoaded().catch(() => {
      /* builder treats unhydrated + empty as loading */
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

export function useScorecardFormsSnapshot(): ScorecardForm[] {
  useHydrateScorecardForms()
  return useSyncExternalStore(
    subscribeScorecardFormsStore,
    getScorecardFormsSnapshot,
    getScorecardFormsSnapshot,
  )
}

export function useScorecardFormsHydrated(): boolean {
  useHydrateScorecardForms()
  return useSyncExternalStore(
    subscribeScorecardFormsStore,
    areScorecardFormsHydrated,
    areScorecardFormsHydrated,
  )
}
