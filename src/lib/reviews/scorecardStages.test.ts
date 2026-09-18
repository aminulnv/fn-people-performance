import { describe, expect, it } from 'vitest'
import {
  calibrationIsEditable,
  gradeForViewStage,
  managerReviewIsComplete,
  resolveScorecardViewStage,
  scorecardEditStage,
  scorecardStageIsOpen,
  stageShowsReviewForm,
  viewerCanOpenStage,
  visibleScorecardSteps,
} from './scorecardStages'
import type { ReviewPacket, ReviewStageConfig } from './types'

function packet(partial: Partial<ReviewPacket> = {}): ReviewPacket {
  return {
    id: 'pkt-1',
    cycleId: 'annual-2026',
    groupId: 'group-1',
    employeeId: 871,
    managerEmployeeId: 1,
    status: 'in_calibration',
    selfOverallGrade: 'performing',
    managerOverallGrade: 'exceeding',
    calibratedOverallGrade: 'exceptional',
    publishedOverallGrade: null,
    managerOverrideReason: '',
    goalsComponent: null,
    answers: [],
    pillarScores: [],
    calibrationEvents: [],
    appeals: [],
    version: 1,
    ...partial,
  }
}

const stages: ReviewStageConfig[] = [
  { id: 'self_review', enabled: true },
  { id: 'manager_review', enabled: true },
  { id: 'calibration_hod_hrbp', enabled: true },
  { id: 'publish_employees', enabled: true },
  { id: 'appeal', enabled: true },
]

describe('scorecard stage viewing', () => {
  it('defaults the viewer to the current packet stage', () => {
    const steps = visibleScorecardSteps(stages, packet())
    expect(
      resolveScorecardViewStage({
        requested: null,
        steps,
        packet: packet(),
        viewerEmployeeId: 1,
      }),
    ).toBe('calibration_hod_hrbp')
  })

  it('honors a requested stage the viewer is allowed to open', () => {
    const steps = visibleScorecardSteps(stages, packet())
    expect(
      resolveScorecardViewStage({
        requested: 'self_review',
        steps,
        packet: packet(),
        viewerEmployeeId: 1,
      }),
    ).toBe('self_review')
  })

  it('keeps the subject on self-review until results are published', () => {
    const source = packet()
    const steps = visibleScorecardSteps(stages, source)
    expect(viewerCanOpenStage('manager_review', source, 871)).toBe(false)
    expect(
      resolveScorecardViewStage({
        requested: 'manager_review',
        steps,
        packet: source,
        viewerEmployeeId: 871,
      }),
    ).toBe('self_review')
    expect(gradeForViewStage(source, 'self_review', 871)).toBe('performing')
    expect(gradeForViewStage(source, 'manager_review', 871)).toBeNull()
  })

  it('does not open calibration before the manager review is submitted', () => {
    const source = packet({ status: 'manager_in_progress' })
    const steps = visibleScorecardSteps(stages, source)
    const calibration = steps.find((step) => step.id === 'calibration_hod_hrbp')
    expect(calibration).toBeTruthy()
    expect(managerReviewIsComplete('manager_in_progress')).toBe(false)
    expect(calibrationIsEditable('manager_in_progress')).toBe(false)
    expect(calibrationIsEditable('manager_submitted')).toBe(true)
    expect(
      scorecardStageIsOpen(
        calibration!,
        steps.findIndex((step) => step.id === 'calibration_hod_hrbp'),
        steps.findIndex((step) => step.id === 'manager_review'),
        source,
        1,
      ),
    ).toBe(false)
    expect(
      resolveScorecardViewStage({
        requested: 'calibration_hod_hrbp',
        steps,
        packet: source,
        viewerEmployeeId: 1,
      }),
    ).toBe('manager_review')
  })

  it('returns the grade that belongs to the selected stage', () => {
    const source = packet()
    expect(gradeForViewStage(source, 'self_review', 1, { managedEmployeeIds: [871] })).toBe('performing')
    expect(gradeForViewStage(source, 'manager_review', 1, { managedEmployeeIds: [871] })).toBe('exceeding')
    expect(gradeForViewStage(source, 'calibration_hod_hrbp', 1, { managedEmployeeIds: [871] })).toBe(
      'exceptional',
    )
  })

  it('opens the separate appeal stage after the final rating is released', () => {
    const source = packet({
      status: 'released_to_employees',
      publishedOverallGrade: 'performing',
    })
    const steps = visibleScorecardSteps(stages, source)
    expect(
      resolveScorecardViewStage({
        requested: 'appeal',
        steps,
        packet: source,
        viewerEmployeeId: 871,
      }),
    ).toBe('appeal')
  })

  it('keeps the appeal stage closed for everyone except the employee', () => {
    const source = packet({ status: 'released_to_employees' })
    const steps = visibleScorecardSteps(stages, source)
    expect(
      resolveScorecardViewStage({
        requested: 'appeal',
        steps,
        packet: source,
        viewerEmployeeId: 1,
      }),
    ).toBe('publish_employees')
  })
})

describe('scorecardEditStage', () => {
  it('keeps self and manager stages', () => {
    expect(scorecardEditStage('self_review')).toBe('self_review')
    expect(scorecardEditStage('manager_review')).toBe('manager_review')
  })

  it('routes Published Edit to the manager form', () => {
    expect(scorecardEditStage('publish_employees')).toBe('manager_review')
    expect(stageShowsReviewForm('publish_employees')).toBe(true)
  })
})
