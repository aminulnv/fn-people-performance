import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { viewerMayHearEvent } from './audience.mjs'
import {
  attachRealtimeClient,
  broadcastPlatformEvent,
  resetRealtimeHubForTests,
} from './hub.mjs'

const manager = {
  employeeId: 2,
  permissions: [],
  goalSubjectIds: new Set([2, 1]),
  packetSubjectIds: new Set([2, 1]),
}

const report = {
  employeeId: 1,
  permissions: [],
  goalSubjectIds: new Set([1]),
  packetSubjectIds: new Set([1]),
}

const reader = {
  employeeId: 9,
  permissions: ['platform.read_all', 'activity.read_all'],
  goalSubjectIds: null,
  packetSubjectIds: null,
}

describe('viewerMayHearEvent', () => {
  it('lets a manager hear a report goal change and hides it from everyone else', () => {
    const event = { topic: 'goals', employeeId: '1', actorEmployeeId: '1' }
    assert.equal(viewerMayHearEvent(manager, event), true)
    assert.equal(viewerMayHearEvent(report, event), true)
    assert.equal(
      viewerMayHearEvent(
        { employeeId: 8, permissions: [], goalSubjectIds: new Set([8]), packetSubjectIds: new Set([8]) },
        event,
      ),
      false,
    )
  })

  it('sends a notification only to the person it is for', () => {
    const event = { topic: 'notifications', employeeId: '1' }
    assert.equal(viewerMayHearEvent(report, event), true)
    assert.equal(viewerMayHearEvent(manager, event), false)
    assert.equal(viewerMayHearEvent(reader, event), false)
  })

  it('keeps packet updates inside the manager scope', () => {
    const event = { topic: 'packets', employeeId: '1' }
    assert.equal(viewerMayHearEvent(manager, event), true)
    assert.equal(
      viewerMayHearEvent(
        {
          employeeId: 4,
          permissions: [],
          goalSubjectIds: new Set([4, 1]),
          packetSubjectIds: new Set([4]),
        },
        event,
      ),
      false,
    )
    assert.equal(viewerMayHearEvent(reader, event), true)
  })

  it('lets company readers hear activity and hides catalog activity from everyone else', () => {
    assert.equal(
      viewerMayHearEvent(reader, { topic: 'activity', employeeId: '1' }),
      true,
    )
    assert.equal(
      viewerMayHearEvent(report, { topic: 'activity' }),
      false,
    )
    assert.equal(
      viewerMayHearEvent(report, { topic: 'activity', employeeId: '1' }),
      true,
    )
  })

  it('tells only the cover parties and their reports about a delegation', () => {
    const event = {
      topic: 'delegations',
      employeeId: '2',
      audienceEmployeeIds: [2, 5, 1],
    }
    assert.equal(viewerMayHearEvent(report, event), true)
    assert.equal(viewerMayHearEvent(reader, event), true)
    assert.equal(
      viewerMayHearEvent(
        { employeeId: 8, permissions: [], goalSubjectIds: new Set([8]), packetSubjectIds: new Set([8]) },
        event,
      ),
      false,
    )
  })
})

describe('broadcastPlatformEvent', () => {
  it('does not send another person’s goal change, or the audience list', () => {
    resetRealtimeHubForTests()
    const frames = []
    const res = {
      write(frame) {
        frames.push(frame)
      },
    }
    attachRealtimeClient(res, report)
    broadcastPlatformEvent({
      id: 'evt-1',
      topic: 'goals',
      employeeId: '7',
      audienceEmployeeIds: [7, 8],
      action: 'updated',
      at: '2026-09-20T00:00:00.000Z',
    })
    assert.equal(frames.length, 0)

    broadcastPlatformEvent({
      id: 'evt-2',
      topic: 'goals',
      employeeId: '1',
      audienceEmployeeIds: [1, 2],
      action: 'updated',
      at: '2026-09-20T00:00:00.000Z',
    })
    assert.equal(frames.length, 1)
    assert.equal(frames[0].includes('audienceEmployeeIds'), false)
    assert.equal(frames[0].includes('"employeeId":"1"'), true)
    resetRealtimeHubForTests()
  })
})
