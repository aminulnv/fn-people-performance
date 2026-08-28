import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DemoPerson, Goal, GoalsSnapshot } from '@/lib/goals/types'
import { notifyGoalCommentMentions } from './goalEvents'
import { getNotificationFeed, resetNotificationsForTests } from './store'

const actor: DemoPerson = {
  id: '2',
  name: 'Line Manager',
  email: 'manager@example.com',
  title: 'Manager',
  department: 'People',
  joinDate: '2024-01-01',
  reportIds: ['1'],
  avatarHue: 1,
  blurb: '',
}

const subject: DemoPerson = {
  ...actor,
  id: '1',
  name: 'Aminul Islam Borhan',
  email: 'aminul@example.com',
  title: 'Executive',
  reportIds: [],
  managerId: '2',
}

const mentioned: DemoPerson = {
  ...actor,
  id: '3',
  name: 'HR Partner',
  email: 'hr@example.com',
  title: 'HR',
  reportIds: [],
}

const cycle = {
  id: 'q3-2026',
  label: 'Q3 2026',
  day1: '2026-07-01',
  phase: 'window_open' as const,
  goalCountPolicy: 'unlimited' as const,
  postWindowGoalPolicy: 'soft_lock' as const,
}

const snapshot: GoalsSnapshot = {
  cycle,
  cycleStatus: 'current',
  availableCycles: [{ ...cycle, status: 'current' }],
  activePersonId: '1',
  people: [subject, actor, mentioned],
  byPerson: {},
}

const goal: Goal = {
  id: 'g1',
  description: 'Improve delivery quality',
  weight: 100,
  measurements: [],
}

describe('notifyGoalCommentMentions', () => {
  beforeEach(() => {
    localStorage.clear()
    resetNotificationsForTests()
  })

  afterEach(() => {
    resetNotificationsForTests()
  })

  it('notifies newly tagged people and skips the author', () => {
    notifyGoalCommentMentions({
      snapshot,
      actor,
      subject,
      previousGoals: [goal],
      nextGoals: [
        {
          ...goal,
          comments: [
            {
              id: 'c1',
              authorId: actor.id,
              authorName: actor.name,
              text: 'Hey @[HR Partner](3) and @[Line Manager](2)',
              mentionedIds: ['3', '2'],
              createdAt: '2026-08-01T00:00:00.000Z',
            },
          ],
        },
      ],
    })

    const mention = getNotificationFeed('3').items[0]
    expect(mention.title).toBe('Line Manager mentioned you on a goal')
    expect(mention.body).toContain('Improve delivery quality')
    expect(mention.destination).toBe('/goals/q3-2026/1/g1')
    expect(getNotificationFeed('2').items).toHaveLength(0)
  })

  it('does not re-notify people already tagged on the same comment', () => {
    const commented = {
      ...goal,
      comments: [
        {
          id: 'c1',
          authorId: actor.id,
          authorName: actor.name,
          text: 'Hey @[HR Partner](3)',
          mentionedIds: ['3'],
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    }

    notifyGoalCommentMentions({
      snapshot,
      actor,
      subject,
      previousGoals: [commented],
      nextGoals: [
        {
          ...commented,
          comments: [
            {
              ...commented.comments![0],
              text: 'Hey @[HR Partner](3) — still waiting',
            },
          ],
        },
      ],
    })

    expect(getNotificationFeed('3').items).toHaveLength(0)
  })
})
