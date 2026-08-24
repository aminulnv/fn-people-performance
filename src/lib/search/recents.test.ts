import { afterEach, describe, expect, it } from 'vitest'
import {
  clearRecentSearches,
  readRecentSearchIds,
  rememberSearchVisit,
  SEARCH_RECENTS_KEY,
} from './recents'

afterEach(() => {
  localStorage.removeItem(SEARCH_RECENTS_KEY)
})

describe('rememberSearchVisit', () => {
  it('stores the newest visit first and drops older ones past the cap', () => {
    for (let index = 0; index < 10; index += 1) {
      rememberSearchVisit(
        { id: `item:${index}` },
        new Date(`2026-01-01T00:00:0${index % 10}Z`),
      )
    }

    const ids = readRecentSearchIds()
    expect(ids[0]).toBe('item:9')
    expect(ids).toHaveLength(8)
    expect(ids).not.toContain('item:0')
    expect(ids).not.toContain('item:1')
  })

  it('moves a repeat visit to the front', () => {
    rememberSearchVisit({ id: 'a' })
    rememberSearchVisit({ id: 'b' })
    rememberSearchVisit({ id: 'a' })
    expect(readRecentSearchIds()).toEqual(['a', 'b'])
  })
})

describe('clearRecentSearches', () => {
  it('empties stored visits', () => {
    rememberSearchVisit({ id: 'a' })
    clearRecentSearches()
    expect(readRecentSearchIds()).toEqual([])
  })
})
