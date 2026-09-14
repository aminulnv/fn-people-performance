import { describe, expect, it } from 'vitest'
import { usableAvatarUrl } from './avatar'

describe('usableAvatarUrl', () => {
  it('returns empty for blank values', () => {
    expect(usableAvatarUrl(undefined)).toBe('')
    expect(usableAvatarUrl(null)).toBe('')
    expect(usableAvatarUrl('  ')).toBe('')
  })

  it('keeps ClickUp profile picture attachments', () => {
    expect(
      usableAvatarUrl(
        'https://attachments.clickup.com/profilePictures/708582_TyZ.jpg',
      ),
    ).toBe('https://attachments.clickup.com/profilePictures/708582_TyZ.jpg')
  })

  it('keeps other avatar URLs', () => {
    expect(usableAvatarUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    )
    expect(usableAvatarUrl('/aminul.png')).toBe('/aminul.png')
  })
})
