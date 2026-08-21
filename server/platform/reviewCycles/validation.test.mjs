import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDefaultStagesConfig,
  normalizeStagesConfig,
  validateCycleStagesConfig,
} from './validation.mjs'

test('normalizeStagesConfig fills missing performance and publish defaults', () => {
  const normalized = normalizeStagesConfig(
    {
      processMode: 'schedule',
      goals: {
        employee: { startDate: '2026-07-01', endDate: '2026-07-30' },
        extensions: [],
      },
    },
    { startDate: '2026-07-01', endDate: '2026-09-30' },
  )

  assert.ok(normalized.performance?.employeeStart?.date)
  assert.ok(normalized.publish?.toAll?.date)
  assert.equal(normalized.processMode, 'schedule')
  assert.doesNotThrow(() => validateCycleStagesConfig(normalized))
})

test('normalizeStagesConfig always schedules stages by date', () => {
  const normalized = normalizeStagesConfig(
    {
      processMode: 'manual',
      goals: {
        employee: { startDate: '2026-07-01', endDate: '2026-07-30' },
        extensions: [],
      },
    },
    { startDate: '2026-07-01', endDate: '2026-09-30' },
  )

  assert.equal(normalized.processMode, 'schedule')
})

test('validateCycleStagesConfig rejects invalid goal windows with 400', () => {
  const config = buildDefaultStagesConfig('2026-07-01', '2026-09-30')
  config.goals.employee = {
    startDate: '2026-07-10',
    endDate: '2026-07-01',
  }

  assert.throws(
    () => validateCycleStagesConfig(config),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.match(error.message, /Goal setting/)
      return true
    },
  )
})
