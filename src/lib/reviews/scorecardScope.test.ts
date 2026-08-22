import { describe, expect, it } from 'vitest'
import {
  defaultScorecardScope,
  hashForScorecardScope,
  resolveScorecardScope,
  scorecardMatchesScope,
  scorecardScopeFromHash,
  visibleScorecardScopes,
} from './scorecardScope'

describe('scorecardScopeFromHash', () => {
  it('maps review scope hashes', () => {
    expect(scorecardScopeFromHash('#my-reviews')).toBe('mine')
    expect(scorecardScopeFromHash('my-reports')).toBe('reports')
    expect(scorecardScopeFromHash('#everyone')).toBe('all')
    expect(scorecardScopeFromHash('#profile')).toBeNull()
  })
})

describe('hashForScorecardScope', () => {
  it('maps review scopes to hashes', () => {
    expect(hashForScorecardScope('mine')).toBe('my-reviews')
    expect(hashForScorecardScope('reports')).toBe('my-reports')
    expect(hashForScorecardScope('all')).toBe('everyone')
  })
})

describe('defaultScorecardScope', () => {
  it('opens the manager queue when the viewer has reports', () => {
    expect(defaultScorecardScope(true)).toBe('reports')
    expect(defaultScorecardScope(false)).toBe('mine')
  })
})

describe('visibleScorecardScopes', () => {
  it('keeps My Reviews and Everyone for an individual contributor', () => {
    expect(
      visibleScorecardScopes({ hasViewer: true, hasDirectReports: false }).map(
        (option) => option.id,
      ),
    ).toEqual(['mine', 'all'])
  })

  it('adds My Reports for a manager', () => {
    expect(
      visibleScorecardScopes({ hasViewer: true, hasDirectReports: true }).map(
        (option) => option.id,
      ),
    ).toEqual(['mine', 'reports', 'all'])
  })

  it('falls back to Everyone when the viewer is unknown', () => {
    expect(
      visibleScorecardScopes({ hasViewer: false, hasDirectReports: false }),
    ).toEqual([{ id: 'all', label: 'Everyone' }])
  })
})

describe('resolveScorecardScope', () => {
  it('falls back when the hashed scope is hidden', () => {
    expect(
      resolveScorecardScope('reports', [{ id: 'mine' }, { id: 'all' }]),
    ).toBe('mine')
  })
})

describe('scorecardMatchesScope', () => {
  const own = { employeeId: 1, isMine: false }
  const report = { employeeId: 2, isMine: true }
  const peer = { employeeId: 3, isMine: false }

  it('keeps everyone when scope is all or the viewer is unknown', () => {
    expect(scorecardMatchesScope(peer, 'all', 1)).toBe(true)
    expect(scorecardMatchesScope(peer, 'reports', null)).toBe(true)
  })

  it('keeps only the viewer for My Reviews', () => {
    expect(scorecardMatchesScope(own, 'mine', 1)).toBe(true)
    expect(scorecardMatchesScope(report, 'mine', 1)).toBe(false)
    expect(scorecardMatchesScope(peer, 'mine', 1)).toBe(false)
  })

  it('keeps only direct reports for My Reports', () => {
    expect(scorecardMatchesScope(report, 'reports', 1)).toBe(true)
    expect(scorecardMatchesScope(own, 'reports', 1)).toBe(false)
    expect(scorecardMatchesScope(peer, 'reports', 1)).toBe(false)
  })
})
