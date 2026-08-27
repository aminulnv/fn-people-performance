import { describe, expect, it } from 'vitest'
import {
  attributeFilterCount,
  matchesAttributeFilters,
  toggleAttributeFilter,
  uniqueAttributeValues,
} from './attributeFilters'

describe('attribute filter helpers', () => {
  it('toggles a value on and off', () => {
    const withDept = toggleAttributeFilter({}, 'department', 'Product')
    expect(withDept).toEqual({ department: ['Product'] })
    expect(toggleAttributeFilter(withDept, 'department', 'Product')).toEqual({})
  })

  it('lists unique values and keeps blanks as None', () => {
    expect(
      uniqueAttributeValues(['Product', 'Finance', '', 'Product']).map(
        (option) => option.label,
      ),
    ).toEqual(['Finance', 'Product', 'None'])
  })

  it('matches rows with AND across attributes', () => {
    expect(
      matchesAttributeFilters(
        { department: ['Product'], owner: ['Ada'] },
        { department: 'Product', owner: 'Ada' },
      ),
    ).toBe(true)
    expect(
      matchesAttributeFilters(
        { department: ['Product'] },
        { department: 'Finance', owner: 'Ada' },
      ),
    ).toBe(false)
    expect(attributeFilterCount({ department: ['A', 'B'], owner: ['Ada'] })).toBe(
      3,
    )
    expect(
      matchesAttributeFilters(
        { team: ['Core'] },
        { team: ['Core', 'Platform'] },
      ),
    ).toBe(true)
    expect(
      matchesAttributeFilters({ team: ['Sales'] }, { team: ['Core', 'Platform'] }),
    ).toBe(false)
  })
})
