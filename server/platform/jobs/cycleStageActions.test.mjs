import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  stageEndOfDayUtc,
  stageInstantUtc,
  stageIsDue,
} from './cycleStageActions.mjs'

describe('cycle stage schedule helpers', () => {
  it('parses UTC wall-clock stage instants', () => {
    const instant = stageInstantUtc({ date: '2027-03-12', time: '06:00' })
    assert.equal(instant?.toISOString(), '2027-03-12T06:00:00.000Z')
  })

  it('treats missing time as midnight UTC', () => {
    const instant = stageInstantUtc({ date: '2027-03-12' })
    assert.equal(instant?.toISOString(), '2027-03-12T00:00:00.000Z')
  })

  it('returns null for bad dates', () => {
    assert.equal(stageInstantUtc(null), null)
    assert.equal(stageInstantUtc({ date: 'nope' }), null)
  })

  it('marks a stage due at or after its instant', () => {
    const edge = { date: '2027-03-12', time: '06:00' }
    assert.equal(
      stageIsDue(edge, new Date('2027-03-12T05:59:59.000Z')),
      false,
    )
    assert.equal(
      stageIsDue(edge, new Date('2027-03-12T06:00:00.000Z')),
      true,
    )
  })

  it('uses end-of-day UTC for date-only closes', () => {
    const end = stageEndOfDayUtc({ date: '2027-01-28' })
    assert.equal(end?.toISOString(), '2027-01-28T23:59:59.999Z')
    assert.equal(
      stageIsDue({ date: '2027-01-28' }, new Date('2027-01-28T12:00:00.000Z'), {
        endOfDay: true,
      }),
      false,
    )
    assert.equal(
      stageIsDue({ date: '2027-01-28' }, new Date('2027-01-29T00:00:00.000Z'), {
        endOfDay: true,
      }),
      true,
    )
  })
})
