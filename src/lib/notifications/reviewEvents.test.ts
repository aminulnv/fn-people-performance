import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { notifyReviewDeadlineChanged } from './reviewEvents'
import { getNotificationFeed, resetNotificationsForTests } from './store'

describe('notifyReviewDeadlineChanged', () => {
  beforeEach(() => {
    localStorage.clear()
    resetNotificationsForTests()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes the notification store once for a deadline broadcast', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    notifyReviewDeadlineChanged({
      cycleId: 'q3-2026',
      cycleName: 'Q3 2026',
      stage: 'goal setting',
      oldDate: '2026-07-30',
      newDate: '2026-08-05',
      recipients: [
        { id: '1', name: 'Ada' },
        { id: '2', name: 'Lin' },
        { id: '3', name: 'Sam' },
      ],
    })

    const writes = setItem.mock.calls.filter(
      ([key]) => key === 'pd-notifications-v2',
    )
    expect(writes).toHaveLength(1)
    expect(getNotificationFeed('1').unreadCount).toBe(1)
    expect(getNotificationFeed('2').unreadCount).toBe(1)
    expect(getNotificationFeed('3').unreadCount).toBe(1)
  })

  it('does not fan out to the whole directory', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    notifyReviewDeadlineChanged({
      cycleId: 'q3-2026',
      cycleName: 'Q3 2026',
      stage: 'goal setting',
      oldDate: '2026-07-30',
      newDate: '2026-08-05',
      recipients: Array.from({ length: 26 }, (_, index) => ({
        id: String(index + 1),
        name: `Person ${index + 1}`,
      })),
    })

    expect(setItem).not.toHaveBeenCalled()
    expect(getNotificationFeed('1').items).toHaveLength(0)
  })

  it('does nothing when the deadline is unchanged', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    notifyReviewDeadlineChanged({
      cycleId: 'q3-2026',
      cycleName: 'Q3 2026',
      stage: 'goal setting',
      oldDate: '2026-07-30',
      newDate: '2026-07-30',
      recipients: [{ id: '1', name: 'Ada' }],
    })

    expect(setItem).not.toHaveBeenCalled()
    expect(getNotificationFeed('1').items).toHaveLength(0)
  })
})
