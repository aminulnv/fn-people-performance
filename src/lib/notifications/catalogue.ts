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
    body: '{{cycle}} goals are ready. Submit them by {{deadline}}.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_DAY_7_REMINDER, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Your goals are still pending',
    body: 'Continue your {{cycle}} goals and submit them by {{deadline}}.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_DAY_14_REMINDER, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Goal deadline approaching',
    body: '{{days}} days remain to complete and submit your {{cycle}} goals.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_DAY_25_REMINDER, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: '5 days left to submit goals',
    body: 'Submit your {{cycle}} goals by {{deadline}} to stay on schedule.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_DEADLINE_PASSED_EXCEPTIONS, {
    kind: 'action',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Goal deadline has passed',
    body: 'You can still submit {{cycle}} goals. They will need approval from {{manager}} and {{skipLevelManager}}.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_DEADLINE_CLOSED, {
    kind: 'info',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Goal submission is closed',
    body: 'The {{cycle}} goal deadline was {{deadline}}. Contact your manager if you need help.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_MANUAL_REMINDER, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Reminder from {{manager}}: submit your goals',
    body: '{{message}} Your {{cycle}} goals are due {{deadline}}.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_TEAM_PENDING_SUMMARY, {
    kind: 'summary',
    icon: 'users',
    channels: [...inApp],
    title: '{{count}} team members have not submitted goals',
    body: 'Review who is still pending for {{cycle}} and send a reminder if needed.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_SUBMITTED, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: '{{employee}}’s goals are ready for approval',
    body: '{{employee}} submitted {{count}} goals for {{cycle}}. Review the full submission.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_RESUBMITTED, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: '{{employee}} resubmitted their goals',
    body: '{{employee}} updated the {{cycle}} submission after it was sent back.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_MANAGER_EDITED, {
    kind: 'info',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Your goals were updated',
    body: '{{manager}} updated your {{cycle}} goals. Review the changes.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_SENT_BACK, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Your goals were sent back for changes',
    body: '{{approver}} sent back your {{cycle}} goals: “{{reason}}”',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_APPROVED, {
    kind: 'info',
    icon: 'target',
    channels: [...inApp],
    title: 'Your goals were approved',
    body: '{{manager}} approved your {{cycle}} goals.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_LATE_SUBMITTED, {
    kind: 'action',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Late goals need your approval',
    body: '{{employee}} submitted {{cycle}} goals after the deadline. Your approval sends them to {{skipLevelManager}} for final approval.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_FINAL_APPROVAL_REQUESTED, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Final goal approval needed for {{employee}}',
    body: '{{manager}} approved {{employee}}’s late {{cycle}} submission. Your approval is final.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_PENDING_FINAL_APPROVAL, {
    kind: 'info',
    icon: 'target',
    channels: [...inApp],
    title: 'Your goals are pending final approval',
    body: '{{manager}} approved your goals. They are now awaiting final approval from {{skipLevelManager}}.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_FINAL_APPROVED, {
    kind: 'info',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Your goals received final approval',
    body: '{{skipLevelManager}} approved your late {{cycle}} submission.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_FINAL_APPROVED_MANAGER, {
    kind: 'info',
    icon: 'target',
    channels: [...inApp],
    title: 'Final approval completed for {{employee}}',
    body: '{{skipLevelManager}} approved {{employee}}’s {{cycle}} goals.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_FINAL_SENT_BACK, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Final approver requested changes',
    body: '{{skipLevelManager}} sent back your {{cycle}} goals: “{{reason}}”',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_FINAL_SENT_BACK_MANAGER, {
    kind: 'info',
    icon: 'target',
    channels: [...inApp],
    title: '{{employee}}’s goals were sent back',
    body: '{{skipLevelManager}} requested changes to {{employee}}’s {{cycle}} goals.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_CHANGES_REQUIRE_APPROVAL, {
    kind: 'action',
    icon: 'target',
    channels: [...inAppAndEmail],
    title: 'Goal changes need your approval',
    body: '{{employee}} changed approved {{cycle}} goals. Review the updated submission.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_RESULTS_REMINDER, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Update your goal results',
    body: '{{cycle}} closes on {{deadline}}. Update current values, milestones, and evidence.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_STALE_TEAM_SUMMARY, {
    kind: 'summary',
    icon: 'users',
    channels: [...inApp],
    title: '{{count}} team members have stale goal progress',
    body: 'Their {{cycle}} goals have not been updated since {{thresholdDate}}.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_PROGRESS_ADJUSTED, {
    kind: 'info',
    icon: 'target',
    channels: [...inApp],
    title: 'Your goal progress was adjusted',
    body: '{{manager}} updated progress on {{count}} goal measurements.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_CHECK_IN_COMPLETED, {
    kind: 'info',
    icon: 'clipboard-check',
    channels: [...inApp],
    title: 'Your goal check-in is complete',
    body: '{{manager}} completed your {{cycle}} goal check-in.',
  }),
  entry(NOTIFICATION_EVENTS.GOAL_CASCADED, {
    kind: 'action',
    icon: 'target',
    channels: [...inApp],
    title: '{{manager}} cascaded a goal to you',
    body: 'Review “{{goal}}” and add measurements before submitting your {{cycle}} goals.',
  }),

  entry(NOTIFICATION_EVENTS.REVIEW_SELF_OPENED, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: 'Your {{cycle}} self-review is ready',
    body: 'Complete your self-review by {{deadline}}.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_ASSIGNED, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: 'Review requested for {{employee}}',
    body: 'Complete the {{reviewType}} review by {{deadline}}.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_DUE_SOON, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: '{{days}} days left to complete your review',
    body: 'Your review for {{employee}} is due {{deadline}}.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_OVERDUE, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Your review for {{employee}} is overdue',
    body: 'Complete the {{cycle}} review as soon as possible.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_SELF_SUBMITTED, {
    kind: 'info',
    icon: 'clipboard-check',
    channels: [...inApp],
    title: '{{employee}} completed their self-review',
    body: 'The self-review is available while you complete the {{cycle}} manager review.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_MANAGER_OPENED, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: '{{count}} performance reviews are ready',
    body: 'Complete your team’s {{cycle}} reviews by {{deadline}}.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_READY_FOR_CALIBRATION, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inApp],
    title: '{{count}} reviews are ready for calibration',
    body: 'Manager reviews for {{scope}} are complete and ready to calibrate.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_CALIBRATION_OPENED, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: 'Calibration is open for {{scope}}',
    body: 'Review and calibrate {{count}} scorecards by {{deadline}}.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_CALIBRATION_DUE_SOON, {
    kind: 'reminder',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: 'Calibration closes in {{days}} days',
    body: '{{count}} scorecards in {{scope}} still need calibration.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_READY_TO_PUBLISH, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inApp],
    title: '{{cycle}} results are ready to publish',
    body: 'Calibration is complete. Review exclusions before publishing results.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_RESULTS_FOR_MANAGERS, {
    kind: 'action',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: '{{cycle}} results are available for your team',
    body: 'Review employee results before they are published to everyone on {{date}}.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_RESULTS_PUBLISHED, {
    kind: 'info',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: 'Your {{cycle}} performance results are available',
    body: 'Your scorecard and feedback are ready to view.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_RESULT_CORRECTED, {
    kind: 'info',
    icon: 'clipboard-check',
    channels: [...inAppAndEmail],
    title: 'Your {{cycle}} result was updated',
    body: '{{administrator}} corrected the published result. Review the latest scorecard.',
  }),
  entry(NOTIFICATION_EVENTS.REVIEW_DEADLINE_UPDATED, {
    kind: 'info',
    icon: 'clock',
    channels: [...inAppAndEmail],
    title: '{{cycle}} deadline updated',
    body: 'The {{stage}} deadline moved from {{oldDate}} to {{newDate}}.',
  }),

  entry(NOTIFICATION_EVENTS.ORG_MANAGER_CHANGED_EMPLOYEE, {
    kind: 'info',
    icon: 'users',
    channels: [...inAppAndEmail],
    title: 'Your reporting manager changed',
    body: '{{newManager}} is now your manager. Open goal and review work will follow the updated reporting line.',
  }),
  entry(NOTIFICATION_EVENTS.ORG_MANAGER_CHANGED_MANAGER, {
    kind: 'info',
    icon: 'users',
    channels: [...inApp],
    title: '{{employee}} now reports to you',
    body: 'You can now view and manage their open goals and assigned reviews.',
  }),
  entry(NOTIFICATION_EVENTS.ACCESS_GRANTED, {
    kind: 'security',
    icon: 'shield',
    channels: [...inAppAndEmail],
    title: 'Administrative access granted',
    body: '{{administrator}} granted you {{accessProfile}} access.',
  }),
  entry(NOTIFICATION_EVENTS.ACCESS_REMOVED, {
    kind: 'security',
    icon: 'shield',
    channels: [...inAppAndEmail],
    title: 'Administrative access removed',
    body: '{{administrator}} removed your {{accessProfile}} access.',
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
    return value == null || value === '' ? '—' : String(value)
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
