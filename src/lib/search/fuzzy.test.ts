import { describe, expect, it } from 'vitest'
import { mergeHighlightRanges, scoreFuzzy } from './fuzzy'

describe('scoreFuzzy', () => {
  it('ranks a leading substring above a later one', () => {
    const alice = scoreFuzzy('ali', 'Alice Rahman')
    const later = scoreFuzzy('ali', 'Annual calibration')
    expect(alice).not.toBeNull()
    expect(later).not.toBeNull()
    expect(alice!.score).toBeGreaterThan(later!.score)
    expect(alice!.ranges).toEqual([{ start: 0, end: 3 }])
  })

  it('matches a subsequence when the substring is absent', () => {
    const match = scoreFuzzy('gls', 'Goals')
    expect(match).not.toBeNull()
    expect(match!.ranges).toEqual([
      { start: 0, end: 1 },
      { start: 3, end: 5 },
    ])
  })

  it('returns null when characters are missing', () => {
    expect(scoreFuzzy('xyz', 'Alice')).toBeNull()
  })

  it('treats an empty query as a zero-score match', () => {
    expect(scoreFuzzy('  ', 'Alice')).toEqual({ score: 0, ranges: [] })
  })
})

describe('mergeHighlightRanges', () => {
  it('merges overlapping and touching ranges', () => {
    expect(
      mergeHighlightRanges([
        { start: 0, end: 2 },
        { start: 2, end: 4 },
        { start: 6, end: 7 },
      ]),
    ).toEqual([
      { start: 0, end: 4 },
      { start: 6, end: 7 },
    ])
  })
})
