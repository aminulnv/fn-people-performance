import { newId } from './weightage'
import type { Goal, Metric, Milestone, ProgressLogEntry } from './types'

export type ProgressLogAuthor = {
  id?: string
  name: string
}

function stamp(
  author: ProgressLogAuthor,
  from: number | undefined,
  to: number,
  label?: string,
  at = new Date(),
): ProgressLogEntry {
  return {
    id: newId('plog'),
    recordedAt: at.toISOString(),
    authorId: author.id,
    authorName: author.name,
    from,
    to,
    label,
  }
}

export function recordMetricProgress(
  metric: Metric,
  nextValue: number | undefined,
  author: ProgressLogAuthor,
  at = new Date(),
): Metric {
  return {
    ...metric,
    currentValue: nextValue,
    progressLog: [
      ...(metric.progressLog ?? []),
      stamp(author, metric.currentValue, nextValue ?? 0, undefined, at),
    ],
  }
}

export function recordMilestoneProgress(
  todo: Milestone,
  complete: boolean,
  author: ProgressLogAuthor,
  at = new Date(),
): Milestone {
  if (todo.complete === complete) return todo
  return {
    ...todo,
    complete,
    progressLog: [
      ...(todo.progressLog ?? []),
      stamp(
        author,
        todo.complete ? 1 : 0,
        complete ? 1 : 0,
        todo.title.trim() || 'Task',
        at,
      ),
    ],
  }
}

export function isMilestoneProgressLog(entry: ProgressLogEntry): boolean {
  return Boolean(entry.label)
}

export function progressLogStatusLabel(entry: ProgressLogEntry): string {
  return entry.to ? 'Marked Completed' : 'Marked Incomplete'
}

export function numericProgressSummary(entry: ProgressLogEntry): string {
  const from = entry.from == null ? '—' : String(entry.from)
  return `${from} → ${entry.to}`
}

export function progressLogSummary(entry: ProgressLogEntry): string {
  if (isMilestoneProgressLog(entry)) {
    const title = entry.label ?? 'Task'
    return `${progressLogStatusLabel(entry)}: ${title}`
  }
  return numericProgressSummary(entry)
}

const progressDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatProgressTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return progressDateFormat.format(date)
}

export function latestProgressLogAt(
  measurements: Array<{ progressLog?: ProgressLogEntry[] }>,
): string | undefined {
  let latest: string | undefined
  for (const measurement of measurements) {
    for (const entry of measurement.progressLog ?? []) {
      if (!latest || entry.recordedAt > latest) latest = entry.recordedAt
    }
  }
  return latest
}

export function latestProgressAt(goal: Goal): string | undefined {
  return latestProgressLogAt(goal.measurements)
}

export function goalLastUpdatedAt(goal: Goal): string | undefined {
  return latestProgressAt(goal) ?? goal.updatedAt
}
