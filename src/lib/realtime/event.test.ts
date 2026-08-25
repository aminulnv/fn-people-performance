import { describe, expect, it } from 'vitest'
import { parsePlatformEvent } from './event'

describe('parsePlatformEvent', () => {
  it('accepts a goals change from another session', () => {
    expect(
      parsePlatformEvent({
        id: 'evt-1',
        topic: 'goals',
        action: 'updated',
        cycleId: 'q3-2026',
        employeeId: 12,
        actorEmployeeId: 1,
        at: '2026-08-25T09:00:00.000Z',
      }),
    ).toEqual({
      id: 'evt-1',
      v: 1,
      topic: 'goals',
      action: 'updated',
      cycleId: 'q3-2026',
      employeeId: '12',
      actorEmployeeId: '1',
      at: '2026-08-25T09:00:00.000Z',
    })
  })

  it('rejects unknown topics so a bad frame cannot refetch everything', () => {
    expect(parsePlatformEvent({ topic: 'webhook', cycleId: 'q3-2026' })).toBe(
      null,
    )
  })
})
