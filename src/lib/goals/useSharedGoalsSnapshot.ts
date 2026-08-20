import { useEffect, useState } from 'react'
import { fetchGoalsSnapshot, watchGoalsSnapshot } from '@/lib/goalsApi'
import { getGoalsSnapshot } from '@/lib/goals/store'
import type { GoalsSnapshot } from '@/lib/goals/types'

const listeners = new Set<(snapshot: GoalsSnapshot) => void>()
let latest: GoalsSnapshot | null = null
let stopStoreWatch: (() => void) | null = null
let refreshTimer: number | null = null
let requestId = 0

function emit(snapshot: GoalsSnapshot) {
  if (listeners.size === 0) return
  latest = snapshot
  for (const listener of listeners) listener(snapshot)
}

function refreshSharedSnapshot() {
  const id = ++requestId
  void fetchGoalsSnapshot().then((snapshot) => {
    if (id !== requestId) return
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
    refreshSharedSnapshot()
    stopStoreWatch = watchGoalsSnapshot(scheduleSharedRefresh)
  }
  return () => {
    listeners.delete(onChange)
    if (listeners.size > 0) return
    stopSharedWatch()
  }
}

export function resetSharedGoalsSnapshotForTests() {
  listeners.clear()
  stopSharedWatch()
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
