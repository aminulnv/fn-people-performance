import { apiFetch } from '@/lib/apiClient'
import { showBrowserNotification } from './browserNotifications'
import { NOTIFICATION_CATALOGUE, renderNotificationTemplate } from './catalogue'
import {
  getDefaultNotificationRule,
  NOTIFICATION_RULE_DEFAULTS,
} from './ruleDefaults'
import type { NotificationRule, NotificationRulePatch } from './ruleTypes'
import { emitTestNotification } from './store'
import { sampleDaysForEvent } from './sampleDays'

const TEST_VARIABLES: Record<string, string | number | undefined> = {
  cycle: 'H2 2026',
  deadline: '15 Oct',
  days: '5',
  employee: 'Sara Khan',
  manager: 'Alex Rivera',
  count: '3',
  reason: 'Please tighten the success metric',
  approver: 'Alex Rivera',
  skipLevelManager: 'Jordan Lee',
  actor: 'Alex Rivera',
  comment: 'Can you take a look at this?',
  goal: 'Improve onboarding completion',
  reviewType: 'Manager review',
  scope: 'Engineering',
  date: '1 Nov',
  administrator: 'Aminul Islam',
  stage: 'Self-review',
  oldDate: '1 Oct',
  newDate: '8 Oct',
  newManager: 'Alex Rivera',
  accessProfile: 'Read + write',
  message: 'Please submit your goals this week',
  thresholdDate: '1 Sep',
  grade: 'Exceeds',
}

function testVariablesForEvent(
  eventKey: string,
): Record<string, string | number | undefined> {
  const days = sampleDaysForEvent(eventKey)
  if (days == null) return TEST_VARIABLES
  return { ...TEST_VARIABLES, days }
}

const LOCAL_RULES_KEY = 'pd-notification-rules-v1'

function useLocalRules(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_AUTH_MODE === 'local' ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === 'local'
  )
}

function readLocalOverrides(): Record<string, NotificationRulePatch> {
  try {
    const raw = localStorage.getItem(LOCAL_RULES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, NotificationRulePatch>
  } catch {
    return {}
  }
}

function writeLocalOverrides(
  overrides: Record<string, NotificationRulePatch>,
): void {
  localStorage.setItem(LOCAL_RULES_KEY, JSON.stringify(overrides))
}

function applyLocalOverride(rule: NotificationRule): NotificationRule {
  const override = readLocalOverrides()[rule.eventKey]
  if (!override) return { ...rule, channels: [...rule.channels] }
  return {
    ...rule,
    enabled:
      typeof override.enabled === 'boolean' ? override.enabled : rule.enabled,
    channels: Array.isArray(override.channels)
      ? [...override.channels]
      : [...rule.channels],
    titleTemplate:
      typeof override.titleTemplate === 'string'
        ? override.titleTemplate
        : rule.titleTemplate,
    bodyTemplate:
      typeof override.bodyTemplate === 'string'
        ? override.bodyTemplate
        : rule.bodyTemplate,
  }
}

function renderCopy(
  template: string,
  variables: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key]
    return value == null || value === '' ? '…' : String(value)
  })
}

export async function fetchNotificationRules(): Promise<NotificationRule[]> {
  if (useLocalRules()) {
    return NOTIFICATION_RULE_DEFAULTS.map(applyLocalOverride).sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    )
  }
  const result = await apiFetch<{ rules: NotificationRule[] }>(
    '/api/platform/notification-rules',
  )
  return Array.isArray(result.rules) ? result.rules : []
}

export async function updateNotificationRule(
  eventKey: string,
  patch: NotificationRulePatch,
): Promise<NotificationRule> {
  if (useLocalRules()) {
    const base = getDefaultNotificationRule(eventKey)
    if (!base) throw new Error('Unknown notification rule')
    const overrides = readLocalOverrides()
    const nextPatch: NotificationRulePatch = {
      ...overrides[eventKey],
      ...patch,
    }
    overrides[eventKey] = nextPatch
    writeLocalOverrides(overrides)
    return applyLocalOverride(base)
  }
  const result = await apiFetch<{ rule: NotificationRule }>(
    `/api/platform/notification-rules/${encodeURIComponent(eventKey)}`,
    { method: 'PATCH', body: patch },
  )
  return result.rule
}

export async function resetNotificationRule(
  eventKey: string,
): Promise<NotificationRule> {
  if (useLocalRules()) {
    const base = getDefaultNotificationRule(eventKey)
    if (!base) throw new Error('Unknown notification rule')
    const overrides = readLocalOverrides()
    delete overrides[eventKey]
    writeLocalOverrides(overrides)
    return { ...base, channels: [...base.channels] }
  }
  const result = await apiFetch<{ rule: NotificationRule }>(
    `/api/platform/notification-rules/${encodeURIComponent(eventKey)}/reset`,
    { method: 'POST', body: {} },
  )
  return result.rule
}

function maybeShowBrowserTest(input: {
  id: string
  title: string
  body: string
  channels: string[]
  destination?: string
}): void {
  if (!input.channels.includes('browser')) return
  void showBrowserNotification({
    id: input.id,
    title: input.title.startsWith('Test · ')
      ? input.title
      : `Test · ${input.title}`,
    body: input.body,
    destination: input.destination ?? '/settings#notifications',
    force: true,
  })
}

/** Sends an in-app (and browser, if enabled on the rule) preview to the admin. */
export async function sendTestNotificationRule(
  eventKey: string,
  recipientId: string,
): Promise<void> {
  if (useLocalRules()) {
    const rule =
      (await fetchNotificationRules()).find((item) => item.eventKey === eventKey) ??
      getDefaultNotificationRule(eventKey)
    if (!rule) throw new Error('Unknown notification rule')

    const channels = ['in_app' as const, ...rule.channels.filter((c) => c === 'browser')]
    const variables = testVariablesForEvent(eventKey)

    if (NOTIFICATION_CATALOGUE.has(eventKey)) {
      const template = renderNotificationTemplate(eventKey, variables, {
        channels,
        titleTemplate: rule.titleTemplate,
        bodyTemplate: rule.bodyTemplate,
      })
      const record = emitTestNotification({
        eventKey,
        recipientId,
        title: template.title,
        body: template.body,
        icon: template.icon,
        kind: template.kind,
        channels,
      })
      maybeShowBrowserTest({
        id: record.id,
        title: record.title,
        body: record.body,
        channels,
      })
      return
    }

    const title = renderCopy(rule.titleTemplate, variables)
    const body = renderCopy(rule.bodyTemplate, variables)
    const record = emitTestNotification({
      eventKey,
      recipientId,
      title,
      body,
      icon: 'clipboard-check',
      kind: 'info',
      channels,
    })
    maybeShowBrowserTest({
      id: record.id,
      title: record.title,
      body: record.body,
      channels,
    })
    return
  }

  const result = await apiFetch<{
    notification?: { id: string; title: string; body: string; channels?: string[] }
    rule?: NotificationRule
  }>(
    `/api/platform/notification-rules/${encodeURIComponent(eventKey)}/test`,
    { method: 'POST', body: {} },
  )
  const notification = result.notification
  if (notification) {
    maybeShowBrowserTest({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      channels: notification.channels ?? result.rule?.channels ?? [],
    })
  }
}

export function resetNotificationRulesForTests(): void {
  localStorage.removeItem(LOCAL_RULES_KEY)
}
