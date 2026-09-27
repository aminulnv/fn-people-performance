import { describe, expect, it } from 'vitest'
import { NOTIFICATION_RULE_DEFAULTS } from './ruleDefaults'
import { groupNotificationRules } from './ruleGroups'

describe('groupNotificationRules', () => {
  it('places every default rule into exactly one group', () => {
    const sections = groupNotificationRules(NOTIFICATION_RULE_DEFAULTS)
    const keys = sections.flatMap((section) =>
      section.rules.map((rule) => rule.eventKey),
    )
    expect(new Set(keys).size).toBe(NOTIFICATION_RULE_DEFAULTS.length)
    expect(keys).toHaveLength(NOTIFICATION_RULE_DEFAULTS.length)
  })

  it('keeps category sections in a stable order with nested groups', () => {
    const sections = groupNotificationRules(NOTIFICATION_RULE_DEFAULTS)
    expect(sections.map((section) => section.categoryId)).toEqual([
      'goals',
      'reviews',
      'organisation',
      'access',
    ])
    expect(sections[0]?.groups.map((item) => item.group.id)).toEqual([
      'goals-window',
      'goals-approvals',
      'goals-progress',
    ])
  })
})
