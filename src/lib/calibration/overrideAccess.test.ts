import { describe, expect, it } from 'vitest'
import type { CalibratorAssignments } from './sessionApi'
import { canOverrideCalibrationGrade } from './overrideAccess'

const subject = {
  employeeId: 10,
  department: 'Product',
  team: 'Core',
  teamId: 8,
  departmentHeadId: 2,
  hrbpId: 3,
}

const empty: CalibratorAssignments = {
  departments: [],
  teams: [],
  people: [],
}

describe('canOverrideCalibrationGrade', () => {
  it('allows the department head, the HRBP, and a department calibrator', () => {
    const assignments: CalibratorAssignments = {
      ...empty,
      departments: [
        {
          departmentId: 1,
          department: 'Product',
          headEmployeeId: 2,
          hrbpEmployeeId: 3,
          employeeIds: [4],
        },
      ],
    }
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 2,
        subject,
        assignments,
      }),
    ).toBe(true)
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 4,
        subject,
        assignments,
      }),
    ).toBe(true)
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 9,
        subject,
        assignments,
      }),
    ).toBe(false)
  })

  it('allows a calibrator assigned only to this team', () => {
    const assignments: CalibratorAssignments = {
      ...empty,
      teams: [
        {
          teamId: 8,
          team: 'Core',
          department: 'Product',
          employeeIds: [5],
        },
      ],
    }
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 5,
        subject,
        assignments,
      }),
    ).toBe(true)
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 5,
        subject: { ...subject, teamId: 9, team: 'Other' },
        assignments,
      }),
    ).toBe(false)
  })

  it('lets an admin with write access override someone else', () => {
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 9,
        subject,
        assignments: empty,
        permissions: ['platform.write_all'],
      }),
    ).toBe(true)
  })

  it('does not treat read-only admin access as an override', () => {
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 9,
        subject,
        assignments: empty,
        permissions: ['platform.read_all'],
      }),
    ).toBe(false)
  })

  it('still blocks an admin with write access from overriding their own grade', () => {
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 10,
        subject,
        assignments: empty,
        permissions: ['platform.write_all'],
      }),
    ).toBe(false)
  })

  it('allows a calibrator assigned only to this person', () => {
    const assignments: CalibratorAssignments = {
      ...empty,
      people: [{ subjectEmployeeId: 10, employeeIds: [6] }],
    }
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 6,
        subject,
        assignments,
      }),
    ).toBe(true)
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 6,
        subject: { ...subject, employeeId: 11 },
        assignments,
      }),
    ).toBe(false)
    expect(
      canOverrideCalibrationGrade({
        viewerEmployeeId: 10,
        subject,
        assignments,
      }),
    ).toBe(false)
  })
})
