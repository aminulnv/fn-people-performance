import { describe, expect, it } from 'vitest'
import {
  hashForPeopleScope,
  peopleScopeFromHash,
} from '@/pages/people/directoryHashes'

describe('peopleScopeFromHash', () => {
  it('maps directory scope hashes', () => {
    expect(peopleScopeFromHash('#everyone')).toBe('all')
    expect(peopleScopeFromHash('#my-reports')).toBe('reports')
    expect(peopleScopeFromHash('#my-department')).toBe('department')
  })
})

describe('hashForPeopleScope', () => {
  it('maps directory scopes to hashes', () => {
    expect(hashForPeopleScope('all')).toBe('everyone')
    expect(hashForPeopleScope('reports')).toBe('my-reports')
    expect(hashForPeopleScope('department')).toBe('my-department')
  })
})
