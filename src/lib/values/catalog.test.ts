import { describe, expect, it } from 'vitest'
import { CORE_VALUES, coreValueById, withCatalogBehaviours } from './catalog'

describe('core values catalog', () => {
  it('has seven enabled cultural values with one behaviour each', () => {
    expect(CORE_VALUES).toHaveLength(7)
    expect(CORE_VALUES.every((value) => value.status === 'enabled')).toBe(true)
    expect(CORE_VALUES.every((value) => value.behaviours.length === 1)).toBe(true)
    expect(
      CORE_VALUES.every((value) =>
        ['unsatisfactory', 'developing', 'performing', 'exceeding', 'exceptional'].every(
          (band) => (value.behaviours[0]?.bands[band as 'performing']?.length ?? 0) > 0,
        ),
      ),
    ).toBe(true)
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

  it('fills empty behaviours from the catalog', () => {
    const empty = {
      id: 'move-fast',
      name: 'Move Fast, Chase Excellence',
      description: 'Short',
      status: 'enabled' as const,
      playbookUrl: null,
      behaviours: [],
    }
    const filled = withCatalogBehaviours(empty)
    expect(filled.behaviours[0]?.bands.performing.length).toBeGreaterThan(0)
  })
})
