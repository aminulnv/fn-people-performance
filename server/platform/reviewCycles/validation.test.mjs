import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDefaultStagesConfig,
  normalizeStagesConfig,
  validateCycleDateRange,
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

test('normalizeStagesConfig coerces string department ids on extensions', () => {
  const config = buildDefaultStagesConfig('2026-07-01', '2026-09-30')
  config.goals.extensions = [
    {
      id: 'product-extension',
      endDate: '2026-08-01',
      scope: {
        type: 'department',
        departmentId: '16',
        departmentName: 'Product',
      },
    },
  ]

  const normalized = normalizeStagesConfig(config, {
    startDate: '2026-07-01',
    endDate: '2026-09-30',
  })

  assert.deepEqual(normalized.goals.extensions, [
    {
      id: 'product-extension',
      endDate: '2026-08-01',
      scope: {
        type: 'department',
        departmentId: 16,
        departmentName: 'Product',
      },
    },
  ])
  assert.doesNotThrow(() => validateCycleStagesConfig(normalized))
})

test('validateCycleStagesConfig accepts a Q4 goals-only cycle', () => {
  const config = buildDefaultStagesConfig(
    '2026-10-01',
    '2026-12-31',
    'quarterly_checkin',
    'q4-2026',
  )
  assert.doesNotThrow(() => validateCycleStagesConfig(config))
})

test('validateCycleDateRange rejects an end before start', () => {
  assert.throws(
    () => validateCycleDateRange('2026-08-01', '2026-07-01'),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.match(error.message, /end on or after/)
      return true
    },
  )
  assert.doesNotThrow(() => validateCycleDateRange('2026-07-01', '2026-07-01'))
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
