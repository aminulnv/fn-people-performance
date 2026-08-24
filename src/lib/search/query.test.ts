import { describe, expect, it } from 'vitest'
import { parseSearchQuery, resolveSearchScope } from './query'

describe('parseSearchQuery', () => {
  it('reads an @people prefix', () => {
    expect(parseSearchQuery('@Ada Lovelace')).toEqual({
      scope: 'people',
      text: 'Ada Lovelace',
    })
  })

  it('reads a goal prefix', () => {
    expect(parseSearchQuery('g: reduce churn')).toEqual({
      scope: 'goals',
      text: 'reduce churn',
    })
  })

  it('reads an action prefix', () => {
    expect(parseSearchQuery('> create')).toEqual({
      scope: 'actions',
      text: 'create',
    })
  })

  it('leaves unprefixed text in the all scope', () => {
    expect(parseSearchQuery('reviews')).toEqual({
      scope: 'all',
      text: 'reviews',
    })
  })
})

describe('resolveSearchScope', () => {
  it('lets a typed prefix override the chip', () => {
    expect(
      resolveSearchScope({ scope: 'people', text: 'ada' }, 'goals'),
    ).toBe('people')
  })

  it('keeps the chip when the query has no prefix', () => {
    expect(
      resolveSearchScope({ scope: 'all', text: 'ada' }, 'people'),
    ).toBe('people')
  })
})
