import { afterEach, describe, expect, it } from 'vitest'
import {
  formatLocalDateRange,
  formatLocalTimestamp,
  localWallToUtcIso,
  setTimeZoneForTests,
  toUtcIso,
  utcIsoToLocalWall,
} from './timezone'

afterEach(() => {
  setTimeZoneForTests(null)
})

describe('timezone conversion', () => {
  it('stores a Bangladesh 9:00 PM deadline as UTC and shows 11:00 PM in Malaysia', () => {
    const utc = localWallToUtcIso('2026-01-15', '21:00', 'Asia/Dhaka')
    expect(utc).toBe('2026-01-15T15:00:00.000Z')
    expect(utcIsoToLocalWall(utc, 'Asia/Kuala_Lumpur')).toEqual({
      date: '2026-01-15',
      time: '23:00',
    })
    expect(formatLocalTimestamp(utc, 'Asia/Kuala_Lumpur')).toBe(
      '15-Jan-2026, 11:00 PM',
    )
    expect(formatLocalTimestamp(utc, 'Asia/Dhaka')).toBe('15-Jan-2026, 9:00 PM')
  })

  it('treats a naive timestamp as UTC when normalizing storage', () => {
    expect(toUtcIso('2026-01-15T15:00')).toBe('2026-01-15T15:00:00.000Z')
    expect(toUtcIso('2026-01-15')).toBe('2026-01-15T00:00:00.000Z')
  })

  it('formats a stored UTC range in the viewer timezone', () => {
    expect(
      formatLocalDateRange(
        '2026-01-15T15:00:00.000Z',
        '2026-01-15T16:00:00.000Z',
        'Asia/Dhaka',
      ),
    ).toBe('15-Jan-2026, 9:00 PM – 15-Jan-2026, 10:00 PM')
  })
})
