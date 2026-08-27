export type ConcurrentPlace = {
  id: string
  name: string
  timeZone: string
  flag: string
}

export type ConcurrentTime = ConcurrentPlace & {
  timeLabel: string
  dateLabel: string
  crossesDay: boolean
}

export const CONCURRENT_PLACES: ConcurrentPlace[] = [
  { id: 'bangladesh', name: 'Bangladesh', timeZone: 'Asia/Dhaka', flag: '🇧🇩' },
  { id: 'malaysia', name: 'Malaysia', timeZone: 'Asia/Kuala_Lumpur', flag: '🇲🇾' },
  { id: 'sri-lanka', name: 'Sri Lanka', timeZone: 'Asia/Colombo', flag: '🇱🇰' },
  { id: 'dubai', name: 'Dubai', timeZone: 'Asia/Dubai', flag: '🇦🇪' },
]

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

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? ''
}

export function readZoneClock(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  return {
    year: Number(partValue(parts, 'year')),
    month: Number(partValue(parts, 'month')),
    day: Number(partValue(parts, 'day')),
    hour: Number(partValue(parts, 'hour')),
    minute: Number(partValue(parts, 'minute')),
  }
}

/** Interpret a wall-clock date/time as that clock in `timeZone`. */
export function wallClockToInstant(
  date: string,
  time: string,
  timeZone: string,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) return null
  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  const wanted = Date.UTC(year, month - 1, day, hour, minute, 0)
  const guessed = new Date(wanted)
  const seen = readZoneClock(guessed, timeZone)
  const actual = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0)
  return new Date(guessed.getTime() + (wanted - actual))
}

function formatClock(instant: Date, timeZone: string): { timeLabel: string; dateLabel: string } {
  const clock = readZoneClock(instant, timeZone)
  if (!clock.year || !clock.month || !clock.day) {
    return { timeLabel: '', dateLabel: '' }
  }
  const hour12 = clock.hour % 12 || 12
  const suffix = clock.hour >= 12 ? 'PM' : 'AM'
  const minutes = String(clock.minute).padStart(2, '0')
  const monthName = MONTHS[clock.month - 1]
  return {
    timeLabel: `${hour12}:${minutes} ${suffix}`,
    dateLabel: `${clock.day} ${monthName}`,
  }
}

export function listConcurrentTimes(
  date: string,
  time: string,
  sourceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): ConcurrentTime[] {
  const instant = wallClockToInstant(date, time, sourceTimeZone)
  if (!instant) return []
  const sourceDate = readZoneClock(instant, sourceTimeZone)
  const sourceKey = `${sourceDate.year}-${sourceDate.month}-${sourceDate.day}`

  return CONCURRENT_PLACES.map((place) => {
    const clock = formatClock(instant, place.timeZone)
    const zone = readZoneClock(instant, place.timeZone)
    const zoneKey = `${zone.year}-${zone.month}-${zone.day}`
    return {
      ...place,
      timeLabel: clock.timeLabel,
      dateLabel: clock.dateLabel,
      crossesDay: zoneKey !== sourceKey,
    }
  })
}
