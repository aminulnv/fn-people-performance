import { describe, expect, it } from 'vitest'
import { blankGoal } from './measurements'
import {
  goalPriorityLabel,
  goalTypeLabel,
  normalizeGoal,
  processTypeLabel,
} from './classification'

describe('goal classification', () => {
  it('labels the spec values', () => {
    expect(goalTypeLabel('outcome')).toBe('Outcome')
    expect(goalTypeLabel('output')).toBe('Output')
    expect(processTypeLabel('okr')).toBe('OKR')
    expect(processTypeLabel('bau')).toBe('BAU')
    expect(processTypeLabel('pi')).toBe('PI')
    expect(goalPriorityLabel('high')).toBe('High')
    expect(goalPriorityLabel('medium')).toBe('Medium')
    expect(goalPriorityLabel('low')).toBe('Low')
  })

  it('fills missing classification on stored goals', () => {
    const stored = {
      ...blankGoal(),
      goalType: undefined,
      processType: undefined,
      priority: undefined,
    } as ReturnType<typeof blankGoal>

    expect(normalizeGoal(stored)).toMatchObject({
      goalType: 'outcome',
      processType: 'bau',
      priority: 'medium',
    })
  })
})
