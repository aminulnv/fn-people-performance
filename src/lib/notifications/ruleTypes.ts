import type { NotificationChannel } from './types'

export type NotificationRuleCategory =
  | 'goals'
  | 'reviews'
  | 'organisation'
  | 'access'

export type NotificationRuleTimingKind = 'immediate' | 'reminder'

export type NotificationRule = {
  eventKey: string
  name: string
  category: NotificationRuleCategory
  audienceKey: string
  audienceLabel: string
  whenLabel: string
  timingKind: NotificationRuleTimingKind
  enabled: boolean
  channels: NotificationChannel[]
  titleTemplate: string
  bodyTemplate: string
  sortOrder: number
  updatedAt?: string
  updatedByEmployeeId?: number | null
}

export type NotificationRulePatch = {
  enabled?: boolean
  channels?: NotificationChannel[]
  titleTemplate?: string
  bodyTemplate?: string
}

export const NOTIFICATION_RULE_CATEGORY_LABELS: Record<
  NotificationRuleCategory,
  string
> = {
  goals: 'Goals',
  reviews: 'Reviews',
  organisation: 'Organisation',
  access: 'Access',
}

export function channelLabel(channel: NotificationChannel): string {
  if (channel === 'in_app') return 'in-app'
  if (channel === 'email') return 'email'
  if (channel === 'browser') return 'browser'
  if (channel === 'clickup') return 'ClickUp'
  return channel
}

export function ruleSummary(rule: NotificationRule): string {
  const channelLabels = rule.channels.map(channelLabel).join(' + ')
  return `${rule.whenLabel} → ${rule.audienceLabel} · ${channelLabels}`
}
