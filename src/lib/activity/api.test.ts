import { afterEach, describe, expect, it } from 'vitest'
import {
  activityEntityLabel,
  activityEventLabel,
} from './types'
import {
  appendLocalActivityEvent,
  fetchActivity,
  resetLocalActivityForTests,
} from './api'

afterEach(() => {
  resetLocalActivityForTests()
})

describe('activity labels', () => {
  it('names known events in plain language', () => {
    expect(activityEventLabel('goal_submission.submitted')).toBe(
      'Submitted goals',
    )
    expect(activityEventLabel('access.profile_assigned')).toBe(
      'Assigned an access profile',
    )
    expect(activityEntityLabel('goal_submission')).toBe('Goals')
    expect(activityEntityLabel('review_packet')).toBe('Review')
    expect(activityEventLabel('review_packet.self_submitted')).toBe(
      'Submitted a self-review',
    )
    expect(activityEntityLabel('review_cycle')).toBe('Cycle')
  })
})

describe('local activity facade', () => {
  it('appends and filters events for contextual drawers', async () => {
    appendLocalActivityEvent({
      eventKey: 'goal.created',
      entityType: 'goal',
      entityId: 'g1',
      actorType: 'user',
      actorName: 'Aminul',
      subjectEmployeeId: 12,
      cycleId: 'q3-2026',
      goalId: 'g1',
      source: 'web',
      summary: 'Created goal',
      changes: [],
      metadata: {},
    })
    appendLocalActivityEvent({
      eventKey: 'employee.created',
      entityType: 'employee',
      entityId: '99',
      actorType: 'user',
      actorName: 'Admin',
      subjectEmployeeId: 99,
      source: 'web',
      summary: 'Created employee',
      changes: [],
      metadata: {},
    })

    const goalFeed = await fetchActivity({ goalId: 'g1' })
    expect(goalFeed.items).toHaveLength(1)
    expect(goalFeed.items[0]?.eventKey).toBe('goal.created')

    const personFeed = await fetchActivity({ subjectEmployeeId: 99 })
    expect(personFeed.items).toHaveLength(1)
    expect(personFeed.items[0]?.entityType).toBe('employee')
  })
})
