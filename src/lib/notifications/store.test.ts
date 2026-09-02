import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NOTIFICATION_EVENTS } from './catalogue'
import {
  completeNotificationAction,
  emitNotification,
  getNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
  resetNotificationsForTests,
  supersedeNotification,
} from './store'

const submission = {
  eventKey: NOTIFICATION_EVENTS.GOAL_SUBMITTED,
  recipientId: 'manager',
  actorId: 'employee',
  dedupeKey: 'goal-approval:q3:employee:manager',
  destination: '/goals/q3/employee',
  cycleId: 'q3',
  personId: 'employee',
  variables: {
    employee: 'Aminul',
    count: 3,
    cycle: 'Q3 2026',
  },
}

describe('notification store', () => {
  beforeEach(() => {
    localStorage.clear()
    resetNotificationsForTests()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-17T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders catalogue copy into a recipient feed', () => {
    emitNotification(submission)

    const feed = getNotificationFeed('manager')

    expect(feed.unreadCount).toBe(1)
    expect(feed.openActionCount).toBe(1)
    expect(feed.items[0]).toMatchObject({
      title: 'Aminul’s goals need approval',
      destination: '/goals/q3/employee',
      state: 'unread',
    })
  })

  it('reopens the same action instead of creating duplicates', () => {
    emitNotification(submission)
    completeNotificationAction('manager', submission.dedupeKey)

    emitNotification(
      {
        ...submission,
        eventKey: NOTIFICATION_EVENTS.GOAL_RESUBMITTED,
        variables: { employee: 'Aminul', cycle: 'Q3 2026' },
      },
      { duplicate: 'reopen' },
    )

    const feed = getNotificationFeed('manager')
    expect(feed.items).toHaveLength(1)
    expect(feed.items[0].state).toBe('unread')
    expect(feed.items[0].title).toBe('Aminul resubmitted goals')
  })

  it('keeps read state separate from action completion', () => {
    const created = emitNotification(submission)

    markNotificationRead('manager', created.id)
    expect(getNotificationFeed('manager').openActionCount).toBe(1)

    completeNotificationAction('manager', submission.dedupeKey)
    expect(getNotificationFeed('manager').openActionCount).toBe(0)
    expect(getNotificationFeed('manager').items[0].state).toBe('completed')
  })

  it('marks all unread records as read without completing actions', () => {
    emitNotification(submission)
    emitNotification({
      ...submission,
      eventKey: NOTIFICATION_EVENTS.GOAL_APPROVED,
      recipientId: 'manager',
      dedupeKey: 'goal-approved:q3:manager',
      variables: { manager: 'Nafis', cycle: 'Q3 2026' },
    })

    markAllNotificationsRead('manager')

    const feed = getNotificationFeed('manager')
    expect(feed.unreadCount).toBe(0)
    expect(feed.openActionCount).toBe(1)
  })

  it('hides superseded reminders', () => {
    emitNotification({
      eventKey: NOTIFICATION_EVENTS.GOAL_DAY_7_REMINDER,
      recipientId: 'employee',
      dedupeKey: 'goal-reminder:q3:employee:day-7',
      variables: { cycle: 'Q3 2026', deadline: '30 Jul 2026' },
    })

    supersedeNotification('employee', 'goal-reminder:q3:employee:day-7')

    expect(getNotificationFeed('employee').items).toHaveLength(0)
  })
})
