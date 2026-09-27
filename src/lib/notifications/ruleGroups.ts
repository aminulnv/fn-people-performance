import type { LucideIcon } from 'lucide-react'
import {
  ClipboardCheck,
  Clock,
  MessageSquare,
  Scale,
  Shield,
  Target,
  Users,
} from 'lucide-react'
import type { NotificationRule, NotificationRuleCategory } from './ruleTypes'

export type NotificationRuleGroupId =
  | 'goals-window'
  | 'goals-approvals'
  | 'goals-progress'
  | 'reviews-cycle'
  | 'reviews-calibration'
  | 'reviews-results'
  | 'organisation'
  | 'access'

export type NotificationRuleGroup = {
  id: NotificationRuleGroupId
  category: NotificationRuleCategory
  label: string
  description: string
  icon: LucideIcon
  match: (rule: NotificationRule) => boolean
}

export type NotificationRuleCategorySection = {
  id: NotificationRuleCategory
  label: string
  description: string
  icon: LucideIcon
  groups: NotificationRuleGroupId[]
}

const GOAL_WINDOW_KEYS = new Set([
  'goal.window_opened',
  'goal.reminder.day_7',
  'goal.reminder.day_14',
  'goal.reminder.day_25',
  'goal.deadline.exceptions',
  'goal.deadline.closed',
  'goal.reminder.manual',
  'goal.team.pending_summary',
  'goal.results_reminder',
])

const GOAL_APPROVAL_KEYS = new Set([
  'goal.submitted',
  'goal.resubmitted',
  'goal.manager_edited',
  'goal.sent_back',
  'goal.approved',
  'goal.late_submitted',
  'goal.final_approval_requested',
  'goal.pending_final_approval',
  'goal.final_approved',
  'goal.final_approved.manager',
  'goal.final_sent_back',
  'goal.final_sent_back.manager',
  'goal.changes_require_approval',
])

const GOAL_PROGRESS_KEYS = new Set([
  'goal.team.stale_summary',
  'goal.progress_adjusted',
  'goal.check_in_completed',
  'goal.cascaded',
  'goal.comment.mentioned',
])

const REVIEW_CYCLE_KEYS = new Set([
  'review.self.opened',
  'review.assigned',
  'review.due_soon',
  'review.overdue',
  'review.self.submitted',
  'review.manager.opened',
  'review.deadline_updated',
])

const REVIEW_CALIBRATION_KEYS = new Set([
  'review.ready_for_calibration',
  'review.calibration.opened',
  'review.calibration.due_soon',
  'review.ready_to_publish',
  'review_packet.calibrated',
])

const REVIEW_RESULTS_KEYS = new Set([
  'review.results_for_managers',
  'review.results_published',
  'review.result_corrected',
])

export const NOTIFICATION_RULE_GROUPS: NotificationRuleGroup[] = [
  {
    id: 'goals-window',
    category: 'goals',
    label: 'Window & reminders',
    description: 'Opens, countdowns, and nudges while goals are being set.',
    icon: Clock,
    match: (rule) => GOAL_WINDOW_KEYS.has(rule.eventKey),
  },
  {
    id: 'goals-approvals',
    category: 'goals',
    label: 'Submissions & approvals',
    description: 'Submit, send back, approve, and final sign-off.',
    icon: Target,
    match: (rule) => GOAL_APPROVAL_KEYS.has(rule.eventKey),
  },
  {
    id: 'goals-progress',
    category: 'goals',
    label: 'Progress & comments',
    description: 'Check-ins, cascades, mentions, and stale progress.',
    icon: MessageSquare,
    match: (rule) => GOAL_PROGRESS_KEYS.has(rule.eventKey),
  },
  {
    id: 'reviews-cycle',
    category: 'reviews',
    label: 'Self & manager reviews',
    description: 'Stage opens, assignments, due soon, and overdue.',
    icon: ClipboardCheck,
    match: (rule) => REVIEW_CYCLE_KEYS.has(rule.eventKey),
  },
  {
    id: 'reviews-calibration',
    category: 'reviews',
    label: 'Calibration',
    description: 'Ready to calibrate, sittings open, and grade changes.',
    icon: Scale,
    match: (rule) => REVIEW_CALIBRATION_KEYS.has(rule.eventKey),
  },
  {
    id: 'reviews-results',
    category: 'reviews',
    label: 'Results',
    description: 'Release to managers, publish to employees, corrections.',
    icon: ClipboardCheck,
    match: (rule) => REVIEW_RESULTS_KEYS.has(rule.eventKey),
  },
  {
    id: 'organisation',
    category: 'organisation',
    label: 'Reporting line',
    description: 'Manager changes for employees and new reports.',
    icon: Users,
    match: (rule) => rule.category === 'organisation',
  },
  {
    id: 'access',
    category: 'access',
    label: 'Admin access',
    description: 'When platform access is granted or removed.',
    icon: Shield,
    match: (rule) => rule.category === 'access',
  },
]

export const NOTIFICATION_RULE_CATEGORY_SECTIONS: NotificationRuleCategorySection[] =
  [
    {
      id: 'goals',
      label: 'Goals',
      description: 'Goal windows, approvals, and progress updates.',
      icon: Target,
      groups: ['goals-window', 'goals-approvals', 'goals-progress'],
    },
    {
      id: 'reviews',
      label: 'Reviews',
      description: 'Self-review, manager review, calibration, and results.',
      icon: ClipboardCheck,
      groups: ['reviews-cycle', 'reviews-calibration', 'reviews-results'],
    },
    {
      id: 'organisation',
      label: 'Organisation',
      description: 'Reporting-line changes that affect work ownership.',
      icon: Users,
      groups: ['organisation'],
    },
    {
      id: 'access',
      label: 'Access',
      description: 'Security notices when admin rights change.',
      icon: Shield,
      groups: ['access'],
    },
  ]

const GROUPS_BY_ID = new Map(
  NOTIFICATION_RULE_GROUPS.map((group) => [group.id, group]),
)

export function groupNotificationRules(rules: NotificationRule[]): {
  categoryId: NotificationRuleCategory
  groups: { group: NotificationRuleGroup; rules: NotificationRule[] }[]
  rules: NotificationRule[]
}[] {
  const used = new Set<string>()

  return NOTIFICATION_RULE_CATEGORY_SECTIONS.map((section) => {
    const groups = section.groups
      .map((groupId) => {
        const group = GROUPS_BY_ID.get(groupId)
        if (!group) return null
        const matched = rules.filter((rule) => {
          if (used.has(rule.eventKey)) return false
          if (!group.match(rule)) return false
          used.add(rule.eventKey)
          return true
        })
        return { group, rules: matched }
      })
      .filter(
        (
          item,
        ): item is { group: NotificationRuleGroup; rules: NotificationRule[] } =>
          item != null && item.rules.length > 0,
      )

    const leftover = rules.filter(
      (rule) =>
        rule.category === section.id && !used.has(rule.eventKey),
    )
    if (leftover.length > 0) {
      const fallback = GROUPS_BY_ID.get(section.groups[0]!)
      if (fallback) {
        leftover.forEach((rule) => used.add(rule.eventKey))
        const existing = groups.find((item) => item.group.id === fallback.id)
        if (existing) {
          existing.rules = [...existing.rules, ...leftover]
        } else {
          groups.push({ group: fallback, rules: leftover })
        }
      }
    }

    return {
      categoryId: section.id,
      groups,
      rules: groups.flatMap((item) => item.rules),
    }
  }).filter((section) => section.rules.length > 0)
}
