import { applyHardLockIncompletes } from '../goals/incompleteJob.mjs'
import { runGoalReminderJob } from '../goals/reminderJob.mjs'
import {
  runScheduledCalibrationLocks,
  runScheduledManagerForceMoves,
  runScheduledPublishReleases,
} from './cycleStageActions.mjs'

let timer = null
let running = false
let lastDayKey = ''

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

/**
 * Frequent tick: publish auto-release, manager force-move, calibration lock.
 * Daily (once per UTC day): goal reminders + hard-stop incompletes.
 */
export async function runCycleStageSchedulerTick(now = new Date()) {
  if (running) return { skipped: true }
  running = true
  try {
    const forceMove = await runScheduledManagerForceMoves({ now })
    // Lock due calibration sittings before auto-publish so the publish gate can pass.
    const calibration = await runScheduledCalibrationLocks({ now })
    const publish = await runScheduledPublishReleases({ now })

    const dayKey = utcDayKey(now)
    let goals = null
    if (dayKey !== lastDayKey) {
      const reminders = await runGoalReminderJob({ today: now })
      const incomplete = await applyHardLockIncompletes({ today: now })
      lastDayKey = dayKey
      goals = { dayKey, reminders, incomplete }
    }

    return { forceMove, publish, calibration, goals }
  } finally {
    running = false
  }
}

/** @deprecated Prefer runCycleStageSchedulerTick — kept for older imports. */
export async function runNotificationSchedulerTick(now = new Date()) {
  const result = await runCycleStageSchedulerTick(now)
  if (result.skipped) return result
  return result.goals ?? { dayKey: utcDayKey(now), reminders: null, incomplete: null }
}

export function startCycleStageScheduler({
  intervalMs = Number(
    process.env.PLATFORM_CYCLE_SCHEDULER_INTERVAL_MS ||
      process.env.PLATFORM_NOTIFICATION_SCHEDULER_INTERVAL_MS ||
      60_000,
  ),
} = {}) {
  if (timer) return
  const tick = () => {
    void runCycleStageSchedulerTick()
      .then((result) => {
        if (result.skipped) return
        console.log('[platform-api] cycle stage scheduler', JSON.stringify(result))
      })
      .catch((error) => {
        console.error('[platform-api] cycle stage scheduler failed', error)
      })
  }
  const ms = Math.max(30_000, intervalMs)
  timer = setInterval(tick, ms)
  if (typeof timer.unref === 'function') timer.unref()
  setTimeout(tick, 8_000).unref?.()
  console.log(`[platform-api] cycle stage scheduler every ${ms}ms`)
}

/** @deprecated Alias — starts the full cycle stage scheduler. */
export function startNotificationScheduler(options) {
  return startCycleStageScheduler(options)
}

export function stopCycleStageScheduler() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

export function stopNotificationScheduler() {
  stopCycleStageScheduler()
}
