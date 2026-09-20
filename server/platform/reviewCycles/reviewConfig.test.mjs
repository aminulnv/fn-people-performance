import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeReviewTypes } from './reviewConfig.mjs'

test('normalizeReviewTypes keeps line manager and self only', () => {
  assert.deepEqual(
    normalizeReviewTypes({
      line_manager: false,
      self: true,
      upwards: true,
      peer: true,
      functional_manager: true,
    }),
    { line_manager: true, self: true },
  )
})

test('normalizeReviewTypes treats a missing self review as off', () => {
  assert.deepEqual(normalizeReviewTypes(null), {
    line_manager: true,
    self: false,
  })
})
