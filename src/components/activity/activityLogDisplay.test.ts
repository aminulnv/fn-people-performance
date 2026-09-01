import { describe, expect, it } from 'vitest'
import {
  formatActivityTime,
  shouldShowActivityHeadline,
} from './activityLogDisplay'
import type { ActivityEvent } from '@/lib/activity/types'

const baseEvent: ActivityEvent = {
  id: '1',
  eventKey: 'goal.updated',
  entityType: 'goal',
  entityId: 'g1',
  actorType: 'user',
  actorName: 'Aminul Islam Borhan',
  source: 'api',
  summary: 'Updated goal',
  changes: [],
  metadata: {},
  occurredAt: '2026-09-01T05:09:00.000Z',
}

describe('activityLogDisplay', () => {
  it('formats grouped timestamps as time only', () => {
    const formatted = formatActivityTime('2026-09-01T05:09:00.000Z', true)
    expect(formatted).toMatch(/:\d{2}/)
    expect(formatted).not.toMatch(/2026/)
  })

  it('hides generic headlines when field changes are present', () => {
    expect(
      shouldShowActivityHeadline(baseEvent, [
        { field: 'Weight', from: '7%', to: '16%' },
      ]),
    ).toBe(false)
  })

  it('keeps distinctive headlines even when changes are present', () => {
    const event = {
      ...baseEvent,
      eventKey: 'goal_submission.submitted',
      metadata: { late: true },
    }
    expect(
      shouldShowActivityHeadline(event, [
        { field: 'Late', from: 'No', to: 'Yes' },
      ]),
    ).toBe(true)
  })
})
