import { describe, expect, it } from 'vitest'
import { buildDefaultStagesConfig, DEFAULT_CALIBRATION, DEFAULT_CYCLE_SETTINGS } from './demoData'
import {
  assignMembersExclusively,
  cloneCycleSettingsIntoGroup,
  findCycleGroupForPerson,
  groupDiffersFromCycle,
  resolveCyclePolicyForPerson,
} from './cycleGroups'
import type { CycleGroup, ReviewCycle } from './types'

function cycle(): ReviewCycle {
  return {
    id: 'q3-2026',
    name: 'Q3 2026',
    type: 'regular',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    stagesConfig: buildDefaultStagesConfig('2026-07-01', '2026-09-30'),
    settings: { ...DEFAULT_CYCLE_SETTINGS },
    calibration: { ...DEFAULT_CALIBRATION },
    groups: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function group(overrides: Partial<CycleGroup> = {}): CycleGroup {
  const host = cycle()
  return {
    id: 'group-leadership',
    cycleId: host.id,
    name: 'Leadership',
    memberIds: [101],
    settings: structuredClone(host.settings),
    stagesConfig: structuredClone(host.stagesConfig),
    calibration: structuredClone(host.calibration),
    createdAt: host.createdAt,
    version: 1,
    ...overrides,
  }
}

describe('resolveCyclePolicyForPerson', () => {
  it('does not assign a group when the person is listed nowhere', () => {
    const host = cycle()
    host.groups = [group()]
    const resolved = resolveCyclePolicyForPerson(host, 202)
    expect(resolved.groupId).toBeNull()
  })

  it('returns the matching group settings', () => {
    const host = cycle()
    const leadership = group({
      settings: {
        ...host.settings,
        postWindowGoalPolicy: 'hard_stop',
      },
    })
    host.groups = [leadership]
    const resolved = resolveCyclePolicyForPerson(host, 101)
    expect(resolved.groupId).toBe(leadership.id)
    expect(resolved.settings.postWindowGoalPolicy).toBe('hard_stop')
  })
})

describe('assignMembersExclusively', () => {
  it('moves a person from one group to another', () => {
    const first = group({ id: 'a', memberIds: [101, 102] })
    const second = group({ id: 'b', memberIds: [] })
    const next = assignMembersExclusively([first, second], 'b', [101])
    expect(next.find((item) => item.id === 'a')?.memberIds).toEqual([102])
    expect(next.find((item) => item.id === 'b')?.memberIds).toEqual([101])
  })
})

describe('cloneCycleSettingsIntoGroup', () => {
  it('starts a new group from the cycle timeframe template', () => {
    const host = cycle()
    host.settings.postWindowGoalPolicy = 'hard_stop'
    const created = cloneCycleSettingsIntoGroup(host, {
      id: 'group-new',
      name: 'Senior leadership',
      memberIds: [9],
    })
    expect(created.settings.postWindowGoalPolicy).toBe('hard_stop')
    expect(created.stagesConfig).toEqual(host.stagesConfig)
    expect(created.memberIds).toEqual([9])
    expect(groupDiffersFromCycle(host, created)).toBe(false)
  })
})

describe('findCycleGroupForPerson', () => {
  it('returns null for a missing or invalid employee id', () => {
    expect(findCycleGroupForPerson(cycle(), 1)).toBeNull()
    expect(findCycleGroupForPerson(cycle(), Number.NaN)).toBeNull()
  })
})
