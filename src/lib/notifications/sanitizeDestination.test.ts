import { describe, expect, it } from 'vitest'
import { sanitizeNotificationDestination } from './sanitizeDestination'

describe('sanitizeNotificationDestination', () => {
  it('keeps in-app paths', () => {
    expect(sanitizeNotificationDestination('/goals/q3/1')).toBe('/goals/q3/1')
  })

  it('rejects unsafe destinations', () => {
    expect(sanitizeNotificationDestination('//evil.example')).toBeUndefined()
    expect(sanitizeNotificationDestination('javascript:alert(1)')).toBeUndefined()
    expect(sanitizeNotificationDestination('http://insecure.test')).toBeUndefined()
  })

  it('keeps https without credentials', () => {
    expect(
      sanitizeNotificationDestination('https://performance.nextventures.io/x'),
    ).toBe('https://performance.nextventures.io/x')
    expect(
      sanitizeNotificationDestination('https://user:pass@evil.example/x'),
    ).toBeUndefined()
  })
})
