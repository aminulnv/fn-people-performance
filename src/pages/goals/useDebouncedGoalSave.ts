import { useCallback, useEffect, useRef } from 'react'
import type { Goal } from '@/lib/goals/types'

const DEFAULT_DELAY_MS = 280

/** Batch rapid weight clicks into one persist. */
export function useDebouncedGoalSave(
  persist: (goals: Goal[]) => void,
  delayMs = DEFAULT_DELAY_MS,
) {
  const persistRef = useRef(persist)
  persistRef.current = persist
  const timerRef = useRef<number | null>(null)
  const pendingRef = useRef<Goal[] | null>(null)

  const flush = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending) persistRef.current(pending)
  }, [])

  const schedule = useCallback(
    (goals: Goal[]) => {
      pendingRef.current = goals
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        const pending = pendingRef.current
        pendingRef.current = null
        if (pending) persistRef.current(pending)
      }, delayMs)
    },
    [delayMs],
  )

  useEffect(() => () => flush(), [flush])

  return { schedule, flush }
}
