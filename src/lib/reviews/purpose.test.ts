import { describe, expect, it } from 'vitest'
import {
  listLinkableSourceCycles,
  sourceLinksFromIds,
  suggestedSourceLinks,
} from './purpose'
import type { ReviewCycle } from './types'

function cycle(
  patch: Partial<ReviewCycle> & Pick<ReviewCycle, 'id' | 'name'>,
): ReviewCycle {
  return {
    type: patch.type ?? 'regular',
    startDate: patch.startDate ?? '2026-01-01',
    endDate: patch.endDate ?? '2026-03-31',
    stagesConfig: {} as ReviewCycle['stagesConfig'],
    settings: {} as ReviewCycle['settings'],
    calibration: {} as ReviewCycle['calibration'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  }
}

describe('listLinkableSourceCycles', () => {
  it('includes quarterly and custom cycles and skips other annuals', () => {
    const cycles = [
      cycle({
        id: 'annual-2026',
        name: 'Annual 2026',
        periodKey: 'annual-2026',
      }),
      cycle({
        id: 'q3-2026',
        name: 'Q3 2026',
        periodKey: 'q3-2026',
        yearKey: '2026',
      }),
      cycle({
        id: 'adhoc-1',
        name: 'Leadership mid-year',
        type: 'custom',
        yearKey: '2026',
      }),
    ]

    const linkable = listLinkableSourceCycles(cycles, {
      excludeId: 'annual-2026',
      yearKey: '2026',
    })
    expect(linkable.map((item) => item.id)).toEqual(['q3-2026', 'adhoc-1'])
  })
})

describe('sourceLinksFromIds', () => {
  it('splits weight evenly across the selected cycles', () => {
    const links = sourceLinksFromIds(['q1-2026', 'adhoc-1'])
    expect(links).toHaveLength(2)
    expect(links.every((link) => link.weightPercent === 50)).toBe(true)
    expect(links[0]).toEqual({
      sourceCycleId: 'q1-2026',
      weightPercent: 50,
      excluded: false,
    })
    expect(links[1]).toEqual({
      sourceCycleId: 'adhoc-1',
      weightPercent: 50,
      excluded: false,
    })
  })
})

describe('suggestedSourceLinks', () => {
  it('defaults to matching quarter keys for the year', () => {
    const cycles = [
      cycle({ id: 'q1-2026', name: 'Q1 2026', periodKey: 'q1-2026' }),
      cycle({ id: 'q3-2026', name: 'Q3 2026', periodKey: 'q3-2026' }),
      cycle({ id: 'adhoc-1', name: 'Custom', type: 'custom' }),
    ]
    expect(suggestedSourceLinks('2026', cycles).map((link) => link.sourceCycleId)).toEqual([
      'q1-2026',
      'q3-2026',
    ])
  })
})
