import { describe, expect, it } from 'vitest'
import type { ActivityEvent } from '@/lib/activity/types'
import { bundleActivityEvents } from './activityLogGrouping'

function goalUpdate(
  id: string,
  occurredAt: string,
  weightFrom: number,
  weightTo: number,
): ActivityEvent {
  return {
    id,
    eventKey: 'goal.updated',
    entityType: 'goal',
    entityId: 'g1',
    actorType: 'user',
    actorName: 'Aminul Islam Borhan',
    actorEmployeeId: 12,
    source: 'api',
    summary: 'Updated goal',
    changes: [
      {
        field: 'goal',
        from: { description: 'Grow NPS', weight: weightFrom, measurements: [] },
        to: { description: 'Grow NPS', weight: weightTo, measurements: [] },
      },
    ],
    metadata: {},
    occurredAt,
  }
}

describe('bundleActivityEvents', () => {
  it('bundles same-actor goal edits in the same minute', () => {
    const events = [
      goalUpdate('3', '2026-09-01T05:09:12.000Z', 7, 16),
      goalUpdate('2', '2026-09-01T05:09:40.000Z', 7, 11),
      goalUpdate('1', '2026-09-01T05:08:10.000Z', 7, 12),
    ]
    const bundles = bundleActivityEvents(events)
    expect(bundles).toHaveLength(2)
    expect(bundles[0].events.map((event) => event.id)).toEqual(['3', '2'])
    expect(bundles[1].events.map((event) => event.id)).toEqual(['1'])
  })

  it('does not bundle different actors or event types', () => {
    const first = goalUpdate('1', '2026-09-01T05:09:00.000Z', 7, 16)
    const second = {
      ...goalUpdate('2', '2026-09-01T05:09:30.000Z', 7, 11),
      actorEmployeeId: 99,
      actorName: 'Other User',
    }
    const third = {
      ...goalUpdate('3', '2026-09-01T05:09:45.000Z', 7, 12),
      eventKey: 'goal.created',
    }
    const bundles = bundleActivityEvents([first, second, third])
    expect(bundles).toHaveLength(3)
  })
})
