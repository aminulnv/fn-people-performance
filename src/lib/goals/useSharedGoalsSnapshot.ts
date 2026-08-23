import { useEffect, useState } from 'react'
import {
  fetchGoalsSnapshot,
  isGoalCycleHydrationPending,
  watchGoalsSnapshot,
} from '@/lib/goalsApi'
import {
  getGoalsHydration,
  markCycleGoalsHydrated,
  resetGoalsHydrationForTests,
  subscribeGoalsHydration,
  type GoalsHydration,
} from '@/lib/goals/hydration'
import { getGoalsSnapshot } from '@/lib/goals/store'
import type { GoalsSnapshot } from '@/lib/goals/types'

const listeners = new Set<(snapshot: GoalsSnapshot) => void>()
const peekListeners = new Set<(snapshot: GoalsSnapshot) => void>()
let latest: GoalsSnapshot | null = null
let stopStoreWatch: (() => void) | null = null
let refreshTimer: number | null = null
let requestId = 0

function emit(snapshot: GoalsSnapshot) {
  latest = snapshot
  for (const listener of listeners) listener(snapshot)
  for (const listener of peekListeners) listener(snapshot)
}

function refreshSharedSnapshot() {
  const id = ++requestId
  void fetchGoalsSnapshot().then((snapshot) => {
    if (id !== requestId) return
    markCycleGoalsHydrated(snapshot.cycle.id)
    emit(snapshot)
  })
}

function scheduleSharedRefresh() {
  if (refreshTimer != null) window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null
    refreshSharedSnapshot()
  }, 150)
}

function onStoreChange() {
  const snapshot = getGoalsSnapshot()
  emit(snapshot)
  const cycleId = snapshot.cycle.id
  if (
    getGoalsHydration(cycleId).cycleReady ||
    isGoalCycleHydrationPending(cycleId)
  ) {
    return
  }
  scheduleSharedRefresh()
}

function stopSharedWatch() {
  stopStoreWatch?.()
  stopStoreWatch = null
  latest = null
  requestId += 1
  if (refreshTimer == null) return
  window.clearTimeout(refreshTimer)
  refreshTimer = null
}

/** One cycle hydration shared by every mounted Goals surface. */
export function watchSharedGoalsSnapshot(
  onChange: (snapshot: GoalsSnapshot) => void,
): () => void {
  listeners.add(onChange)
  if (latest) onChange(latest)
  if (listeners.size === 1) {
    const cycleId = getGoalsSnapshot().cycle.id
    if (getGoalsHydration(cycleId).cycleReady) {
      emit(getGoalsSnapshot())
    } else {
      refreshSharedSnapshot()
    }
    stopStoreWatch = watchGoalsSnapshot(onStoreChange)
  }
  return () => {
    listeners.delete(onChange)
    if (listeners.size > 0) return
    stopSharedWatch()
  }
}

export function resetSharedGoalsSnapshotForTests() {
  listeners.clear()
  peekListeners.clear()
  stopSharedWatch()
  resetGoalsHydrationForTests()
}

/** Subscribe to a snapshot that is already hydrated — does not start a fetch. */
export function subscribeHydratedGoalsSnapshot(
  onChange: (snapshot: GoalsSnapshot) => void,
): () => void {
  peekListeners.add(onChange)
  if (latest) onChange(latest)
  return () => {
    peekListeners.delete(onChange)
  }
}

/** Immediate store snapshot, then the shared remote hydration. */
export function useSharedGoalsSnapshot(): GoalsSnapshot {
  const [snapshot, setSnapshot] = useState(
    () => latest ?? getGoalsSnapshot(),
  )
  useEffect(() => watchSharedGoalsSnapshot(setSnapshot), [])
  return snapshot
}

/**
 * Null until the first shared fetch lands — Home banners must not flash
 * placeholder draft rows.
 */
export function useHydratedGoalsSnapshot(): GoalsSnapshot | null {
  const [snapshot, setSnapshot] = useState<GoalsSnapshot | null>(latest)
  useEffect(() => watchSharedGoalsSnapshot(setSnapshot), [])
  return snapshot
}

function hydrationForCycles(cycleIds: string[]): GoalsHydration {
  if (cycleIds.length === 0) return { ownReady: false, cycleReady: false }
  return {
    ownReady: cycleIds.every((id) => getGoalsHydration(id).ownReady),
    cycleReady: cycleIds.every((id) => getGoalsHydration(id).cycleReady),
  }
}

/** Whether own / cycle goal payloads have landed for one or more cycles. */
export function useGoalsHydration(cycleId?: string | string[]): GoalsHydration {
  const cycleIds = Array.isArray(cycleId)
    ? cycleId
    : [cycleId ?? getGoalsSnapshot().cycle.id]
  const idsKey = cycleIds.join('\0')
  const [hydration, setHydration] = useState(() => hydrationForCycles(cycleIds))
  useEffect(() => {
    const ids = idsKey ? idsKey.split('\0') : []
    const sync = () => setHydration(hydrationForCycles(ids))
    sync()
    return subscribeGoalsHydration(sync)
  }, [idsKey])
  return hydration
}
