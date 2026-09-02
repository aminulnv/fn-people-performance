import type {
  NotificationCatalogueEntry,
  NotificationEventKey,
  NotificationTemplate,
} from './types'

export const NOTIFICATION_EVENTS = {
  GOAL_WINDOW_OPENED: 'goal.window_opened',
  GOAL_DAY_7_REMINDER: 'goal.reminder.day_7',
  GOAL_DAY_14_REMINDER: 'goal.reminder.day_14',
  GOAL_DAY_25_REMINDER: 'goal.reminder.day_25',
  GOAL_DEADLINE_PASSED_EXCEPTIONS: 'goal.deadline.exceptions',
  GOAL_DEADLINE_CLOSED: 'goal.deadline.closed',
  GOAL_MANUAL_REMINDER: 'goal.reminder.manual',
  GOAL_TEAM_PENDING_SUMMARY: 'goal.team.pending_summary',
  GOAL_SUBMITTED: 'goal.submitted',
  GOAL_RESUBMITTED: 'goal.resubmitted',
  GOAL_MANAGER_EDITED: 'goal.manager_edited',
  GOAL_SENT_BACK: 'goal.sent_back',
  GOAL_APPROVED: 'goal.approved',
  GOAL_LATE_SUBMITTED: 'goal.late_submitted',
  GOAL_FINAL_APPROVAL_REQUESTED: 'goal.final_approval_requested',
  GOAL_PENDING_FINAL_APPROVAL: 'goal.pending_final_approval',
  GOAL_FINAL_APPROVED: 'goal.final_approved',
  GOAL_FINAL_APPROVED_MANAGER: 'goal.final_approved.manager',
  GOAL_FINAL_SENT_BACK: 'goal.final_sent_back',
  GOAL_FINAL_SENT_BACK_MANAGER: 'goal.final_sent_back.manager',
  GOAL_CHANGES_REQUIRE_APPROVAL: 'goal.changes_require_approval',
  GOAL_RESULTS_REMINDER: 'goal.results_reminder',
  GOAL_STALE_TEAM_SUMMARY: 'goal.team.stale_summary',
  GOAL_PROGRESS_ADJUSTED: 'goal.progress_adjusted',
  GOAL_CHECK_IN_COMPLETED: 'goal.check_in_completed',
  GOAL_CASCADED: 'goal.cascaded',
  GOAL_COMMENT_MENTIONED: 'goal.comment.mentioned',

  REVIEW_SELF_OPENED: 'review.self.opened',
  REVIEW_ASSIGNED: 'review.assigned',
  REVIEW_DUE_SOON: 'review.due_soon',
  REVIEW_OVERDUE: 'review.overdue',
  REVIEW_SELF_SUBMITTED: 'review.self.submitted',
  REVIEW_MANAGER_OPENED: 'review.manager.opened',
  REVIEW_READY_FOR_CALIBRATION: 'review.ready_for_calibration',
  REVIEW_CALIBRATION_OPENED: 'review.calibration.opened',
  REVIEW_CALIBRATION_DUE_SOON: 'review.calibration.due_soon',
  REVIEW_READY_TO_PUBLISH: 'review.ready_to_publish',
  REVIEW_RESULTS_FOR_MANAGERS: 'review.results_for_managers',
  REVIEW_RESULTS_PUBLISHED: 'review.results_published',
  REVIEW_RESULT_CORRECTED: 'review.result_corrected',
  REVIEW_DEADLINE_UPDATED: 'review.deadline_updated',

  ORG_MANAGER_CHANGED_EMPLOYEE: 'org.manager_changed.employee',
  ORG_MANAGER_CHANGED_MANAGER: 'org.manager_changed.manager',
  ACCESS_GRANTED: 'access.granted',
  ACCESS_REMOVED: 'access.removed',
} as const

function entry(
  key: NotificationEventKey,
  definition: Omit<NotificationCatalogueEntry, 'key'>,
): NotificationCatalogueEntry {
  return { key, ...definition }
}

const inApp = ['in_app'] as const
const inAppAndEmail = ['in_app', 'email'] as const

const entries: NotificationCatalogueEntry[] = [
  entry(NOTIFICATION_EVENTS.GOAL_WINDOW_OPENED, {
    kind: 'info',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Goal setting is open',
    body: '{{cycle}} · due {{deadline}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_DAY_7_REMINDER, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Goals still pending',
    body: '{{cycle}} · due {{deadline}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_DAY_14_REMINDER, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Goal deadline approaching',
    body: '{{days}} days left · {{cycle}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_DAY_25_REMINDER, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: '5 days left to submit goals',
    body: '{{cycle}} · due {{deadline}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_DEADLINE_PASSED_EXCEPTIONS, {
    kind: 'action',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Goal deadline has passed',
    body: 'Late {{cycle}} submissions still accepted',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_DEADLINE_CLOSED, {
    kind: 'info',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Goal submission is closed',
    body: '{{cycle}} · closed {{deadline}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_MANUAL_REMINDER, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Reminder from {{manager}}',
    body: '{{message}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_TEAM_PENDING_SUMMARY, {
    kind: 'summary',
    icon: 'users',
    channels: [...inApp],
    title: '{{count}} people still need to submit',
    body: '{{cycle}} goals pending',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_SUBMITTED, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: '{{employee}}’s goals need approval',
    body: '{{count}} goals · {{cycle}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_RESUBMITTED, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: '{{employee}} resubmitted goals',
    body: 'Updated {{cycle}} submission',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_MANAGER_EDITED, {
    kind: 'info',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Your goals were updated',
    body: '{{manager}} · {{cycle}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_SENT_BACK, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Goals sent back',
    body: '{{approver}}: “{{reason}}”',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_APPROVED, {
    kind: 'info',
    icon: 'target',
    channels: [...inApp],
    title: 'Your goals were approved',
    body: '{{manager}} · {{cycle}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_LATE_SUBMITTED, {
    kind: 'action',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Late goals need approval',
    body: '{{employee}} · {{cycle}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_FINAL_APPROVAL_REQUESTED, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Final approval needed for {{employee}}',
    body: '{{manager}} approved · your turn',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_PENDING_FINAL_APPROVAL, {
    kind: 'info',
    icon: 'target',
    channels: [...inApp],
    title: 'Pending final approval',
    body: 'Waiting on {{skipLevelManager}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_FINAL_APPROVED, {
    kind: 'info',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Goals fully approved',
    body: '{{skipLevelManager}} · {{cycle}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_FINAL_APPROVED_MANAGER, {
    kind: 'info',
    icon: 'target',
    channels: [...inApp],
    title: '{{employee}}’s goals fully approved',
    body: '{{skipLevelManager}} · {{cycle}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_FINAL_SENT_BACK, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Changes requested',
    body: '{{skipLevelManager}}: “{{reason}}”',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_FINAL_SENT_BACK_MANAGER, {
    kind: 'info',
    icon: 'target',
    channels: [...inApp],
    title: '{{employee}}’s goals sent back',
    body: '{{skipLevelManager}} requested changes',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_CHANGES_REQUIRE_APPROVAL, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Goal changes need approval',
    body: '{{employee}} · {{cycle}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_RESULTS_REMINDER, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Update your goal results',
    body: '{{cycle}} closes {{deadline}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_STALE_TEAM_SUMMARY, {
    kind: 'summary',
    icon: 'users',
    channels: [...inApp],
    title: '{{count}} people have stale progress',
    body: 'No updates since {{thresholdDate}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_PROGRESS_ADJUSTED, {
    kind: 'info',
    icon: 'target',
    channels: [...inApp],
    title: 'Goal progress updated',
    body: '{{manager}} · {{count}} metrics',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_CHECK_IN_COMPLETED, {
    kind: 'info',
    icon: 'clipboard-check',
    channels: [...inApp],
    title: 'Performance review complete',
    body: '{{manager}} · {{cycle}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_CASCADED, {
    kind: 'action',
    icon: 'target',
    channels: [...inApp],
    title: '{{manager}} cascaded a goal',
    body: '“{{goal}}” · {{cycle}}',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_COMMENT_MENTIONED, {
    kind: 'action',
    icon: 'users',
    channels: [...inAppAndEmail],
    title: '{{actor}} mentioned you',
    body: '“{{comment}}”',
  }),

  entry(NOTIFICATION_EVENTS.REVIEW_SELF_OPENED, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: 'Self-review is ready',
    body: '{{cycle}} · due {{deadline}}',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_ASSIGNED, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: 'Review requested for {{employee}}',
    body: '{{reviewType}} · due {{deadline}}',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_DUE_SOON, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: '{{days}} days left on a review',
    body: '{{employee}} · due {{deadline}}',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_OVERDUE, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Review overdue for {{employee}}',
    body: '{{cycle}} review still open',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_SELF_SUBMITTED, {
    kind: 'info',
    icon: 'clipboard-check',
    channels: [...inApp],
    title: '{{employee}} finished self-review',
    body: 'Ready for your {{cycle}} review',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_MANAGER_OPENED, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: '{{count}} reviews are ready',
    body: '{{cycle}} · due {{deadline}}',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_READY_FOR_CALIBRATION, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inApp],
    title: '{{count}} reviews ready to calibrate',
    body: '{{scope}} manager reviews complete',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_CALIBRATION_OPENED, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: 'Calibration open for {{scope}}',
    body: '{{count}} scorecards · due {{deadline}}',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_CALIBRATION_DUE_SOON, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Calibration closes in {{days}} days',
    body: '{{count}} left in {{scope}}',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_READY_TO_PUBLISH, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inApp],
    title: '{{cycle}} ready to publish',
    body: 'Calibration complete',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_RESULTS_FOR_MANAGERS, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: '{{cycle}} results available',
    body: 'Publishes to everyone {{date}}',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_RESULTS_PUBLISHED, {
    kind: 'info',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: 'Your {{cycle}} results are ready',
    body: 'Scorecard and feedback available',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_RESULT_CORRECTED, {
    kind: 'info',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: '{{cycle}} result updated',
    body: 'Corrected by {{administrator}}',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_DEADLINE_UPDATED, {
    kind: 'info',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: '{{cycle}} deadline updated',
    body: '{{stage}}: {{oldDate}} → {{newDate}}',
  }),

  entry(NOTIFICATION_EVENTS.ORG_MANAGER_CHANGED_EMPLOYEE, {
    kind: 'info',
    icon: 'users',
    channels: [...inAppAndEmail],
    title: 'Your manager changed',
    body: '{{newManager}} is now your manager',
  }),
  entry(NOTIFICATION_EVENTS.ORG_MANAGER_CHANGED_MANAGER, {
    kind: 'info',
    icon: 'users',
    channels: [...inApp],
    title: '{{employee}} now reports to you',
    body: 'Open goals and reviews follow them',
  }),
  entry(NOTIFICATION_EVENTS.ACCESS_GRANTED, {
    kind: 'security',
    icon: 'shield',
    channels: [...inAppAndEmail],
    title: 'Access granted',
    body: '{{accessProfile}} · by {{administrator}}',
  }),
  entry(NOTIFICATION_EVENTS.ACCESS_REMOVED, {
    kind: 'security',
    icon: 'shield',
    channels: [...inAppAndEmail],
    title: 'Access removed',
    body: '{{accessProfile}} · by {{administrator}}',
  }),
]

export const NOTIFICATION_CATALOGUE = new Map(
  entries.map((item) => [item.key, item]),
)

function renderCopy(
  copy: string,
  variables: Record<string, string | number | undefined>,
): string {
  return copy.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key]
    return value == null || value === '' ? '-' : String(value)
  })
}

export function renderNotificationTemplate(
  eventKey: NotificationEventKey,
  variables: Record<string, string | number | undefined>,
): NotificationTemplate {
  const definition = NOTIFICATION_CATALOGUE.get(eventKey)
  if (!definition) {
    throw new Error(`Unknown notification event: ${eventKey}`)
  }
  return {
    kind: definition.kind,
    icon: definition.icon,
    channels: [...definition.channels],
    title: renderCopy(definition.title, variables),
    body: renderCopy(definition.body, variables),
  }
}
