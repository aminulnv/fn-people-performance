import { describe, expect, it } from 'vitest'
import { delegatingFromActivityMetadata } from './DelegatingOnBehalfTip'

describe('delegatingFromActivityMetadata', () => {
  it('reads the absent manager from activity metadata', () => {
    expect(
      delegatingFromActivityMetadata({
        delegatingForName: 'Ada Manager',
        delegatingForAvatarUrl: 'https://example.com/ada.png',
      }),
    ).toEqual({
      name: 'Ada Manager',
      avatarUrl: 'https://example.com/ada.png',
    })
  })

  it('still reads historical covering metadata', () => {
    expect(
      delegatingFromActivityMetadata({
        coveringForName: 'Ada Manager',
        coveringForAvatarUrl: 'https://example.com/ada.png',
      }),
    ).toEqual({
      name: 'Ada Manager',
      avatarUrl: 'https://example.com/ada.png',
    })
  })

  it('returns null when the actor was not delegating', () => {
    expect(delegatingFromActivityMetadata({})).toBeNull()
    expect(delegatingFromActivityMetadata(undefined)).toBeNull()
  })
})
