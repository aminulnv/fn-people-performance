import { beforeEach, describe, expect, it } from 'vitest'
import {
  fetchNotificationRules,
  resetNotificationRule,
  resetNotificationRulesForTests,
  updateNotificationRule,
} from './rulesApi'
import { NOTIFICATION_EVENTS } from './catalogue'

describe('notification rules api (local)', () => {
  beforeEach(() => {
    resetNotificationRulesForTests()
  })

  it('returns seeded defaults', async () => {
    const rules = await fetchNotificationRules()
    expect(rules.length).toBeGreaterThan(10)
    const submitted = rules.find(
      (rule) => rule.eventKey === NOTIFICATION_EVENTS.GOAL_SUBMITTED,
    )
    expect(submitted?.name).toBe('Goals need approval')
    expect(submitted?.enabled).toBe(true)
  })

  it('persists toggle and channel edits', async () => {
    await updateNotificationRule(NOTIFICATION_EVENTS.GOAL_DAY_7_REMINDER, {
      enabled: false,
      channels: ['in_app'],
      titleTemplate: 'Custom title for {{employee}}',
    })
    const rules = await fetchNotificationRules()
    const reminder = rules.find(
      (rule) => rule.eventKey === NOTIFICATION_EVENTS.GOAL_DAY_7_REMINDER,
    )
    expect(reminder?.enabled).toBe(false)
    expect(reminder?.channels).toEqual(['in_app'])
    expect(reminder?.titleTemplate).toBe('Custom title for {{employee}}')

    const reset = await resetNotificationRule(
      NOTIFICATION_EVENTS.GOAL_DAY_7_REMINDER,
    )
    expect(reset.enabled).toBe(true)
    expect(reset.channels).toContain('email')
    expect(reset.channels).toContain('browser')
  })

  it('keeps required rules enabled even if a disable patch is stored', async () => {
    const submitted = (await fetchNotificationRules()).find(
      (rule) => rule.eventKey === NOTIFICATION_EVENTS.GOAL_SUBMITTED,
    )
    expect(submitted?.required).toBe(true)

    await updateNotificationRule(NOTIFICATION_EVENTS.GOAL_SUBMITTED, {
      enabled: false,
      channels: ['email'],
    })
    const after = (await fetchNotificationRules()).find(
      (rule) => rule.eventKey === NOTIFICATION_EVENTS.GOAL_SUBMITTED,
    )
    expect(after?.enabled).toBe(true)
    expect(after?.channels).toContain('in_app')
  })
})
