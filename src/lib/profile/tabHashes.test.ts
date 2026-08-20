import { describe, expect, it } from 'vitest'
import {
  hashForProfileTab,
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
