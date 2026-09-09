import test from 'node:test'
import assert from 'node:assert/strict'
import { publicationExclusionClause } from './publicationFilter.mjs'

test('employee publication excludes employees on the cycle blacklist', () => {
  const clause = publicationExclusionClause('employees')

  assert.match(clause, /review_cycle_grade_exclusions/)
  assert.match(clause, /exclusion\.cycle_id = platform\.review_packets\.cycle_id/)
  assert.match(
    clause,
    /exclusion\.employee_id = platform\.review_packets\.employee_id/,
  )
})

test('manager publication is not restricted by the employee blacklist', () => {
  assert.equal(publicationExclusionClause('managers'), '')
})
