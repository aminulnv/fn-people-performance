import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  assignManagerDelegationLocal,
  resetManagerDelegationsForTests,
} from '@/lib/delegations/store'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  buildEmployeeScorecardHistory,
  buildScorecardDetail,
  buildScorecardsForCycle,
  answersFromFeedbackText,
  feedbackFromPacket,
  packetFieldsForRole,
  packetStageLabel,
  gradeFromGoalProgress,
  gradeFromPacket,
  goalsGradeFromPacket,
  latestScorecardGrade,
  scorecardStatusFromPacket,
} from './scorecards'
import { createCycleGroup, listReviewCycles, resetReviewsStoreForTests } from './store'
import type { ReviewPacket, ReviewPacketStatus } from './types'

function employee(
  partial: Partial<PlatformEmployee> & { employeeId: number },
): PlatformEmployee {
  return {
    fullName: 'Pat Example',
    email: 'pat@example.com',
    startDate: '2024-01-01',
    jobTitle: 'Engineer',
    department: 'Product',
    team: 'Core',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC2',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  }
}

function packet(
  partial: Partial<ReviewPacket> & { employeeId: number },
): ReviewPacket {
  return {
    id: `pkt-${partial.cycleId ?? 'q3-2026'}-${partial.employeeId}`,
    cycleId: 'q3-2026',
    groupId: 'group-1',
    managerEmployeeId: null,
    status: 'not_started',
    selfOverallGrade: null,
    managerOverallGrade: null,
    calibratedOverallGrade: null,
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

beforeEach(() => {
  resetReviewsStoreForTests()
  resetManagerDelegationsForTests()
})

afterEach(() => {
  resetManagerDelegationsForTests()
})

describe('scorecardStatusFromPacket', () => {
  it.each<[ReviewPacketStatus, 'not_started' | 'in_progress' | 'completed']>([
    ['not_started', 'not_started'],
    ['self_in_progress', 'in_progress'],
    ['manager_submitted', 'in_progress'],
    ['calibrated', 'completed'],
    ['released_to_managers', 'completed'],
    ['released_to_employees', 'completed'],
    ['appealed', 'completed'],
  ])('maps %s to %s', (status, expected) => {
    expect(scorecardStatusFromPacket(status)).toBe(expected)
  })
})

describe('gradeFromPacket', () => {
  it('hides a manager grade until the cycle is released', () => {
    expect(
      gradeFromPacket(
        packet({
          employeeId: 7,
          status: 'manager_submitted',
          managerOverallGrade: 'exceeding',
        }),
      ),
    ).toEqual({ grade: 'exceeding', gradeHidden: true })
  })

  it('shows the published grade after release', () => {
    expect(
      gradeFromPacket(
        packet({
          employeeId: 7,
          status: 'released_to_managers',
          managerOverallGrade: 'exceeding',
          publishedOverallGrade: 'performing',
        }),
      ),
    ).toEqual({ grade: 'performing', gradeHidden: false })
  })

  it('leaves the grade blank when nothing has been written', () => {
    expect(gradeFromPacket(packet({ employeeId: 7 }))).toEqual({
      grade: null,
      gradeHidden: false,
    })
  })
})

describe('buildScorecardsForCycle', () => {
  it('does not invent reviews for people outside the cycle', () => {
    const rows = buildScorecardsForCycle('q3-2026', [
      employee({ employeeId: 1, fullName: 'Ada' }),
      employee({ employeeId: 2, fullName: 'Bea' }),
    ])
    expect(rows).toEqual([])
  })

  it('uses packet status and grade instead of placeholder completed rows', async () => {
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('expected a seeded cycle')
    await createCycleGroup(cycle.id, { name: 'Everyone', memberIds: [1, 2] })

    const rows = buildScorecardsForCycle(
      cycle.id,
      [
        employee({ employeeId: 1, fullName: 'Ada' }),
        employee({ employeeId: 2, fullName: 'Bea' }),
        employee({ employeeId: 3, fullName: 'Cara' }),
      ],
      null,
      [
        packet({
          cycleId: cycle.id,
          employeeId: 1,
          status: 'released_to_employees',
          publishedOverallGrade: 'performing',
        }),
        packet({
          cycleId: cycle.id,
          employeeId: 2,
          status: 'not_started',
        }),
      ],
    )

    expect(rows.map((row) => row.employeeId)).toEqual([1, 2])
    expect(rows[0]).toMatchObject({
      status: 'completed',
      grade: 'performing',
      gradeHidden: false,
    })
    expect(rows[1]).toMatchObject({
      status: 'not_started',
      grade: null,
      gradeHidden: false,
    })
  })

  it('does not show unpublished official grades on the subject own row', async () => {
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('expected a seeded cycle')
    await createCycleGroup(cycle.id, { name: 'Everyone', memberIds: [2] })
    const subject = employee({
      employeeId: 2,
      fullName: 'Bea',
      email: 'bea@example.com',
    })

    const rows = buildScorecardsForCycle(
      cycle.id,
      [subject],
      'bea@example.com',
      [
        packet({
          cycleId: cycle.id,
          employeeId: 2,
          status: 'manager_in_progress',
          selfOverallGrade: 'performing',
          managerOverallGrade: 'exceeding',
        }),
      ],
    )

    expect(rows[0]).toMatchObject({
      grade: 'performing',
      gradeHidden: true,
    })
  })

  it('marks delegated managers\' reports as the delegate\'s reviews', async () => {
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('expected a seeded cycle')
    await createCycleGroup(cycle.id, { name: 'Everyone', memberIds: [1] })
    const manager = employee({
      employeeId: 2,
      fullName: 'Line Manager',
      email: 'manager@example.com',
    })
    const report = employee({
      employeeId: 1,
      fullName: 'Report',
      reportsToId: 2,
    })
    const cover = employee({
      employeeId: 4,
      fullName: 'Peer Cover',
      email: 'cover@example.com',
    })
    assignManagerDelegationLocal({
      absentEmployeeId: 2,
      delegateEmployeeId: 4,
      startsOn: '2020-01-01',
      endsOn: '2030-01-01',
      absentName: manager.fullName,
      delegateName: cover.fullName,
      assignedByEmployeeId: 9,
      assignedByName: 'Admin',
    })

    const rows = buildScorecardsForCycle(
      cycle.id,
      [manager, report, cover],
      'cover@example.com',
      [packet({ cycleId: cycle.id, employeeId: 1 })],
    )

    expect(rows[0]).toMatchObject({
      employeeId: 1,
      isMine: true,
    })
  })
})

describe('packetFieldsForRole', () => {
  it('returns the same questions, answers, and grades the form writes', () => {
    const fields = packetFieldsForRole(
      packet({
        employeeId: 4,
        status: 'released_to_employees',
        managerOverallGrade: 'exceeding',
        answers: [
          {
            questionId: 'retain',
            actorRole: 'manager',
            body: 'Yes, this person is a keeper.',
          },
        ],
        pillarScores: [
          {
            pillarId: 'goals',
            actorRole: 'manager',
            grade: 'exceeding',
            comment: '',
          },
        ],
      }),
      'manager',
      [
        {
          id: 'retain',
          prompt: 'Will we do what it takes to retain this person?',
          enabled: true,
          required: false,
          visibility: ['calibrators'],
        },
      ],
      [
        {
          id: 'goals',
          kind: 'goals',
          label: 'Goals',
          enabled: true,
          weight: 50,
          pullLinkedQuarters: true,
        },
      ],
    )

    expect(fields).toEqual({
      answers: [
        {
          questionId: 'retain',
          prompt: 'Will we do what it takes to retain this person?',
          body: 'Yes, this person is a keeper.',
        },
      ],
      pillars: [
        {
          pillarId: 'goals',
          label: 'Goals',
          weight: 50,
          grade: 'exceeding',
          comment: '',
        },
      ],
      overallGrade: 'exceeding',
    })
    expect(packetStageLabel('released_to_employees')).toBe(
      'Released to employees',
    )
  })

  it('omits strength and improvement answers from the form readout', () => {
    const fields = packetFieldsForRole(
      packet({
        employeeId: 4,
        answers: [
          {
            questionId: 'delivered',
            actorRole: 'manager',
            body: 'Hit the Q1 outcomes.',
          },
          {
            questionId: 'retain',
            actorRole: 'manager',
            body: 'Yes, this person is a keeper.',
          },
        ],
      }),
      'manager',
      [
        {
          id: 'delivered',
          prompt: 'What did I deliver this year?',
          enabled: true,
          required: true,
          visibility: ['manager'],
        },
        {
          id: 'retain',
          prompt: 'Will we do what it takes to retain this person?',
          enabled: true,
          required: false,
          visibility: ['calibrators'],
        },
      ],
      [],
    )

    expect(fields.answers).toEqual([
      {
        questionId: 'retain',
        prompt: 'Will we do what it takes to retain this person?',
        body: 'Yes, this person is a keeper.',
      },
    ])
  })
})

describe('gradeFromGoalProgress', () => {
  it('returns no band when the person has no goals', () => {
    expect(gradeFromGoalProgress(0, 0)).toBeNull()
  })

  it('maps completion into a band instead of always saying performing', () => {
    expect(gradeFromGoalProgress(0, 3)).toBe('unsatisfactory')
    expect(gradeFromGoalProgress(80, 3)).toBe('performing')
    expect(gradeFromGoalProgress(100, 3)).toBe('exceeding')
  })
})

describe('goalsGradeFromPacket', () => {
  it('returns no band when the goals pillar has not been graded', () => {
    expect(goalsGradeFromPacket(packet({ employeeId: 7 }))).toBeNull()
  })

  it('does not treat goal progress as a selected grade', () => {
    expect(
      goalsGradeFromPacket(
        packet({
          employeeId: 7,
          status: 'manager_in_progress',
          managerOverallGrade: 'exceeding',
        }),
      ),
    ).toBeNull()
  })

  it('uses the manager goals grade when one is written', () => {
    expect(
      goalsGradeFromPacket(
        packet({
          employeeId: 7,
          pillarScores: [
            {
              pillarId: 'goals',
              actorRole: 'self',
              grade: 'developing',
              comment: '',
            },
            {
              pillarId: 'goals',
              actorRole: 'manager',
              grade: 'exceeding',
              comment: '',
            },
          ],
        }),
      ),
    ).toBe('exceeding')
  })
})

describe('latestScorecardGrade', () => {
  it('prefers the published grade over earlier drafts', () => {
    expect(
      latestScorecardGrade(
        packet({
          employeeId: 4,
          selfOverallGrade: 'performing',
          managerOverallGrade: 'developing',
          publishedOverallGrade: 'exceeding',
        }),
      ),
    ).toEqual({ grade: 'exceeding', source: 'published' })
  })

  it('shows the subject only their self grade until publish', () => {
    expect(
      latestScorecardGrade(
        packet({
          employeeId: 4,
          status: 'in_calibration',
          selfOverallGrade: 'performing',
          managerOverallGrade: 'developing',
          calibratedOverallGrade: 'exceeding',
          publishedOverallGrade: 'exceptional',
        }),
        4,
      ),
    ).toEqual({ grade: 'performing', source: 'self' })
  })
})

describe('feedbackFromPacket', () => {
  it('prefers manager answers and splits strengths from development', () => {
    expect(
      feedbackFromPacket(
        packet({
          employeeId: 4,
          status: 'released_to_employees',
          releasedToEmployeeAt: '2026-08-22T00:00:00.000Z',
          answers: [
            {
              questionId: 'delivered',
              actorRole: 'self',
              body: 'I shipped the OKR tool.',
            },
            {
              questionId: 'delivered',
              actorRole: 'manager',
              body: 'Owned the OKR platform end to end.',
            },
            {
              questionId: 'improve',
              actorRole: 'manager',
              body: 'Make ideas simpler for the team to follow.',
            },
          ],
        }),
        'Api Singha',
      ),
    ).toEqual({
      authorName: 'Api Singha',
      authorRole: 'LM',
      dateLabel: '22 Aug 2026',
      strengths: 'Owned the OKR platform end to end.',
      developments: 'Make ideas simpler for the team to follow.',
    })
  })

  it('writes strengths and developments into one packed answer each', () => {
    expect(
      answersFromFeedbackText(
        [{ id: 'delivered' }, { id: 'improve' }, { id: 'retain' }],
        'Shipped the OKR tool\n\nRaised the quality bar',
        'Simplify how ideas are shared',
      ),
    ).toEqual([
      { questionId: 'delivered', body: '' },
      { questionId: 'improve', body: '' },
      { questionId: 'strengths', body: 'Shipped the OKR tool\n\nRaised the quality bar' },
      { questionId: 'developments', body: 'Simplify how ideas are shared' },
    ])
  })

  it('joins older split answers into the single strength and development fields', () => {
    expect(
      feedbackFromPacket(
        packet({
          employeeId: 4,
          answers: [
            {
              questionId: 'delivered',
              actorRole: 'manager',
              body: 'Owned the OKR platform end to end.',
            },
            {
              questionId: 'strengths',
              actorRole: 'manager',
              body: 'You ship reliably and at pace.',
            },
            {
              questionId: 'developments',
              actorRole: 'manager',
              body: 'Make ideas simpler for others to follow.',
            },
          ],
        }),
        'Api Singha',
      ),
    ).toMatchObject({
      strengths:
        'Owned the OKR platform end to end.\n\nYou ship reliably and at pace.',
      developments: 'Make ideas simpler for others to follow.',
    })
  })

  it('treats the quarterly manager comment as a strength', () => {
    expect(
      feedbackFromPacket(
        packet({
          employeeId: 4,
          answers: [
            {
              questionId: 'quarter-comment',
              actorRole: 'manager',
              body: 'An outstanding quarter on the OKR platform.',
            },
          ],
        }),
        'Api Singha',
      ).strengths,
    ).toEqual('An outstanding quarter on the OKR platform.')
  })
})

describe('buildScorecardDetail', () => {
  it('opens the view model from a real packet instead of placeholder copy', async () => {
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('expected a seeded cycle')
    await createCycleGroup(cycle.id, { name: 'Everyone', memberIds: [4] })
    const subject = employee({ employeeId: 4, fullName: 'Sheikh Syed Ahmed' })
    const detail = buildScorecardDetail(cycle.id, 4, [subject], null, packet({
      cycleId: cycle.id,
      employeeId: 4,
      status: 'released_to_employees',
      publishedOverallGrade: 'exceeding',
      answers: [
        {
          questionId: 'delivered',
          actorRole: 'manager',
          body: 'Closed the quarter cleanly.',
        },
      ],
    }))

    expect(detail).toMatchObject({
      employeeName: 'Sheikh Syed Ahmed',
      status: 'completed',
      overallGrade: 'exceeding',
      goalsOverallBand: null,
      feedback: {
        strengths: 'Closed the quarter cleanly.',
        developments: '',
      },
    })
  })

  it('uses the assigned goals pillar grade instead of inferring one from progress', async () => {
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('expected a seeded cycle')
    await createCycleGroup(cycle.id, { name: 'Everyone', memberIds: [4] })
    const subject = employee({ employeeId: 4, fullName: 'Sheikh Syed Ahmed' })

    const ungraded = buildScorecardDetail(cycle.id, 4, [subject], null, packet({
      cycleId: cycle.id,
      employeeId: 4,
      status: 'manager_in_progress',
      managerOverallGrade: 'exceeding',
    }))
    expect(ungraded?.goalsOverallBand).toBeNull()

    const graded = buildScorecardDetail(cycle.id, 4, [subject], null, packet({
      cycleId: cycle.id,
      employeeId: 4,
      status: 'manager_in_progress',
      managerOverallGrade: 'exceeding',
      pillarScores: [
        {
          pillarId: 'goals',
          actorRole: 'manager',
          grade: 'performing',
          comment: '',
        },
      ],
    }))
    expect(graded?.goalsOverallBand).toBe('performing')
  })

  it('keeps unpublished manager grades off the subject scorecard', async () => {
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('expected a seeded cycle')
    await createCycleGroup(cycle.id, { name: 'Everyone', memberIds: [4] })
    const subject = employee({
      employeeId: 4,
      fullName: 'Sheikh Syed Ahmed',
      email: 'sheikh@example.com',
    })
    const hidden = buildScorecardDetail(
      cycle.id,
      4,
      [subject],
      'sheikh@example.com',
      packet({
        cycleId: cycle.id,
        employeeId: 4,
        status: 'in_calibration',
        selfOverallGrade: 'performing',
        managerOverallGrade: 'exceeding',
        calibratedOverallGrade: 'exceptional',
        answers: [
          {
            questionId: 'delivered',
            actorRole: 'self',
            body: 'I closed my OKRs.',
          },
          {
            questionId: 'delivered',
            actorRole: 'manager',
            body: 'Closed the quarter cleanly.',
          },
        ],
        pillarScores: [
          {
            pillarId: 'goals',
            actorRole: 'self',
            grade: 'performing',
            comment: '',
          },
          {
            pillarId: 'goals',
            actorRole: 'manager',
            grade: 'exceeding',
            comment: '',
          },
        ],
      }),
    )

    expect(hidden).toMatchObject({
      overallGrade: 'performing',
      goalsOverallBand: 'performing',
      feedback: { strengths: 'I closed my OKRs.', developments: '' },
    })
  })
})

describe('buildEmployeeScorecardHistory', () => {
  it('builds one row per cycle the person belongs to', async () => {
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('expected a seeded cycle')
    await createCycleGroup(cycle.id, { name: 'Everyone', memberIds: [7] })
    const subject = employee({ employeeId: 7 })
    const rows = buildEmployeeScorecardHistory(subject, [subject])

    expect(rows).toHaveLength(1)
    expect(rows[0]?.employeeId).toBe(7)
    expect(rows[0]?.status).toBe('not_started')
    expect(rows[0]?.grade).toBeNull()
  })
})
