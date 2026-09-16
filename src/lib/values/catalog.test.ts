import { describe, expect, it } from 'vitest'
import { CORE_VALUES, coreValueById } from './catalog'

describe('core values catalog', () => {
  it('has seven enabled cultural values with one behaviour each', () => {
    expect(CORE_VALUES).toHaveLength(7)
    expect(CORE_VALUES.every((value) => value.status === 'enabled')).toBe(true)
    expect(CORE_VALUES.every((value) => value.behaviours.length === 1)).toBe(true)
    expect(CORE_VALUES.map((value) => value.name)).toEqual([
      'Move Fast, Chase Excellence',
      'Take Ownership, Deliver Outcomes',
      'Invent & Simplify',
      'The Dream Team',
      'Have Honesty & Integrity',
      'Debate Openly, Commit Fully',
      'Product First',
    ])
  })

  it('looks up a value by id', () => {
    expect(coreValueById('product-first')?.name).toBe('Product First')
    expect(coreValueById('missing')).toBeUndefined()
  })
})
