import { dayValue, todayDayValue } from './periods'
import type { CycleStage } from './types'

/** Where a stage sits relative to today, used to emphasise the timeline. */
export type StageProgress = 'done' | 'active' | 'upcoming'

/**
 * Stages with an end date are active across their window; milestones (a single
 * date, such as publishing) count as done from that day onward.
 */
export function stageProgress(
  stage: CycleStage,
  today = new Date(),
): StageProgress {
  if (!stage.startDate) return 'upcoming'
  const now = todayDayValue(today)
  if (now < dayValue(stage.startDate)) return 'upcoming'
  if (!stage.endDate) return 'done'
  return now > dayValue(stage.endDate) ? 'done' : 'active'
}
