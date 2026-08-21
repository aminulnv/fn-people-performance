import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  resolveEffectiveGoalDeadline,
  stagesConfigForGoalPolicy,
} from './deadline.mjs'

describe('resolveEffectiveGoalDeadline', () => {
  it('uses the latest matching population extension', () => {
    const stagesConfig = {
      goals: {
        employee: { startDate: '2026-06-01', endDate: '2026-07-01' },
        extensions: [
          {
            id: 'team',
            endDate: '2026-08-15',
            scope: { type: 'team', teamId: 9 },
          },
          {
            id: 'person',
            endDate: '2026-08-31',
            scope: { type: 'people', employeeIds: [101] },
          },
        ],
      },
    }

    assert.equal(
      resolveEffectiveGoalDeadline(stagesConfig, {
        employeeId: 101,
        departmentId: 4,
        teamId: 9,
      }),
      '2026-08-31',
    )
  })

  it('returns the standard deadline for a non-matching person', () => {
    const stagesConfig = {
      goals: {
        employee: { startDate: '2026-06-01', endDate: '2026-07-01' },
        extensions: [
          {
            id: 'department',
            endDate: '2026-08-15',
            scope: { type: 'department', departmentId: 4 },
          },
        ],
      },
    }

    assert.equal(
      resolveEffectiveGoalDeadline(stagesConfig, {
        employeeId: 202,
        departmentId: 8,
        teamId: 12,
      }),
      '2026-07-01',
    )
  })
})

describe('stagesConfigForGoalPolicy', () => {
  it('leaves stages unchanged when no group is present', () => {
    const stagesConfig = {
      goals: {
        employee: { startDate: '2026-06-01', endDate: '2026-07-01' },
        extensions: [{ id: 'ext', endDate: '2026-08-01', scope: { type: 'people', employeeIds: [1] } }],
      },
    }
    assert.deepEqual(stagesConfigForGoalPolicy({ stages_config: stagesConfig }), stagesConfig)
  })

  it('drops cycle extensions when the person is in a group', () => {
    const stagesConfig = {
      goals: {
        employee: { startDate: '2026-06-01', endDate: '2026-07-15' },
        extensions: [{ id: 'ext', endDate: '2026-08-01', scope: { type: 'people', employeeIds: [1] } }],
      },
    }
    assert.deepEqual(
      stagesConfigForGoalPolicy({ stages_config: stagesConfig, group_id: 'group-1' }),
      {
        goals: {
          employee: { startDate: '2026-06-01', endDate: '2026-07-15' },
          extensions: [],
        },
      },
    )
  })
})
