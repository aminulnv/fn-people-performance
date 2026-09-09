import { describe, expect, it } from 'vitest'
import {
  hashForProfileGoalsManagerTab,
  hashForProfileTab,
  profileGoalsManagerTabFromHash,
  profileTabFromHash,
} from '@/lib/profile/tabHashes'

describe('profileTabFromHash', () => {
  it('maps profile section hashes to tabs', () => {
    expect(profileTabFromHash('#profile')).toBe('profile')
    expect(profileTabFromHash('#performance')).toBe('performance')
    expect(profileTabFromHash('#team')).toBe('team')
    expect(profileTabFromHash('#my-goals')).toBe('goals')
    expect(profileTabFromHash('#my-reports')).toBe('goals')
  })

  it('returns null for unknown hashes', () => {
    expect(profileTabFromHash('#everyone')).toBeNull()
  })
})

describe('hashForProfileTab', () => {
  it('maps tabs to profile section hashes', () => {
    expect(hashForProfileTab('profile')).toBe('profile')
    expect(hashForProfileTab('performance')).toBe('performance')
    expect(hashForProfileTab('team')).toBe('team')
    expect(hashForProfileTab('goals')).toBe('my-goals')
  })
})

describe('profileGoalsManagerTabFromHash', () => {
  it('maps My Goals and My Reports hashes', () => {
    expect(profileGoalsManagerTabFromHash('#my-goals')).toBe('mine')
    expect(profileGoalsManagerTabFromHash('#my-reports')).toBe('team')
    expect(profileGoalsManagerTabFromHash('#profile')).toBe('mine')
  })
})

describe('hashForProfileGoalsManagerTab', () => {
  it('maps manager tabs to profile goals hashes', () => {
    expect(hashForProfileGoalsManagerTab('mine')).toBe('my-goals')
    expect(hashForProfileGoalsManagerTab('team')).toBe('my-reports')
  })
})
