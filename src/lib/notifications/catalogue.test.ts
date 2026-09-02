import { describe, expect, it } from 'vitest'
import {
  NOTIFICATION_CATALOGUE,
  NOTIFICATION_EVENTS,
  renderNotificationTemplate,
} from './catalogue'

describe('notification catalogue', () => {
  it('keeps every declared event key resolvable', () => {
    for (const eventKey of Object.values(NOTIFICATION_EVENTS)) {
      expect(NOTIFICATION_CATALOGUE.has(eventKey)).toBe(true)
    }
  })

  it('renders placeholders without mutating the catalogue', () => {
    const first = renderNotificationTemplate(
      NOTIFICATION_EVENTS.GOAL_SUBMITTED,
      {
        employee: 'Aminul',
        count: 4,
        cycle: 'Q3 2026',
      },
    )
    const second = renderNotificationTemplate(
      NOTIFICATION_EVENTS.GOAL_SUBMITTED,
      {
        employee: 'Rifat',
        count: 2,
        cycle: 'Q4 2026',
      },
    )

    expect(first.title).toBe('Aminul’s goals need approval')
    expect(second.title).toBe('Rifat’s goals need approval')
    expect(
      NOTIFICATION_CATALOGUE.get(NOTIFICATION_EVENTS.GOAL_SUBMITTED)?.title,
    ).toContain('{{employee}}')
  })
})
