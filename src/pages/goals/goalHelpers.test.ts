import { describe, expect, it } from 'vitest'
import {
  assignManagerDelegationLocal,
  resetManagerDelegationsForTests,
} from '@/lib/delegations/store'
import {
  canViewPersonGoals,
  formatRefreshAge,
  goalSectionLabels,
  cascadeTableLabel,
  cascadeToTableLabel,
  goalTitle,
  isCascadedGoal,
  goalsMyReportsPath,
  goalsMyGoalsPath,
  hashForManagerTab,
  isGoalsMyReportsHash,
  managerTabFromHash,
  metricCount,
  metricCountLabel,
  metricSummary,
  metricTipDetails,
  personMatchesScope,
} from './goalHelpers'
import type { Goal } from '@/lib/goals/types'

const untitled: Goal = {
  id: 'g1',
  description: '  ',
  weight: 50,
  measurements: [],
}

describe('goalTitle', () => {
  it('uses the description when present', () => {
    expect(goalTitle({ ...untitled, description: 'Ship reviews' }, 0)).toBe(
      'Ship reviews',
    )
  })

  it('falls back to an indexed untitled label', () => {
    expect(goalTitle(untitled, 2)).toBe('Untitled goal 3')
  })

  it('uses the manager goal name for a blank or untitled cascaded goal', () => {
    expect(
      goalTitle(
        {
          ...untitled,
          description: '',
          cascadedFromGoalId: 'mgr-1',
          linkedGoalLabel: 'Raise quality bar',
        },
        0,
      ),
    ).toBe('Raise quality bar')
    expect(
      goalTitle(
        {
          ...untitled,
          description: 'Untitled Cascading Goal from Ada',
          cascadedFromGoalId: 'mgr-1',
          linkedGoalLabel: 'Raise quality bar',
        },
        0,
      ),
    ).toBe('Raise quality bar')
  })
})

describe('isCascadedGoal', () => {
  it('is true when the goal is linked to a manager goal', () => {
    expect(
      isCascadedGoal({ cascadedFromGoalId: 'mgr-1', linkedGoalLabel: '' }),
    ).toBe(true)
    expect(
      isCascadedGoal({ linkedGoalLabel: 'Raise quality bar' }),
    ).toBe(true)
  })

  it('is false for an ordinary goal', () => {
    expect(isCascadedGoal({})).toBe(false)
    expect(isCascadedGoal({ linkedGoalLabel: '  ' })).toBe(false)
  })
})

describe('cascadeTableLabel', () => {
  it('names the source goal when the snapshot title is present', () => {
    expect(cascadeTableLabel({ linkedGoalLabel: 'Raise quality bar' })).toBe(
      'Cascaded from Raise quality bar',
    )
  })

  it('falls back when the source title is missing', () => {
    expect(cascadeTableLabel({})).toBe('Cascaded from a manager goal')
  })
})

describe('cascadeToTableLabel', () => {
  it('names one recipient', () => {
    expect(cascadeToTableLabel([{ personName: 'Saif Ivna Alam' }])).toBe(
      'Cascaded to Saif Ivna Alam',
    )
  })

  it('names two recipients, then summarises more', () => {
    expect(
      cascadeToTableLabel([
        { personName: 'Saif' },
        { personName: 'Ada' },
      ]),
    ).toBe('Cascaded to Saif and Ada')
    expect(
      cascadeToTableLabel([
        { personName: 'Saif' },
        { personName: 'Ada' },
        { personName: 'Ben' },
      ]),
    ).toBe('Cascaded to Saif and 2 others')
  })
})

describe('goalsMyReportsPath', () => {
  it('appends the my-reports hash', () => {
    expect(goalsMyReportsPath('q3-2026', '1')).toBe(
      '/goals/q3-2026/1#my-reports',
    )
  })
})

describe('goalsMyGoalsPath', () => {
  it('appends the my-goals hash', () => {
    expect(goalsMyGoalsPath('q3-2026', '1')).toBe(
      '/goals/q3-2026/1#my-goals',
    )
  })
})

describe('managerTabFromHash', () => {
  it('maps goal section hashes to manager tabs', () => {
    expect(managerTabFromHash('#my-reports')).toBe('team')
    expect(managerTabFromHash('#my-goals')).toBe('mine')
    expect(managerTabFromHash('#profile')).toBeNull()
  })
})

describe('hashForManagerTab', () => {
  it('maps manager tabs to goal section hashes', () => {
    expect(hashForManagerTab('team')).toBe('my-reports')
    expect(hashForManagerTab('mine')).toBe('my-goals')
  })
})

describe('isGoalsMyReportsHash', () => {
  it('matches the hash with or without a leading #', () => {
    expect(isGoalsMyReportsHash('#my-reports')).toBe(true)
    expect(isGoalsMyReportsHash('my-reports')).toBe(true)
    expect(isGoalsMyReportsHash('#my-goals')).toBe(false)
  })
})

describe('goalSectionLabels', () => {
  it('uses first-person labels on the viewer profile', () => {
    expect(goalSectionLabels('Dionne Fonseka', true)).toEqual({
      goals: 'My Goals',
      reports: 'My Reports',
    })
  })

  it("uses the person's first name on someone else's profile", () => {
    expect(goalSectionLabels('Dionne Fonseka', false)).toEqual({
      goals: "Dionne's Goals",
      reports: "Dionne's Reports",
    })
  })
})

describe('metricCount', () => {
  it('counts measurement panels on a goal', () => {
    expect(
      metricCount({
        ...untitled,
        measurements: [
          {
            id: 'm1',
            kind: 'metric',
            title: 'NPS',
            weight: 50,
            unit: 'number',
            direction: 'increase',
            startValue: 0,
            targetValue: 10,
          },
          {
            id: 'm2',
            kind: 'metric',
            title: 'Revenue',
            weight: 50,
            unit: 'currency',
            direction: 'increase',
            startValue: 0,
            targetValue: 1,
          },
        ],
      }),
    ).toBe(2)
  })

  it('labels a compact count for the table badge', () => {
    expect(metricCountLabel(0)).toBe('—')
    expect(metricCountLabel(1)).toBe('1 metric')
    expect(metricCountLabel(2)).toBe('2 metrics')
  })
})

describe('metricSummary', () => {
  it('shows initial → current → target for a single metric', () => {
    expect(
      metricSummary({
        ...untitled,
        measurements: [
          {
            id: 'm1',
            kind: 'metric',
            title: 'NPS',
            weight: 100,
            unit: 'number',
            direction: 'increase',
            startValue: 0,
            currentValue: 2,
            targetValue: 6,
          },
        ],
      }),
    ).toBe('0 → 2 → 6')
  })

  it('falls back to completed → total for milestone goals', () => {
    expect(
      metricSummary({
        ...untitled,
        measurements: [
          {
            id: 'ms1',
            kind: 'milestone',
            title: 'Ship',
            weight: 50,
            complete: true,
          },
          {
            id: 'ms2',
            kind: 'milestone',
            title: 'Launch',
            weight: 50,
            complete: false,
          },
        ],
      }),
    ).toBe('1 → 2')
  })
})

describe('metricTipDetails', () => {
  it('builds the tooltip rows for a single metric', () => {
    expect(
      metricTipDetails({
        ...untitled,
        measurements: [
          {
            id: 'm1',
            kind: 'metric',
            title: 'NPS',
            weight: 100,
            unit: 'number',
            direction: 'increase',
            startValue: 0,
            currentValue: 0,
            targetValue: 6,
          },
        ],
      }),
    ).toEqual({
      title: 'Increase metric',
      initial: '0',
      current: '0',
      target: '6',
      unit: 'Number',
    })
  })
})

describe('personMatchesScope', () => {
  const viewer = { id: 'mgr', department: 'Engineering' }
  const report = { id: 'rep', department: 'Engineering', managerId: 'mgr' }
  const peer = { id: 'peer', department: 'Engineering', managerId: 'other' }
  const otherDept = { id: 'sales', department: 'Sales', managerId: 'mgr' }

  it('keeps everyone when scope is all or the viewer is unknown', () => {
    expect(personMatchesScope(peer, 'all', viewer)).toBe(true)
    expect(personMatchesScope(peer, 'reports', null)).toBe(true)
  })

  it('keeps only the viewer for My goals', () => {
    expect(personMatchesScope(viewer, 'mine', viewer)).toBe(true)
    expect(personMatchesScope(report, 'mine', viewer)).toBe(false)
    expect(personMatchesScope(peer, 'mine', viewer)).toBe(false)
  })

  it('keeps only direct reports for My reports', () => {
    expect(personMatchesScope(report, 'reports', viewer)).toBe(true)
    expect(personMatchesScope(peer, 'reports', viewer)).toBe(false)
    expect(personMatchesScope(viewer, 'reports', viewer)).toBe(false)
  })

  it('keeps the same department for My department', () => {
    expect(personMatchesScope(peer, 'department', viewer)).toBe(true)
    expect(personMatchesScope(otherDept, 'department', viewer)).toBe(false)
  })

  it('matches nobody when the viewer has no department', () => {
    expect(
      personMatchesScope(peer, 'department', { id: 'mgr', department: '  ' }),
    ).toBe(false)
  })
})

describe('canViewPersonGoals', () => {
  const manager = {
    id: 'mgr',
    department: 'Engineering',
    reportIds: ['lead'],
  }
  const people = [
    manager,
    { id: 'lead', managerId: 'mgr' },
    { id: 'skip', managerId: 'lead' },
    { id: 'peer', managerId: 'other' },
  ]

  it('allows direct and skip-level viewing without skip-level editing powers', () => {
    expect(
      canViewPersonGoals(
        { id: 'lead', department: 'Engineering', managerId: 'mgr' },
        manager,
        people,
      ),
    ).toBe(true)
    expect(
      canViewPersonGoals(
        { id: 'skip', department: 'Engineering', managerId: 'lead' },
        manager,
        people,
      ),
    ).toBe(true)
    expect(
      canViewPersonGoals(
        { id: 'peer', department: 'Engineering', managerId: 'other' },
        manager,
        people,
      ),
    ).toBe(false)
  })

  it('lets a delegate see the absent manager’s reports', () => {
    resetManagerDelegationsForTests()
    assignManagerDelegationLocal({
      absentEmployeeId: 2,
      delegateEmployeeId: 4,
      startsOn: '2020-01-01',
      endsOn: '2030-01-01',
      absentName: 'Manager',
      delegateName: 'Cover',
      assignedByEmployeeId: 9,
      assignedByName: 'Admin',
    })
    expect(
      canViewPersonGoals(
        { id: '1', department: 'Engineering', managerId: '2' },
        { id: '4', department: 'Engineering', reportIds: [] },
        [
          { id: '4' },
          { id: '2', managerId: '9' },
          { id: '1', managerId: '2' },
        ],
      ),
    ).toBe(true)
    resetManagerDelegationsForTests()
  })

  it('allows an all-read admin to view everyone', () => {
    expect(
      canViewPersonGoals(
        { id: 'peer', department: 'Sales', managerId: 'other' },
        { ...manager, permissions: ['platform.read_all'] },
        people,
      ),
    ).toBe(true)
  })
})

describe('formatRefreshAge', () => {
  it('returns a dash when no timestamp is stored', () => {
    expect(formatRefreshAge()).toBe('—')
  })

  it('formats hours for recent updates', () => {
    const now = Date.parse('2026-08-14T12:00:00.000Z')
    expect(formatRefreshAge('2026-08-14T09:00:00.000Z', now)).toBe('3h')
  })

  it('formats whole days as a compact age', () => {
    const now = Date.parse('2026-08-20T12:00:00.000Z')
    expect(formatRefreshAge('2026-08-13T12:00:00.000Z', now)).toBe('7d')
  })
})
