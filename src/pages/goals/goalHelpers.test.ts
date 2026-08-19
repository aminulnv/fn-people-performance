import { describe, expect, it } from 'vitest'
import {
  canViewPersonGoals,
  formatRefreshAge,
  goalSectionLabels,
  goalTitle,
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
})
