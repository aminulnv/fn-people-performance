import {
  CALIBRATION_DUE_SOON_DAYS,
  GOAL_RESULTS_REMINDER_DAYS,
  GOAL_STALE_PROGRESS_DAYS,
  REVIEW_DUE_SOON_DAYS,
} from './reminderCadence'

/** Sample {{days}} for admin preview / test sends — matches each rule’s cadence. */
export function sampleDaysForEvent(eventKey: string): string | null {
  const dayMatch = /\.day_(\d+)$/.exec(eventKey)
  if (dayMatch) return dayMatch[1]
  if (eventKey === 'review.due_soon') return String(REVIEW_DUE_SOON_DAYS)
  if (eventKey === 'review.calibration.due_soon') {
    return String(CALIBRATION_DUE_SOON_DAYS)
  }
  if (eventKey === 'goal.results_reminder') {
    return String(GOAL_RESULTS_REMINDER_DAYS)
  }
  if (eventKey === 'goal.team.stale_summary') {
    return String(GOAL_STALE_PROGRESS_DAYS)
  }
  return null
}
