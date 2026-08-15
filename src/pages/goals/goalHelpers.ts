import type {
  Goal,
  GoalProgressStatus,
  Metric,
  PersonGoals,
} from '@/lib/goals/types'
import { METRIC_UNITS, strategyLabel } from '@/lib/goals/measurements'

export function goalsDetailPath(cycleId: string, personId: string): string {
  return `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(personId)}`
}

export function goalsGoalPath(
  cycleId: string,
  personId: string,
  goalId: string,
): string {
  return `${goalsDetailPath(cycleId, personId)}/${encodeURIComponent(goalId)}`
}

export function goalTitle(goal: Goal, index: number): string {
  const trimmed = goal.description.trim()
  return trimmed || `Untitled goal ${index + 1}`
}

export function formatMetricNumber(value: number | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return String(value)
}

function primaryMetric(goal: Goal): Metric | null {
  const metrics = goal.measurements.filter((m) => m.kind === 'metric')
  return metrics.length === 1 ? metrics[0] : null
}

/** Compact table cell: initial → current → target. */
export function metricSummary(goal: Goal): string {
  const metric = primaryMetric(goal)
  if (metric) {
    return [
      formatMetricNumber(metric.startValue),
      formatMetricNumber(metric.currentValue),
      formatMetricNumber(metric.targetValue),
    ].join(' → ')
  }
  const done = goal.measurements.filter(
    (m) => m.kind === 'milestone' && m.complete,
  ).length
  const total = goal.measurements.length
  return `${done} → ${total}`
}

export type MetricTipDetails = {
  title: string
  initial: string
  current: string
  target: string
  unit: string
}

/** Tooltip model for a single-metric goal; null when the cell is a milestone summary. */
export function metricTipDetails(goal: Goal): MetricTipDetails | null {
  const metric = primaryMetric(goal)
  if (!metric) return null
  const unit =
    METRIC_UNITS.find((item) => item.value === metric.unit)?.label ?? metric.unit
  return {
    title: `${strategyLabel(metric.direction)} metric`,
    initial: formatMetricNumber(metric.startValue),
    current: formatMetricNumber(metric.currentValue),
    target: formatMetricNumber(metric.targetValue),
    unit,
  }
}

export function metricCountLabel(goal: Goal): string {
  const count = goal.measurements.length
  if (count === 0) return '—'
  return count === 1 ? '1 metric' : `${count} metrics`
}

export const GOAL_PROGRESS_STATUS_OPTIONS: {
  id: GoalProgressStatus
  label: string
}[] = [
    { id: 'on_track', label: 'On track' },
    { id: 'at_risk', label: 'At risk' },
    { id: 'off_track', label: 'Delayed' },
    { id: 'on_hold', label: 'On hold' },
    { id: 'complete', label: 'Complete' },
  ]

export function progressStatusClass(
  progressStatus?: GoalProgressStatus | null,
): string {
  if (!progressStatus) return 'pd-goals-progress-status--muted'
  return `pd-goals-progress-status--${progressStatus}`
}

export function trackToneClass(
  tone: 'ok' | 'warn' | 'muted' | 'danger' | 'hold' | 'complete',
): string {
  switch (tone) {
    case 'ok':
      return 'pd-goals-progress-status--on_track'
    case 'warn':
      return 'pd-goals-progress-status--at_risk'
    case 'danger':
      return 'pd-goals-progress-status--off_track'
    case 'hold':
      return 'pd-goals-progress-status--on_hold'
    case 'complete':
      return 'pd-goals-progress-status--complete'
    default:
      return 'pd-goals-progress-status--muted'
  }
}

/**
 * Progress status label for the table / detail summary.
 *
 * Mechanism:
 * 1. Prefer an explicit `goal.progressStatus` set by the owner/manager at any stage.
 * 2. Otherwise default to On track, independently of approval state.
 */
export function trackLabel(
  _status: PersonGoals['status'],
  _completion: number,
  progressStatus?: GoalProgressStatus,
): { label: string; tone: 'ok' | 'warn' | 'muted' | 'danger' | 'hold' | 'complete' } {
  if (progressStatus === 'on_track') return { label: 'On track', tone: 'ok' }
  if (progressStatus === 'at_risk') return { label: 'At risk', tone: 'warn' }
  if (progressStatus === 'off_track') return { label: 'Delayed', tone: 'danger' }
  if (progressStatus === 'on_hold') return { label: 'On hold', tone: 'hold' }
  if (progressStatus === 'complete') return { label: 'Complete', tone: 'complete' }
  return { label: 'On track', tone: 'ok' }
}

export type GoalsDirectoryScope = 'mine' | 'all' | 'reports' | 'department'

export function goalSectionLabels(
  personName: string,
  isOwnProfile: boolean,
): { goals: string; reports: string } {
  if (isOwnProfile) {
    return { goals: 'My Goals', reports: 'My Reports' }
  }

  const firstName = personName.trim().split(/\s+/)[0] || personName
  return {
    goals: `${firstName}'s Goals`,
    reports: `${firstName}'s Reports`,
  }
}

/** Same Everyone / My reports / My department rules as the People directory, plus My goals. */
export function personMatchesScope(
  person: { id: string; department: string; managerId?: string },
  scope: GoalsDirectoryScope,
  viewer: { id: string; department: string } | null,
): boolean {
  if (!viewer || scope === 'all') return true
  if (scope === 'mine') return person.id === viewer.id
  if (scope === 'reports') return person.managerId === viewer.id
  const department = viewer.department.trim()
  if (!department) return false
  return person.department.trim() === department
}

export function formatRefreshAge(iso?: string, now = Date.now()): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const minutes = Math.max(0, Math.floor((now - then) / 60_000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
