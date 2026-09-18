import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calibrationIsEditable,
  managerReviewIsComplete,
  managerReviewWriteAllowed,
  packetForViewer,
} from './visibility.mjs'

function packet(partial = {}) {
  return {
    id: 'pkt-1',
    employeeId: 754,
    managerEmployeeId: 1,
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

test('only the real manager, their cover, or All read + write access can write a manager review', () => {
  const base = {
    actorEmployeeId: 9,
    subjectEmployeeId: 754,
    reportsToEmployeeId: 1,
    coveredManagerIds: [],
    canWriteAll: false,
  }
  assert.equal(managerReviewWriteAllowed(base), false)
  assert.equal(
    managerReviewWriteAllowed({ ...base, actorEmployeeId: 1 }),
    true,
  )
  assert.equal(
    managerReviewWriteAllowed({ ...base, coveredManagerIds: [1] }),
    true,
  )
  assert.equal(
    managerReviewWriteAllowed({
      ...base,
      actorEmployeeId: 1,
      reportsToEmployeeId: 8,
    }),
    false,
  )
  assert.equal(
    managerReviewWriteAllowed({ ...base, canWriteAll: true }),
    true,
  )
  assert.equal(
    managerReviewWriteAllowed({
      ...base,
      actorEmployeeId: 754,
      canWriteAll: true,
    }),
    false,
  )
})

test('the real manager still receives the full packet', () => {
  const source = packet()
  assert.deepEqual(
    packetForViewer(source, 1, [], { managedEmployeeIds: [754] }),
    source,
  )
})

test('a reviewer stored on the packet cannot see unpublished grades', () => {
  const visible = packetForViewer(packet(), 1)
  assert.equal(visible.managerOverallGrade, null)
  assert.equal(visible.calibratedOverallGrade, null)
})

test('a colleague cannot read unpublished manager or calibration grades', () => {
  const visible = packetForViewer(packet(), 2)
  assert.equal(visible.managerOverallGrade, null)
  assert.equal(visible.calibratedOverallGrade, null)
  assert.equal(visible.publishedOverallGrade, null)
  assert.deepEqual(
    visible.answers.map((answer) => answer.actorRole),
    ['self'],
  )
  assert.deepEqual(visible.calibrationEvents, [])
})

test('all read access can see unpublished grades', () => {
  const source = packet()
  assert.deepEqual(
    packetForViewer(source, 2, [], { canViewAllReviews: true }),
    source,
  )
})

test('published question answers are filtered for each output audience', () => {
  const questions = [
    {
      id: 'delivered',
      outputVisibility: ['manager'],
    },
  ]
  const employeePacket = packetForViewer(
    packet({ status: 'released_to_employees' }),
    754,
    questions,
  )
  assert.deepEqual(employeePacket.answers, [])

  const managerPacket = packetForViewer(
    packet({ status: 'released_to_managers' }),
    1,
    questions,
    { managedEmployeeIds: [754] },
  )
  assert.equal(managerPacket.answers.length, 2)
})
