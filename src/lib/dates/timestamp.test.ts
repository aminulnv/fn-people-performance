import { describe, expect, it } from 'vitest'
import {
  clockAngleDegrees,
  clockHandDegrees,
  compareDateTime,
  datePart,
  isEndBeforeStart,
  formatInputTimestamp,
  formatTime12,
  formatTimestampSummary,
  hasExplicitTime,
  isNightClock,
  joinWallClock,
  minuteFromClockAngle,
  nearestClockIndex,
  parseDateTime,
  parseTypedHour12,
  parseTypedMinute,
  splitWallClock,
  timePart,
  toSortKey,
  toTimestamp,
} from './timestamp'

describe('timestamp helpers', () => {
  it('parses a date, a timestamp, and a date-time value', () => {
    expect(parseDateTime('2027-09-21')).toEqual({ date: '2027-09-21', time: '00:00' })
    expect(parseDateTime('2027-09-21T10:00')).toEqual({
      date: '2027-09-21',
      time: '10:00',
    })
    expect(parseDateTime({ date: '2027-09-21', time: '14:00' })).toEqual({
      date: '2027-09-21',
      time: '14:00',
    })
  })

  it('builds a timestamp and splits it back into date and time', () => {
    expect(toTimestamp('2027-09-21', '10:00')).toBe('2027-09-21T10:00')
    expect(datePart('2027-09-21T10:00:00.000Z')).toBe('2027-09-21')
    expect(timePart('2027-09-21T10:00')).toBe('10:00')
    expect(hasExplicitTime('2027-09-21')).toBe(false)
    expect(hasExplicitTime('2027-09-21T10:00')).toBe(true)
  })

  it('sorts date-only values before later timestamps on the same day', () => {
    expect(toSortKey('2026-08-15')).toBe('2026-08-15T00:00:00.000Z')
    expect(compareDateTime('2026-08-15', '2026-08-15T09:00')).toBeLessThan(0)
    expect(compareDateTime('2026-08-15T17:00', '2026-08-15')).toBeGreaterThan(0)
  })

  it('treats an earlier end as invalid and allows the same instant', () => {
    expect(isEndBeforeStart('2026-07-21T09:00', '2026-07-20T17:00')).toBe(true)
    expect(isEndBeforeStart('2026-07-21T09:00', '2026-07-21T08:00')).toBe(true)
    expect(isEndBeforeStart('2026-07-21T09:00', '2026-07-21T09:00')).toBe(false)
    expect(isEndBeforeStart('2026-07-21', '')).toBe(false)
  })

  it('formats field and summary labels', () => {
    expect(formatInputTimestamp('2027-09-21')).toBe('21-Sep-2027')
    expect(formatInputTimestamp('2027-09-21T10:00')).toBe('21-Sep-2027, 10:00 AM')
    expect(formatTimestampSummary('2027-09-21T10:00')).toBe('Sep 21, 2027 10:00 AM')
    expect(formatTime12('00:00')).toBe('12:00 AM')
    expect(formatTime12('14:30')).toBe('2:30 PM')
  })

  it('splits and joins a 12-hour clock without shifting the instant', () => {
    expect(splitWallClock('09:00')).toEqual({ hour12: 9, minute: 0, period: 'AM' })
    expect(splitWallClock('00:30')).toEqual({ hour12: 12, minute: 30, period: 'AM' })
    expect(splitWallClock('14:05')).toEqual({ hour12: 2, minute: 5, period: 'PM' })
    expect(joinWallClock({ hour12: 10, minute: 0, period: 'AM' })).toBe('10:00')
    expect(joinWallClock({ hour12: 12, minute: 30, period: 'AM' })).toBe('00:30')
    expect(joinWallClock({ hour12: 2, minute: 5, period: 'PM' })).toBe('14:05')
    expect(parseTypedHour12('9')).toBe(9)
    expect(parseTypedHour12('12')).toBe(12)
    expect(parseTypedHour12('00')).toBeNull()
    expect(parseTypedHour12('13')).toBeNull()
    expect(parseTypedMinute('5')).toBe(5)
    expect(parseTypedMinute('59')).toBe(59)
    expect(parseTypedMinute('60')).toBeNull()
    expect(isNightClock(splitWallClock('05:59'))).toBe(true)
    expect(isNightClock(splitWallClock('06:00'))).toBe(false)
    expect(isNightClock(splitWallClock('12:00'))).toBe(false)
    expect(isNightClock(splitWallClock('17:59'))).toBe(false)
    expect(isNightClock(splitWallClock('18:00'))).toBe(true)
    expect(isNightClock(splitWallClock('00:30'))).toBe(true)
  })

  it('points the clock hand at the selected hour or minute', () => {
    expect(clockHandDegrees('hour', splitWallClock('12:00'))).toBe(0)
    expect(clockHandDegrees('hour', splitWallClock('10:00'))).toBe(300)
    expect(clockHandDegrees('minute', splitWallClock('09:30'))).toBe(180)
    expect(
      nearestClockIndex(50, 0, { left: 0, top: 0, width: 100, height: 100 } as DOMRect),
    ).toBe(0)
    expect(
      nearestClockIndex(100, 50, { left: 0, top: 0, width: 100, height: 100 } as DOMRect),
    ).toBe(3)
    expect(
      clockAngleDegrees(100, 50, { left: 0, top: 0, width: 100, height: 100 } as DOMRect),
    ).toBe(90)
    expect(minuteFromClockAngle(90)).toBe(15)
    expect(minuteFromClockAngle(180)).toBe(30)
  })
})
