import {
  readZoneClock,
  wallClockToInstant,
} from './concurrentTimes'
import { datePart, parseDateTime, timePart } from './timestamp'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
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

let timeZoneOverride: string | null = null

export function setTimeZoneForTests(timeZone: string | null) {
  timeZoneOverride = timeZone
}

export function browserTimeZone(): string {
  return (
    timeZoneOverride ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    'UTC'
  )
}

export function isUtcIso(value: string | null | undefined): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(String(value ?? '').trim())
}

/** Treat naive dates as midnight UTC and naive times as UTC wall-clock. */
export function toUtcIso(
  value: string | { date: string; time?: string } | null | undefined,
): string {
  if (value && typeof value === 'object') {
    const date = datePart(value.date)
    const time = value.time && /^\d{2}:\d{2}$/.test(value.time)
      ? value.time
      : timePart(value.date, '00:00')
    return date ? `${date}T${time}:00.000Z` : ''
  }

  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (isUtcIso(raw)) {
    const instant = new Date(raw)
    return Number.isNaN(instant.getTime()) ? '' : instant.toISOString()
  }
  if (DATE_RE.test(raw)) return `${raw}T00:00:00.000Z`
  const parsed = parseDateTime(raw)
  return parsed ? `${parsed.date}T${parsed.time}:00.000Z` : ''
}

export function localWallToUtcIso(
  date: string,
  time: string,
  timeZone = browserTimeZone(),
): string {
  const instant = wallClockToInstant(date, time, timeZone)
  return instant ? instant.toISOString() : ''
}

export function utcIsoToLocalWall(
  value: string | null | undefined,
  timeZone = browserTimeZone(),
): { date: string; time: string } | null {
  const iso = toUtcIso(value)
  if (!iso) return null
  const instant = new Date(iso)
  if (Number.isNaN(instant.getTime())) return null
  const clock = readZoneClock(instant, timeZone)
  if (!clock.year || !clock.month || !clock.day) return null
  return {
    date: `${clock.year}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')}`,
    time: `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}`,
  }
}

export function formatLocalTimestamp(
  value: string | { date: string; time?: string } | null | undefined,
  timeZone = browserTimeZone(),
): string {
  const wall = utcIsoToLocalWall(
    typeof value === 'string' || !value ? value : toUtcIso(value),
    timeZone,
  )
  if (!wall) return ''
  const [, year, month, day] = DATE_RE.exec(wall.date) ?? []
  const monthName = MONTHS[Number(month) - 1]
  if (!year || !day || !monthName) return ''
  const hour24 = Number(wall.time.slice(0, 2))
  const minutes = wall.time.slice(3, 5)
  const hour12 = hour24 % 12 || 12
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  return `${day}-${monthName}-${year}, ${hour12}:${minutes} ${suffix}`
}

export function formatLocalDateRange(
  start: string | { date: string; time?: string } | null | undefined,
  end?: string | { date: string; time?: string } | null,
  timeZone = browserTimeZone(),
): string {
  const left = formatLocalTimestamp(start, timeZone)
  if (!end) return left
  const right = formatLocalTimestamp(end, timeZone)
  if (!right || toUtcIso(start) === toUtcIso(end)) return left
  return `${left} – ${right}`
}
