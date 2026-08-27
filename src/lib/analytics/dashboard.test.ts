import { describe, expect, it } from 'vitest'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { PersonGoals } from '@/lib/goals/types'
import {
  DEFAULT_CALIBRATION,
  DEFAULT_CYCLE_SETTINGS,
  buildDefaultStagesConfig,
} from '@/lib/reviews/demoData'
import { applyCycleModules } from '@/lib/reviews/reviewStages'
import type {
  GradeBandId,
  ReviewCycle,
  ReviewPacket,
  ReviewPacketStatus,
} from '@/lib/reviews/types'
import {
  buildAnalyticsDashboard,
  defaultAnalyticsScope,
  officialGrade,
  personMatchesAnalyticsScope,
  reviewWorkBucket,
} from './dashboard'

function employee(
  partial: Partial<PlatformEmployee> & { employeeId: number; fullName: string },
): PlatformEmployee {
  return {
    email: `${partial.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
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

function cycle(input: {
  id?: string
  name?: string
  periodKey?: string
  memberIds: number[]
  modules: { goals: boolean; reviews: boolean }
}): ReviewCycle {
  const periodKey = input.periodKey ?? 'q3-2026'
  const stages = applyCycleModules(
    buildDefaultStagesConfig('2026-07-01', '2026-09-30', 'quarterly_checkin', periodKey),
    input.modules,
    periodKey.startsWith('annual') ? 'annual_appraisal' : 'quarterly_checkin',
    periodKey,
  )
  return {
    id: input.id ?? 'q3-2026',
    name: input.name ?? 'Q3 2026',
    type: 'regular',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    periodKey,
    yearKey: '2026',
    stagesConfig: stages,
    settings: DEFAULT_CYCLE_SETTINGS,
    calibration: DEFAULT_CALIBRATION,
    groups: [
      {
        id: 'grp-1',
        cycleId: input.id ?? 'q3-2026',
        name: 'Everyone',
        memberIds: input.memberIds,
        stagesConfig: stages,
        settings: DEFAULT_CYCLE_SETTINGS,
        calibration: DEFAULT_CALIBRATION,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function packet(
  employeeId: number,
  status: ReviewPacketStatus,
  extras: Partial<ReviewPacket> = {},
): ReviewPacket {
  return {
    id: `pkt-${employeeId}`,
    cycleId: 'q3-2026',
    groupId: 'grp-1',
    employeeId,
    managerEmployeeId: extras.managerEmployeeId ?? 1,
    status,
    selfOverallGrade: extras.selfOverallGrade ?? null,
    managerOverallGrade: extras.managerOverallGrade ?? null,
    calibratedOverallGrade: extras.calibratedOverallGrade ?? null,
    publishedOverallGrade: extras.publishedOverallGrade ?? null,
    managerOverrideReason: '',
    goalsComponent: null,
    answers: [],
    pillarScores: [],
    calibrationEvents: [],
    appeals: extras.appeals ?? [],
    version: 1,
    ...extras,
  }
}

function submission(
  employeeId: number,
  status: PersonGoals['status'],
  goalCount = 0,
): PersonGoals {
  return {
    personId: String(employeeId),
    status,
    goals: Array.from({ length: goalCount }, (_, index) => ({
      id: `g-${employeeId}-${index}`,
      description: `Goal ${index + 1}`,
      weight: 100 / Math.max(goalCount, 1),
      measurements: [],
    })),
  }
}

const manager = employee({
  employeeId: 1,
  fullName: 'Alex Manager',
  department: 'Product',
  jobTitle: 'Manager',
})
const report = employee({
  employeeId: 2,
  fullName: 'Riley Report',
  department: 'Product',
  reportsToId: 1,
  reportsToName: 'Alex Manager',
})
const other = employee({
  employeeId: 3,
  fullName: 'Casey Other',
  department: 'Marketing',
  reportsToId: 9,
  reportsToName: 'Other Manager',
})

describe('officialGrade', () => {
  it('prefers the released grade over drafts', () => {
    expect(
      officialGrade(
        packet(2, 'released_to_employees', {
          selfOverallGrade: 'exceptional',
          managerOverallGrade: 'performing',
          publishedOverallGrade: 'exceeding',
        }),
      ),
    ).toBe('exceeding')
  })
})

describe('reviewWorkBucket', () => {
  it('groups statuses by the next operating decision', () => {
    expect(reviewWorkBucket('not_started')).toBe('notStarted')
    expect(reviewWorkBucket('manager_in_progress')).toBe('inProgress')
    expect(reviewWorkBucket('manager_submitted')).toBe('waiting')
    expect(reviewWorkBucket('released_to_managers')).toBe('released')
  })
})

describe('defaultAnalyticsScope', () => {
  it('sends org-wide readers to everyone', () => {
    expect(
      defaultAnalyticsScope({
        canReadAll: true,
        hasDirectReports: true,
        hasDepartment: true,
      }),
    ).toBe('all')
  })

  it('sends managers to their reports', () => {
    expect(
      defaultAnalyticsScope({
        canReadAll: false,
        hasDirectReports: true,
        hasDepartment: true,
      }),
    ).toBe('reports')
  })
})

describe('personMatchesAnalyticsScope', () => {
  const directory = [manager, report, other]

  it('keeps everyone in the all scope', () => {
    expect(personMatchesAnalyticsScope(other, 'all', manager, directory)).toBe(true)
  })

  it('limits reports to the viewer line', () => {
    expect(personMatchesAnalyticsScope(report, 'reports', manager, directory)).toBe(
      true,
    )
    expect(personMatchesAnalyticsScope(other, 'reports', manager, directory)).toBe(
      false,
    )
  })
})

describe('buildAnalyticsDashboard', () => {
  it('ignores people who are not in the cycle group', () => {
    const dashboard = buildAnalyticsDashboard({
      cycle: cycle({
        memberIds: [1, 2],
        modules: { goals: false, reviews: true },
      }),
      employees: [manager, report, other],
      packets: [
        packet(1, 'released_to_employees', { publishedOverallGrade: 'performing' }),
        packet(2, 'not_started'),
        packet(3, 'not_started'),
      ],
      submissions: [],
      scope: 'all',
      viewer: manager,
    })

    expect(dashboard.memberCount).toBe(2)
    expect(dashboard.reviews?.notStarted).toBe(1)
    expect(dashboard.reviews?.released).toBe(1)
  })

  it('does not invent a goals section on a reviews-only cycle', () => {
    const dashboard = buildAnalyticsDashboard({
      cycle: cycle({
        periodKey: 'annual-2026',
        memberIds: [2],
        modules: { goals: false, reviews: true },
      }),
      employees: [manager, report],
      packets: [packet(2, 'self_in_progress')],
      submissions: [],
      scope: 'all',
      viewer: manager,
    })

    expect(dashboard.goalsEnabled).toBe(false)
    expect(dashboard.goals).toBeNull()
    expect(dashboard.attention.some((item) => item.id === 'goals_missing')).toBe(
      false,
    )
  })

  it('hides a not-started review pipeline before the review window opens', () => {
    const dashboard = buildAnalyticsDashboard({
      cycle: cycle({
        periodKey: 'q4-2026',
        memberIds: [2, 3],
        modules: { goals: true, reviews: true },
      }),
      employees: [manager, report, other],
      packets: [
        packet(2, 'not_started'),
        packet(3, 'not_started'),
      ],
      submissions: [],
      scope: 'all',
      viewer: manager,
      today: new Date('2026-08-26T00:00:00.000Z'),
    })

    expect(dashboard.reviews).toBeNull()
    expect(dashboard.pipeline).toEqual([])
    expect(dashboard.attention.map((item) => item.id)).toEqual(['goals_missing'])
  })

  it('does not invent a review pipeline on a goals-only cycle', () => {
    const dashboard = buildAnalyticsDashboard({
      cycle: cycle({
        periodKey: 'q4-2026',
        memberIds: [2, 3],
        modules: { goals: true, reviews: false },
      }),
      employees: [manager, report, other],
      packets: [
        packet(2, 'not_started'),
        packet(3, 'not_started'),
      ],
      submissions: [submission(2, 'draft', 1)],
      scope: 'all',
      viewer: manager,
    })

    expect(dashboard.reviewsEnabled).toBe(false)
    expect(dashboard.pipeline).toEqual([])
    expect(dashboard.gradeMix).toEqual([])
    expect(dashboard.goals?.missing).toBe(1)
    expect(dashboard.attention.map((item) => item.id)).toEqual(['goals_missing'])
  })

  it('surfaces review bottlenecks and skips empty noise', () => {
    const dashboard = buildAnalyticsDashboard({
      cycle: cycle({
        memberIds: [2, 3],
        modules: { goals: true, reviews: true },
      }),
      employees: [manager, report, other],
      packets: [
        packet(2, 'not_started', { managerEmployeeId: 1 }),
        packet(3, 'manager_in_progress', {
          managerEmployeeId: 1,
          managerOverallGrade: 'performing',
        }),
      ],
      submissions: [],
      scope: 'all',
      viewer: manager,
    })

    expect(dashboard.attention.map((item) => item.id)).toEqual([
      'reviews_not_started',
      'manager_reviews_open',
      'goals_missing',
    ])
    expect(dashboard.attention.some((item) => item.id === 'open_appeals')).toBe(
      false,
    )
    expect(dashboard.managers[0]).toMatchObject({
      employeeId: 1,
      unfinished: 2,
      notStarted: 1,
      inProgress: 1,
    })
  })

  it('compares grade mix to the calibration guideline', () => {
    const grades: GradeBandId[] = [
      'exceptional',
      'exceptional',
      'performing',
      'performing',
    ]
    const dashboard = buildAnalyticsDashboard({
      cycle: cycle({
        memberIds: [11, 12, 13, 14],
        modules: { goals: false, reviews: true },
      }),
      employees: grades.map((grade, index) =>
        employee({
          employeeId: 11 + index,
          fullName: `Person ${index}`,
          department: 'Product',
        }),
      ),
      packets: grades.map((grade, index) =>
        packet(11 + index, 'released_to_employees', {
          publishedOverallGrade: grade,
        }),
      ),
      submissions: [],
      scope: 'all',
      viewer: manager,
    })

    const exceptional = dashboard.gradeMix.find((row) => row.id === 'exceptional')
    const unsatisfactory = dashboard.gradeMix.find(
      (row) => row.id === 'unsatisfactory',
    )
    expect(exceptional).toMatchObject({
      count: 2,
      percent: 50,
      guidelinePercent: 2,
      deltaPoints: 48,
    })
    expect(unsatisfactory).toMatchObject({
      count: 0,
      percent: 0,
      guidelinePercent: 5,
    })
  })

  it('ranks the department with the most unfinished reviews first', () => {
    const dashboard = buildAnalyticsDashboard({
      cycle: cycle({
        memberIds: [2, 3],
        modules: { goals: false, reviews: true },
      }),
      employees: [manager, report, other],
      packets: [
        packet(2, 'released_to_employees', {
          publishedOverallGrade: 'performing',
        }),
        packet(3, 'not_started'),
      ],
      submissions: [],
      scope: 'all',
      viewer: manager,
    })

    expect(dashboard.departments.map((row) => row.name)).toEqual([
      'Marketing',
      'Product',
    ])
    expect(dashboard.departments[0].unfinishedPercent).toBe(100)
    expect(dashboard.departments[1].unfinishedPercent).toBe(0)
  })

  it('narrows the picture to the viewer reports scope', () => {
    const dashboard = buildAnalyticsDashboard({
      cycle: cycle({
        memberIds: [1, 2, 3],
        modules: { goals: false, reviews: true },
      }),
      employees: [manager, report, other],
      packets: [
        packet(2, 'manager_in_progress', { managerEmployeeId: 1 }),
        packet(3, 'not_started', { managerEmployeeId: 9 }),
      ],
      submissions: [],
      scope: 'reports',
      viewer: manager,
    })

    expect(dashboard.memberCount).toBe(1)
    expect(dashboard.reviews?.inProgress).toBe(1)
  })
})
