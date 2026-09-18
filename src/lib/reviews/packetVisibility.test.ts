import { describe, expect, it } from 'vitest'
import { packetForViewer } from './packetVisibility'
import type { ReviewPacket } from './types'

const questions = [
  {
    id: 'delivered',
    prompt: 'What was delivered?',
    enabled: true,
    required: true,
    visibility: ['employee', 'manager', 'calibrators'] as const,
    outputVisibility: ['manager'] as const,
  },
]

function packet(partial: Partial<ReviewPacket> = {}): ReviewPacket {
  return {
    id: 'pkt-1',
    cycleId: 'annual-2026',
    groupId: 'group-1',
    employeeId: 754,
    managerEmployeeId: 1,
    status: 'in_calibration',
    selfOverallGrade: 'performing',
    managerOverallGrade: 'exceeding',
    calibratedOverallGrade: 'exceptional',
    publishedOverallGrade: 'exceptional',
    managerOverrideReason: 'Hold the bar',
    goalsComponent: null,
    answers: [
      { questionId: 'delivered', actorRole: 'self', body: 'I shipped the OKRs.' },
      { questionId: 'delivered', actorRole: 'manager', body: 'Strong delivery.' },
    ],
    pillarScores: [
      { pillarId: 'goals', actorRole: 'self', grade: 'performing', comment: '' },
      { pillarId: 'goals', actorRole: 'manager', grade: 'exceeding', comment: '' },
    ],
    calibrationEvents: [
      {
        id: 'cal-1',
        stageId: 'calibration_hod_hrbp',
        fromGrade: 'exceeding',
        toGrade: 'exceptional',
        reason: 'Company impact',
        actorEmployeeId: 1,
        actorName: 'Alex Manager',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    appeals: [],
    version: 1,
    ...partial,
  }
}

describe('packetForViewer', () => {
  it('lets the subject see only self-review before publish', () => {
    const visible = packetForViewer(packet(), 754)
    expect(visible.selfOverallGrade).toBe('performing')
    expect(visible.managerOverallGrade).toBeNull()
    expect(visible.calibratedOverallGrade).toBeNull()
    expect(visible.publishedOverallGrade).toBeNull()
    expect(visible.managerOverrideReason).toBe('')
    expect(visible.answers).toEqual([
      { questionId: 'delivered', actorRole: 'self', body: 'I shipped the OKRs.' },
    ])
    expect(visible.pillarScores).toEqual([
      { pillarId: 'goals', actorRole: 'self', grade: 'performing', comment: '' },
    ])
    expect(visible.calibrationEvents).toEqual([])
  })

  it('still hides official grades after release to managers only', () => {
    const visible = packetForViewer(
      packet({ status: 'released_to_managers' }),
      754,
    )
    expect(visible.publishedOverallGrade).toBeNull()
    expect(visible.managerOverallGrade).toBeNull()
  })

  it('shows the official review after it is published to employees', () => {
    const source = packet({ status: 'released_to_employees' })
    expect(packetForViewer(source, 754)).toEqual(source)
  })

  it('removes answers hidden from the employee output', () => {
    const source = packet({ status: 'released_to_employees' })
    expect(packetForViewer(source, 754, questions as never).answers).toEqual([])
  })

  it('keeps answers enabled for the real manager output', () => {
    const source = packet({ status: 'released_to_managers' })
    expect(
      packetForViewer(source, 1, questions as never, {
        managedEmployeeIds: [754],
      }).answers,
    ).toEqual(source.answers)
  })

  it('does not redact the packet for the real manager', () => {
    const source = packet()
    expect(
      packetForViewer(source, 1, [], { managedEmployeeIds: [754] }),
    ).toEqual(source)
  })

  it('hides unpublished grades from a reviewer stored on the packet', () => {
    const visible = packetForViewer(packet(), 1)
    expect(visible.managerOverallGrade).toBeNull()
    expect(visible.calibratedOverallGrade).toBeNull()
  })

  it('hides unpublished grades from a colleague', () => {
    const visible = packetForViewer(packet(), 2)
    expect(visible.managerOverallGrade).toBeNull()
    expect(visible.calibratedOverallGrade).toBeNull()
    expect(visible.calibrationEvents).toEqual([])
    expect(visible.answers.map((answer) => answer.actorRole)).toEqual(['self'])
  })

  it('shows unpublished grades to All read access and All read + write access', () => {
    const source = packet()
    expect(
      packetForViewer(source, 2, [], { canViewAllReviews: true }),
    ).toEqual(source)
  })
})
