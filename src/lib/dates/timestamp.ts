const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

export type ParsedDateTime = {
  date: string
  time: string
}

export type DateTimeLike = {
  date: string
  time?: string
}

/** Calendar day `YYYY-MM-DD` from a date or timestamp. */
export function datePart(value: string | null | undefined): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? '').trim())
  return match?.[1] ?? ''
}

export function hasExplicitTime(value: string | null | undefined): boolean {
  return DATETIME_RE.test(String(value ?? '').trim())
}

/** 24h `HH:mm` from a timestamp, or the fallback for date-only values. */
export function timePart(
  value: string | null | undefined,
  fallback = '00:00',
): string {
  const match = DATETIME_RE.exec(String(value ?? '').trim())
  if (!match) return fallback
  return `${match[4]}:${match[5]}`
}

export function parseDateTime(
  value: string | DateTimeLike | null | undefined,
): ParsedDateTime | null {
  if (value && typeof value === 'object') {
    const date = datePart(value.date)
    if (!date) return null
    const time = value.time && /^\d{2}:\d{2}$/.test(value.time)
      ? value.time
      : timePart(value.date, '00:00')
    return { date, time }
  }

  const raw = String(value ?? '').trim()
  if (!raw) return null

  const datetime = DATETIME_RE.exec(raw)
  if (datetime) {
    return { date: `${datetime[1]}-${datetime[2]}-${datetime[3]}`, time: `${datetime[4]}:${datetime[5]}` }
  }

  const date = DATE_RE.exec(raw)
  if (date) return { date: raw, time: '00:00' }

  return null
}

export function toTimestamp(
  dateOrValue: string | DateTimeLike | null | undefined,
  time?: string,
): string {
  if (dateOrValue && typeof dateOrValue === 'object') {
    const parsed = parseDateTime(dateOrValue)
    return parsed ? `${parsed.date}T${time ?? parsed.time}` : ''
  }

  const parsed = parseDateTime(dateOrValue)
  if (!parsed) return ''
  return `${parsed.date}T${time ?? parsed.time}`
}

/** UTC compare key so naive and `Z` timestamps sort as the same instant. */
export function toSortKey(value: string | DateTimeLike | null | undefined): string {
  const parsed = parseDateTime(value)
  return parsed ? `${parsed.date}T${parsed.time}:00.000Z` : ''
}

export function compareDateTime(
  left: string | DateTimeLike | null | undefined,
  right: string | DateTimeLike | null | undefined,
): number {
  return toSortKey(left).localeCompare(toSortKey(right))
}

/** True when both sides are set and the end is earlier than the start. */
export function isEndBeforeStart(
  start: string | DateTimeLike | null | undefined,
  end: string | DateTimeLike | null | undefined,
): boolean {
  if (!toSortKey(start) || !toSortKey(end)) return false
  return compareDateTime(start, end) > 0
}

export function formatTime12(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return time
  const hour24 = Number(match[1])
  const minutes = match[2]
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${minutes} ${suffix}`
}

function isDateOnlyValue(value: string | DateTimeLike): boolean {
  if (typeof value === 'string') return DATE_RE.test(value.trim())
  return !value.time && !hasExplicitTime(value.date)
}

/** Field display: `21-Sep-2027, 10:00 AM`. Date-only values omit the time. */
export function formatInputTimestamp(value: string | DateTimeLike | null | undefined): string {
  const parsed = parseDateTime(value)
  if (!parsed || !value) return ''
  const [, year, month, day] = DATE_RE.exec(parsed.date) ?? []
  const monthName = MONTHS[Number(month) - 1]
  if (!year || !day || !monthName) return ''
  const dateLabel = `${day}-${monthName}-${year}`
  if (isDateOnlyValue(value)) return dateLabel
  return `${dateLabel}, ${formatTime12(parsed.time)}`
}

/** Picker summary: `Sep 21, 2027 10:00 AM`. */
export function formatTimestampSummary(value: string | DateTimeLike | null | undefined): string {
  const parsed = parseDateTime(value)
  if (!parsed) return ''
  const [, year, month, day] = DATE_RE.exec(parsed.date) ?? []
  const monthName = MONTHS[Number(month) - 1]
  if (!year || !day || !monthName) return ''
  return `${monthName} ${Number(day)}, ${year} ${formatTime12(parsed.time)}`
}

export function listTimeSlots(stepMinutes = 30): string[] {
  const slots: string[] = []
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0')
    const minute = String(minutes % 60).padStart(2, '0')
    slots.push(`${hour}:${minute}`)
  }
  return slots
}

export type ClockPeriod = 'AM' | 'PM'

export type WallClock = {
  hour12: number
  minute: number
  period: ClockPeriod
}

export const CLOCK_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const
export const CLOCK_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const

export function splitWallClock(time: string): WallClock {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  const hour24 = match ? Number(match[1]) : 9
  const minute = match ? Number(match[2]) : 0
  return {
    hour12: hour24 % 12 || 12,
    minute,
    period: hour24 >= 12 ? 'PM' : 'AM',
  }
}

/** Night is 6:00 PM through 5:59 AM. */
export function isNightClock(parts: WallClock): boolean {
  const hour24 = (parts.hour12 % 12) + (parts.period === 'PM' ? 12 : 0)
  return hour24 < 6 || hour24 >= 18
}

export function joinWallClock(parts: WallClock): string {
  const hour24 = (parts.hour12 % 12) + (parts.period === 'PM' ? 12 : 0)
  return `${String(hour24).padStart(2, '0')}:${String(Math.min(59, Math.max(0, parts.minute))).padStart(2, '0')}`
}

/** `1`–`12` from a typed hour. Empty or out-of-range values are `null`. */
export function parseTypedHour12(raw: string): number | null {
  if (!/^\d{1,2}$/.test(raw)) return null
  const hour = Number(raw)
  if (hour < 1 || hour > 12) return null
  return hour
}

/** `0`–`59` from a typed minute. Empty or out-of-range values are `null`. */
export function parseTypedMinute(raw: string): number | null {
  if (!/^\d{1,2}$/.test(raw)) return null
  const minute = Number(raw)
  if (minute < 0 || minute > 59) return null
  return minute
}

export function clockHandDegrees(mode: 'hour' | 'minute', parts: WallClock): number {
  if (mode === 'hour') return (parts.hour12 % 12) * 30
  return parts.minute * 6
}

/** 0° is 12 o'clock; values increase clockwise. */
export function clockAngleDegrees(clientX: number, clientY: number, rect: DOMRect): number {
  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90
  if (deg < 0) deg += 360
  return deg
}

/** 12 o'clock is index 0; each tick is 30 degrees clockwise. */
export function nearestClockIndex(clientX: number, clientY: number, rect: DOMRect): number {
  return Math.round(clockAngleDegrees(clientX, clientY, rect) / 30) % 12
}

export function minuteFromClockAngle(degrees: number): number {
  return Math.round(degrees / 6) % 60
}

export function addUtcDays(isoDate: string, days: number): string {
  const date = datePart(isoDate)
  if (!date) return ''
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}
