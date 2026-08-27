import { describe, expect, it } from 'vitest'
import { nestCyclesForList } from './cycleList'
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

describe('nestCyclesForList', () => {
  it('nests included quarters under the annual and keeps unlinked cycles top-level', () => {
    const q1 = cycle({
      id: 'q1-2026',
      name: 'Q1 2026',
      periodKey: 'q1-2026',
      startDate: '2026-01-01',
    })
    const q3 = cycle({
      id: 'q3-2026',
      name: 'Q3 2026',
      periodKey: 'q3-2026',
      startDate: '2026-07-01',
    })
    const annual = cycle({
      id: 'annual-2026',
      name: 'Annual 2026',
      periodKey: 'annual-2026',
      yearKey: '2026',
      sourceLinks: [
        { sourceCycleId: 'q3-2026', weightPercent: 50, excluded: false },
        { sourceCycleId: 'q1-2026', weightPercent: 50, excluded: false },
      ],
    })
    const loose = cycle({
      id: 'q1-2025',
      name: 'Q1 2025',
      periodKey: 'q1-2025',
      yearKey: '2025',
    })

    const nodes = nestCyclesForList([q3, annual, q1, loose])

    expect(nodes.map((node) => node.cycle.id)).toEqual([
      'annual-2026',
      'q1-2025',
    ])
    expect(nodes[0]?.children.map((item) => item.id)).toEqual([
      'q3-2026',
      'q1-2026',
    ])
    expect(nodes[1]?.children).toEqual([])
  })

  it('leaves an excluded or missing source as a top-level cycle', () => {
    const q1 = cycle({
      id: 'q1-2026',
      name: 'Q1 2026',
      periodKey: 'q1-2026',
    })
    const q2 = cycle({
      id: 'q2-2026',
      name: 'Q2 2026',
      periodKey: 'q2-2026',
    })
    const annual = cycle({
      id: 'annual-2026',
      name: 'Annual 2026',
      periodKey: 'annual-2026',
      yearKey: '2026',
      sourceLinks: [
        { sourceCycleId: 'q1-2026', weightPercent: 50, excluded: true },
        { sourceCycleId: 'missing', weightPercent: 50, excluded: false },
      ],
    })

    const nodes = nestCyclesForList([annual, q1, q2])

    expect(nodes.map((node) => node.cycle.id)).toEqual([
      'annual-2026',
      'q1-2026',
      'q2-2026',
    ])
    expect(nodes[0]?.children).toEqual([])
  })

  it('lets the newer annual claim a cycle if two annuals include it', () => {
    const custom = cycle({
      id: 'mid-year',
      name: 'Mid-year',
      type: 'custom',
    })
    const older = cycle({
      id: 'annual-2025',
      name: 'Annual 2025',
      periodKey: 'annual-2025',
      yearKey: '2025',
      sourceLinks: [
        { sourceCycleId: 'mid-year', weightPercent: 100, excluded: false },
      ],
    })
    const newer = cycle({
      id: 'annual-2026',
      name: 'Annual 2026',
      periodKey: 'annual-2026',
      yearKey: '2026',
      sourceLinks: [
        { sourceCycleId: 'mid-year', weightPercent: 100, excluded: false },
      ],
    })

    const nodes = nestCyclesForList([older, newer, custom])

    expect(nodes.map((node) => node.cycle.id)).toEqual([
      'annual-2025',
      'annual-2026',
    ])
    expect(nodes[0]?.children).toEqual([])
    expect(nodes[1]?.children.map((item) => item.id)).toEqual(['mid-year'])
  })
})
