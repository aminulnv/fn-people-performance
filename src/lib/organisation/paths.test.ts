import { describe, expect, it } from 'vitest'
import {
  departmentPathForName,
  teamPathForNames,
} from './paths'

describe('organisation unit paths', () => {
  it('returns a department detail path for a named department', () => {
    expect(departmentPathForName('People & Culture')).toBe(
      '/organisation/departments/people%20%26%20culture',
    )
  })

  it('returns null when the department name is empty', () => {
    expect(departmentPathForName('   ')).toBeNull()
  })

  it('returns a team detail path scoped to the department', () => {
    expect(
      teamPathForNames('People & Culture', 'Performance & Total Rewards'),
    ).toBe(
      '/organisation/teams/people%20%26%20culture%3A%3Aperformance%20%26%20total%20rewards',
    )
  })

  it('returns null when the team name is empty', () => {
    expect(teamPathForNames('People & Culture', '')).toBeNull()
  })
})
