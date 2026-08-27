import { describe, expect, it } from 'vitest'
import {
  PURPOSE_SHORT_LABEL,
  cyclePurposeOf,
  excludeSourceFromAnnualPatches,
  includeSourceInAnnualPatches,
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

describe('PURPOSE_SHORT_LABEL', () => {
  it('names the three kinds without calling period cycles scheduled', () => {
    expect(PURPOSE_SHORT_LABEL.quarterly_checkin).toBe('Quarterly')
    expect(PURPOSE_SHORT_LABEL.annual_appraisal).toBe('Annual')
    expect(PURPOSE_SHORT_LABEL.custom).toBe('Custom')
    expect(
      PURPOSE_SHORT_LABEL[
        cyclePurposeOf({ type: 'regular', periodKey: 'q3-2026' })
      ],
    ).toBe('Quarterly')
    expect(
      PURPOSE_SHORT_LABEL[
        cyclePurposeOf({ type: 'regular', periodKey: 'annual-2026' })
      ],
    ).toBe('Annual')
    expect(
      PURPOSE_SHORT_LABEL[cyclePurposeOf({ type: 'custom', periodKey: '' })],
    ).toBe('Custom')
  })
})

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

describe('includeSourceInAnnualPatches', () => {
  it('adds a loose cycle to the annual', () => {
    const annual = cycle({
      id: 'annual-2026',
      name: 'Annual 2026',
      periodKey: 'annual-2026',
      sourceLinks: [
        { sourceCycleId: 'q3-2026', weightPercent: 100, excluded: false },
      ],
    })
    const patches = includeSourceInAnnualPatches(
      [
        annual,
        cycle({ id: 'q3-2026', name: 'Q3 2026', periodKey: 'q3-2026' }),
        cycle({ id: 'q1-2025', name: 'Q1 2025', periodKey: 'q1-2025' }),
      ],
      'annual-2026',
      'q1-2025',
    )

    expect(patches).toEqual([
      {
        cycleId: 'annual-2026',
        sourceLinks: sourceLinksFromIds(['q3-2026', 'q1-2025']),
      },
    ])
  })

  it('moves a cycle from one annual to another', () => {
    const from = cycle({
      id: 'annual-2025',
      name: 'Annual 2025',
      periodKey: 'annual-2025',
      sourceLinks: sourceLinksFromIds(['q1-2025', 'q2-2025']),
    })
    const to = cycle({
      id: 'annual-2026',
      name: 'Annual 2026',
      periodKey: 'annual-2026',
      sourceLinks: sourceLinksFromIds(['q3-2026']),
    })
    const patches = includeSourceInAnnualPatches(
      [
        from,
        to,
        cycle({ id: 'q1-2025', name: 'Q1 2025', periodKey: 'q1-2025' }),
        cycle({ id: 'q2-2025', name: 'Q2 2025', periodKey: 'q2-2025' }),
        cycle({ id: 'q3-2026', name: 'Q3 2026', periodKey: 'q3-2026' }),
      ],
      'annual-2026',
      'q1-2025',
    )

    expect(patches).toEqual([
      {
        cycleId: 'annual-2026',
        sourceLinks: sourceLinksFromIds(['q3-2026', 'q1-2025']),
      },
      {
        cycleId: 'annual-2025',
        sourceLinks: sourceLinksFromIds(['q2-2025']),
      },
    ])
  })

  it('returns no patches when the cycle is already included', () => {
    const annual = cycle({
      id: 'annual-2026',
      name: 'Annual 2026',
      periodKey: 'annual-2026',
      sourceLinks: sourceLinksFromIds(['q3-2026']),
    })
    expect(
      includeSourceInAnnualPatches(
        [
          annual,
          cycle({ id: 'q3-2026', name: 'Q3 2026', periodKey: 'q3-2026' }),
        ],
        'annual-2026',
        'q3-2026',
      ),
    ).toEqual([])
  })

  it('ignores dropping an annual onto another annual', () => {
    expect(
      includeSourceInAnnualPatches(
        [
          cycle({
            id: 'annual-2026',
            name: 'Annual 2026',
            periodKey: 'annual-2026',
          }),
          cycle({
            id: 'annual-2025',
            name: 'Annual 2025',
            periodKey: 'annual-2025',
          }),
        ],
        'annual-2026',
        'annual-2025',
      ),
    ).toEqual([])
  })
})

describe('excludeSourceFromAnnualPatches', () => {
  it('removes a nested cycle from its annual', () => {
    const annual = cycle({
      id: 'annual-2026',
      name: 'Annual 2026',
      periodKey: 'annual-2026',
      sourceLinks: sourceLinksFromIds(['q3-2026', 'q1-2025']),
    })
    expect(
      excludeSourceFromAnnualPatches(
        [
          annual,
          cycle({ id: 'q3-2026', name: 'Q3 2026', periodKey: 'q3-2026' }),
          cycle({ id: 'q1-2025', name: 'Q1 2025', periodKey: 'q1-2025' }),
        ],
        'q1-2025',
      ),
    ).toEqual([
      {
        cycleId: 'annual-2026',
        sourceLinks: sourceLinksFromIds(['q3-2026']),
      },
    ])
  })

  it('returns no patches when the cycle is not included', () => {
    expect(
      excludeSourceFromAnnualPatches(
        [
          cycle({
            id: 'annual-2026',
            name: 'Annual 2026',
            periodKey: 'annual-2026',
            sourceLinks: sourceLinksFromIds(['q3-2026']),
          }),
          cycle({ id: 'q1-2025', name: 'Q1 2025', periodKey: 'q1-2025' }),
        ],
        'q1-2025',
      ),
    ).toEqual([])
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
