import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calibrationIsEditable,
  managerReviewIsComplete,
  packetForViewer,
} from './visibility.mjs'

function packet(partial = {}) {
  return {
    id: 'pkt-1',
    employeeId: 754,
    status: 'in_calibration',
    selfOverallGrade: 'performing',
    managerOverallGrade: 'exceeding',
    calibratedOverallGrade: 'exceptional',
    publishedOverallGrade: 'exceptional',
    managerOverrideReason: 'Hold the bar',
    answers: [
      { questionId: 'delivered', actorRole: 'self', body: 'I shipped the OKRs.' },
      { questionId: 'delivered', actorRole: 'manager', body: 'Strong delivery.' },
    ],
    pillarScores: [
      { pillarId: 'goals', actorRole: 'self', grade: 'performing', comment: '' },
      { pillarId: 'goals', actorRole: 'manager', grade: 'exceeding', comment: '' },
    ],
    calibrationEvents: [{ id: 'cal-1' }],
    ...partial,
  }
}

test('subject cannot read manager or calibration fields before publish', () => {
  const visible = packetForViewer(packet(), 754)
  assert.equal(visible.selfOverallGrade, 'performing')
  assert.equal(visible.managerOverallGrade, null)
  assert.equal(visible.calibratedOverallGrade, null)
  assert.equal(visible.publishedOverallGrade, null)
  assert.deepEqual(
    visible.answers.map((answer) => answer.actorRole),
    ['self'],
  )
  assert.deepEqual(visible.calibrationEvents, [])
})

test('subject sees the official packet after employee publish', () => {
  const source = packet({ status: 'released_to_employees' })
  assert.deepEqual(packetForViewer(source, 754), source)
})

test('calibration stays closed until the manager review is submitted', () => {
  assert.equal(managerReviewIsComplete('manager_in_progress'), false)
  assert.equal(calibrationIsEditable('manager_in_progress'), false)
  assert.equal(calibrationIsEditable('manager_submitted'), true)
  assert.equal(calibrationIsEditable('released_to_managers'), false)
})

test('managers still receive the full packet', () => {
  const source = packet()
  assert.deepEqual(packetForViewer(source, 1), source)
})
