import type { BuiltInSystemPermission } from '@/lib/accessControl/types'

export type ActivityActorType = 'user' | 'system' | 'import'

export type ActivitySource =
  | 'api'
  | 'web'
  | 'scheduler'
  | 'migration'
  | 'import'

export type ActivityChange = {
  field: string
  from?: unknown
  to?: unknown
}

export type ActivityEvent = {
  id: string
  eventKey: string
  entityType: string
  entityId: string
  actorEmployeeId?: number
  actorEmail?: string
  actorName?: string
  actorType: ActivityActorType
  subjectEmployeeId?: number
  cycleId?: string
  goalId?: string
  correlationId?: string
  requestId?: string
  source: ActivitySource
  summary: string
  changes: ActivityChange[]
  metadata: Record<string, unknown>
  occurredAt?: string
}

export type ActivityListResponse = {
  items: ActivityEvent[]
  nextCursor: string | null
}

export type ActivityListFilters = {
  limit?: number
  cursor?: string
  eventKey?: string
  entityType?: string
  entityId?: string
  actorEmployeeId?: number
  subjectEmployeeId?: number
  cycleId?: string
  goalId?: string
  from?: string
  to?: string
}

export const ACTIVITY_PERMISSIONS = [
  'activity.read_all',
  'activity.export',
] as const satisfies readonly BuiltInSystemPermission[]

/** Human-readable labels for known event keys. */
export const ACTIVITY_EVENT_LABELS: Record<string, string> = {
  'goal.created': 'Created a goal',
  'goal.updated': 'Updated a goal',
  'goal.deleted': 'Deleted a goal',
  'goal.duplicated': 'Duplicated a goal',
  'goal.copied_from_previous_cycle': 'Copied goals from a previous cycle',
  'goal.cascaded': 'Cascaded a goal',
  'goal.approval_withdrawn_for_revision': 'Withdrew goals for revision',
  'goal.manager_modified': 'Edited goals as manager',
  'goal_submission.submitted': 'Submitted goals',
  'goal_submission.resubmitted': 'Resubmitted goals',
  'goal_submission.sent_back': 'Sent goals back',
  'goal_submission.manager_approved': 'Approved goals (manager)',
  'goal_submission.final_approved': 'Gave final approval',
  'goal_submission.approved': 'Approved goals',
  'goal_submission.marked_incomplete': 'Marked goals incomplete',
  'goal.metric_progress_updated': 'Updated metric progress',
  'goal.milestone_completed': 'Completed a milestone',
  'goal.milestone_reopened': 'Reopened a milestone',
  'goal.progress_status_changed': 'Changed goal status',
  'goal.comment_added': 'Added a comment',
  'goal.check_in_rating_submitted': 'Submitted a check-in rating',
  'goal_reminder.sent': 'Sent a goal reminder',
  'review_cycle.created': 'Created a review cycle',
  'review_cycle.test_created': 'Created a test cycle',
  'review_cycle.settings_updated': 'Updated cycle settings',
  'review_cycle.stages_updated': 'Updated cycle stages',
  'review_cycle.calibration_updated': 'Updated calibration settings',
  'review_cycle.deleted': 'Deleted a review cycle',
  'review_cycle.imported': 'Imported a review cycle',
  'employee.created': 'Created an employee',
  'employee.profile_updated': 'Updated an employee profile',
  'employee.activated': 'Activated an employee',
  'employee.deactivated': 'Deactivated an employee',
  'employee.identifier_changed': 'Changed an employee ID',
  'employee.manager_changed': 'Changed reporting manager',
  'employee.department_changed': 'Changed department',
  'employee.team_changed': 'Changed team',
  'employee.division_changed': 'Changed division',
  'department.created': 'Created a department',
  'department.owner_assigned': 'Assigned a department owner',
  'department.hrbp_assigned': 'Assigned a department HRBP',
  'access.profile_assigned': 'Assigned an access profile',
  'access.profile_changed': 'Changed an access profile',
  'access.profile_removed': 'Removed an access profile',
  'goals.imported': 'Imported goals from browser storage',
}

export function activityEventLabel(eventKey: string): string {
  return ACTIVITY_EVENT_LABELS[eventKey] ?? eventKey.replace(/\./g, ' ')
}
