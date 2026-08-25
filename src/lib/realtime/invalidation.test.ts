import { describe, expect, it, vi } from 'vitest'
import type { PlatformEvent } from './event'
import {
  emitPlatformEvent,
  resetPlatformInvalidationForTests,
  subscribePlatformTopic,
} from './invalidation'

const event: PlatformEvent = {
  id: 'evt-2',
  v: 1,
  topic: 'packets',
  action: 'updated',
  cycleId: 'q3-2026',
  employeeId: '9',
  at: '2026-08-25T09:00:00.000Z',
}

describe('platform invalidation bus', () => {
  it('delivers only to the matching topic', () => {
    resetPlatformInvalidationForTests()
    const packets = vi.fn()
    const goals = vi.fn()
    const stopPackets = subscribePlatformTopic('packets', packets)
    const stopGoals = subscribePlatformTopic('goals', goals)
    emitPlatformEvent(event)
    stopPackets()
    stopGoals()
    expect(packets).toHaveBeenCalledWith(event)
    expect(goals).not.toHaveBeenCalled()
  })
})
