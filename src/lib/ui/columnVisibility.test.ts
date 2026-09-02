import { afterEach, describe, expect, it } from 'vitest'
import {
  readVisibleColumnIds,
  writeVisibleColumnIds,
} from './columnVisibility'

const KEY = 'test-visible-columns'

afterEach(() => {
  window.localStorage.removeItem(KEY)
})

describe('columnVisibility storage', () => {
  it('defaults to every column when nothing is stored', () => {
    expect(readVisibleColumnIds(KEY, ['a', 'b', 'c'], ['a'])).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('uses an explicit default set when nothing is stored', () => {
    expect(
      readVisibleColumnIds(KEY, ['a', 'b', 'c'], ['a'], ['a', 'c']),
    ).toEqual(['a', 'c'])
  })

  it('keeps required columns and drops unknown ids', () => {
    writeVisibleColumnIds(KEY, ['b', 'ghost'])
    expect(readVisibleColumnIds(KEY, ['a', 'b', 'c'], ['a'])).toEqual([
      'a',
      'b',
    ])
  })

  it('preserves column order from the catalog', () => {
    writeVisibleColumnIds(KEY, ['c', 'a', 'b'])
    expect(readVisibleColumnIds(KEY, ['a', 'b', 'c'], ['a'])).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})
