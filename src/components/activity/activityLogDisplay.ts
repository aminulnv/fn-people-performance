import type { FormattedActivityChange } from '@/lib/activity/formatChanges'
import { activityHeadline } from '@/lib/activity/formatChanges'
import type { ActivityEvent } from '@/lib/activity/types'

const GENERIC_HEADLINES_WITH_CHANGES = new Set([
  'Updated a goal',
  'Edited goals as manager',
  'Updated metric progress',
])

export function formatActivityTime(iso?: string, timeOnly = false): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  if (timeOnly) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function shouldShowActivityHeadline(
  event: ActivityEvent,
  changes: FormattedActivityChange[],
): boolean {
  const headline = activityHeadline(event)
  if (!headline) return false
  if (changes.length === 0) return true
  return !GENERIC_HEADLINES_WITH_CHANGES.has(headline)
}

export function isActivityFeedScoped(filters: {
  goalId?: string
  entityId?: string
  entityType?: string
}): boolean {
  return Boolean(filters.goalId || filters.entityId)
}
