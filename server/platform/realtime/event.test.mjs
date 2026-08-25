import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizePlatformEvent, parsePlatformEventPayload } from './event.mjs'

describe('platform realtime events', () => {
  it('normalizes employee ids so every client can match the same person', () => {
    const event = normalizePlatformEvent({
      topic: 'goals',
      cycleId: 'q3-2026',
      employeeId: 12,
      actorEmployeeId: 1,
    })
    assert.equal(event.topic, 'goals')
    assert.equal(event.employeeId, '12')
    assert.equal(event.actorEmployeeId, '1')
    assert.equal(event.cycleId, 'q3-2026')
    assert.ok(event.id)
  })

  it('drops unknown topics', () => {
    assert.equal(normalizePlatformEvent({ topic: 'webhook' }), null)
    assert.equal(parsePlatformEventPayload('{"topic":"nope"}'), null)
  })
})
