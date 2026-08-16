import { describe, expect, it } from 'vitest'
import { stageProgress } from './stageProgress'
import type { CycleStage } from './types'

function stage(partial: Partial<CycleStage> = {}): CycleStage {
  return {
    id: 'employee_goals',
    label: 'Employee Goals setting',
    startDate: '2026-06-01',
    endDate: '2026-08-16',
    ...partial,
  }
}

/** Local time, since progress is judged on the viewer's calendar day. */
function localNoon(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12)
}

describe('stageProgress', () => {
  it('marks a stage upcoming before its start date', () => {
    expect(stageProgress(stage(), localNoon(2026, 5, 31))).toBe('upcoming')
  })

  it('marks a stage active on its start date', () => {
    expect(stageProgress(stage(), localNoon(2026, 6, 1))).toBe('active')
  })

  it('marks a stage active on its end date', () => {
    expect(stageProgress(stage(), localNoon(2026, 8, 16))).toBe('active')
  })

  it('marks a stage done after its end date', () => {
    expect(stageProgress(stage(), localNoon(2026, 8, 17))).toBe('done')
  })

  it('marks a milestone done from its date onward', () => {
    const milestone = stage({ id: 'publish_managers', endDate: undefined })
    expect(stageProgress(milestone, localNoon(2026, 6, 1))).toBe('done')
  })

  it('marks a milestone upcoming before its date', () => {
    const milestone = stage({ id: 'publish_managers', endDate: undefined })
    expect(stageProgress(milestone, localNoon(2026, 5, 20))).toBe('upcoming')
  })

  it('treats a stage without a start date as upcoming', () => {
    expect(stageProgress(stage({ startDate: '' }))).toBe('upcoming')
  })
})
