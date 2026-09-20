import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyGradeChange } from './career.mjs'

test('a first grade is a hire', () => {
  assert.equal(classifyGradeChange('', 'promotion'), 'hire')
  assert.equal(classifyGradeChange(null, undefined), 'hire')
})

test('a later grade change must name promotion, lateral, or demotion', () => {
  assert.equal(classifyGradeChange('IC2', 'promotion'), 'promotion')
  assert.equal(classifyGradeChange('IC2', 'lateral'), 'lateral')
  assert.equal(classifyGradeChange('IC2', 'demotion'), 'demotion')
  assert.throws(() => classifyGradeChange('IC2', ''), /sideways move/)
  assert.throws(() => classifyGradeChange('IC2', 'hire'), /sideways move/)
})
