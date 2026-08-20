import { hashMatches, normalizeUrlHash } from '@/lib/routing/urlHash'
import type { DemoPerson, Goal, Metric } from '@/lib/goals/types'
import { hasSystemPermission } from '@/lib/accessControl/types'
import {
  METRIC_UNITS,
  measurementPanels,
  strategyLabel,
} from '@/lib/goals/measurements'

export const GOALS_MY_GOALS_HASH = 'my-goals'
export const GOALS_MY_REPORTS_HASH = 'my-reports'
export const GOALS_EVERYONE_HASH = 'everyone'

export type GoalsManagerTab = 'mine' | 'team'

export function goalsDetailPath(cycleId: string, personId: string): string {
  return `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(personId)}`
}

export function goalsMyGoalsPath(cycleId: string, personId: string): string {
  return `${goalsDetailPath(cycleId, personId)}#${GOALS_MY_GOALS_HASH}`
}

export function goalsMyReportsPath(cycleId: string, personId: string): string {
  return `${goalsDetailPath(cycleId, personId)}#${GOALS_MY_REPORTS_HASH}`
}

export function hashForManagerTab(tab: GoalsManagerTab): string {
  return tab === 'team' ? GOALS_MY_REPORTS_HASH : GOALS_MY_GOALS_HASH
}

export function managerTabFromHash(hash: string): GoalsManagerTab | null {
  const normalized = normalizeUrlHash(hash)
  if (normalized === GOALS_MY_REPORTS_HASH) return 'team'
  if (normalized === GOALS_MY_GOALS_HASH) return 'mine'
  return null
}

export function isGoalsMyReportsHash(hash: string): boolean {
  return hashMatches(hash, GOALS_MY_REPORTS_HASH)
}

export function hashForGoalsScope(
  scope: Extract<GoalsDirectoryScope, 'mine' | 'reports' | 'all'>,
): string {
  switch (scope) {
    case 'mine':
      return GOALS_MY_GOALS_HASH
    case 'reports':
      return GOALS_MY_REPORTS_HASH
    case 'all':
      return GOALS_EVERYONE_HASH
  }
}

export function goalsScopeFromHash(
  hash: string,
): Extract<GoalsDirectoryScope, 'mine' | 'reports' | 'all'> | null {
  const normalized = normalizeUrlHash(hash)
  if (normalized === GOALS_MY_GOALS_HASH) return 'mine'
  if (normalized === GOALS_MY_REPORTS_HASH) return 'reports'
  if (normalized === GOALS_EVERYONE_HASH) return 'all'
  return null
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

export function metricTipFromMetric(metric: Metric): MetricTipDetails {
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

/** Tooltip model for a single-metric goal; null when the cell is a milestone summary. */
export function metricTipDetails(goal: Goal): MetricTipDetails | null {
  const metric = primaryMetric(goal)
  if (!metric) return null
  return metricTipFromMetric(metric)
}

export function metricCount(goal: Goal): number {
  return measurementPanels(goal.measurements).length
}

export function metricCountLabel(count: number): string {
  if (count === 0) return '—'
  return count === 1 ? '1 metric' : `${count} metrics`
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

export function canViewPersonGoals(
  person: { id: string; department: string; managerId?: string },
  viewer: {
    id: string
    department: string
    reportIds: string[]
    permissions?: DemoPerson['permissions']
  } | null,
  people: Array<{ id: string; managerId?: string }>,
): boolean {
  if (!viewer) return false
  if (person.id === viewer.id) return true
  if (
    hasSystemPermission(viewer.permissions, 'platform.read_all') ||
    hasSystemPermission(viewer.permissions, 'platform.write_all')
  ) {
    return true
  }
  if (person.managerId === viewer.id) return true

  const directManagerIds = new Set(
    people
      .filter((candidate) => candidate.managerId === viewer.id)
      .map((candidate) => candidate.id),
  )
  if (person.managerId && directManagerIds.has(person.managerId)) return true

  return false
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
