import { datePart } from '@/lib/dates/timestamp'
import type { CyclePeriodOption } from './types'

const QUARTER_MONTHS = [
  { q: 1, startMonth: 0, endMonth: 2, endDay: 31 },
  { q: 2, startMonth: 3, endMonth: 5, endDay: 30 },
  { q: 3, startMonth: 6, endMonth: 8, endDay: 30 },
  { q: 4, startMonth: 9, endMonth: 11, endDay: 31 },
] as const

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toIso(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

export function periodKey(year: number, quarter: number): string {
  return `q${quarter}-${year}`
}

export function annualPeriodKey(year: number): string {
  return `annual-${year}`
}

export function findAnnualPeriod(key: string): CyclePeriodOption | undefined {
  const match = /^annual-(\d{4})$/i.exec(key.trim())
  if (!match) return undefined
  const year = Number(match[1])
  return {
    key: annualPeriodKey(year),
    label: `Annual ${year}`,
    startDate: `${year + 1}-01-01`,
    endDate: `${year + 1}-02-15`,
  }
}

export function listAnnualPeriods(referenceDate = new Date()): CyclePeriodOption[] {
  const year = referenceDate.getFullYear()
  return [year, year + 1, year - 1]
    .map((value) => findAnnualPeriod(annualPeriodKey(value)))
    .filter((period): period is CyclePeriodOption => Boolean(period))
}

/** Nearby years for the cycle details picker, plus any year already in use. */
export function listPerformanceYears(
  extras: Array<string | undefined> = [],
  referenceDate = new Date(),
): string[] {
  const year = referenceDate.getFullYear()
  const years = new Set<number>()
  for (let value = year - 2; value <= year + 2; value += 1) {
    years.add(value)
  }
  for (const extra of extras) {
    const parsed = Number(extra)
    if (Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100) {
      years.add(parsed)
    }
  }
  return [...years].sort((left, right) => right - left).map(String)
}

export function buildPeriod(
  year: number,
  quarter: 1 | 2 | 3 | 4,
): CyclePeriodOption {
  const meta = QUARTER_MONTHS[quarter - 1]
  return {
    key: periodKey(year, quarter),
    label: `Q${quarter} ${year}`,
    startDate: toIso(year, meta.startMonth, 1),
    endDate: toIso(year, meta.endMonth, meta.endDay),
  }
}

/** Upcoming + recent quarters for the add-cycle picker. */
export function listSelectablePeriods(
  referenceDate = new Date(),
): CyclePeriodOption[] {
  const year = referenceDate.getFullYear()
  const options: CyclePeriodOption[] = []
  for (let y = year - 1; y <= year + 2; y += 1) {
    for (const q of [1, 2, 3, 4] as const) {
      options.push(buildPeriod(y, q))
    }
  }
  return options
}

export function findPeriod(key: string): CyclePeriodOption | undefined {
  const annual = findAnnualPeriod(key)
  if (annual) return annual
  const match = /^q([1-4])-(\d{4})$/i.exec(key.trim())
  if (!match) return undefined
  const quarter = Number(match[1]) as 1 | 2 | 3 | 4
  const year = Number(match[2])
  return buildPeriod(year, quarter)
}

/** Quarter periods only — used by the quarterly create picker. */
export function listQuarterPeriods(referenceDate = new Date()): CyclePeriodOption[] {
  return listSelectablePeriods(referenceDate).filter((period) =>
    /^q[1-4]-/i.test(period.key),
  )
}

export function listCreatePeriods(referenceDate = new Date()): CyclePeriodOption[] {
  return [...listAnnualPeriods(referenceDate), ...listSelectablePeriods(referenceDate)]
}

/** Calendar-day key for date-only values, so timezones cannot shift a stage. */
export function dayValue(iso: string): number {
  const [year, month, day] = datePart(iso).split('-').map(Number)
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1)
}

export function todayDayValue(today: Date): number {
  return Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
}

export function formatDateRange(startDate: string, endDate?: string): string {
  const start = formatShortDate(startDate)
  if (!endDate || endDate === startDate) return start
  const end = formatShortDate(endDate)
  const sameYear = datePart(startDate).slice(0, 4) === datePart(endDate).slice(0, 4)
  if (sameYear) {
    const startNoYear = formatShortDate(startDate, { omitYear: true })
    return `${startNoYear} - ${end}`
  }
  return `${start} - ${end}`
}

export function formatShortDate(
  iso: string,
  opts?: { omitYear?: boolean },
): string {
  const [y, m, d] = datePart(iso).split('-').map(Number)
  if (!y || !m || !d) return iso
  const months = [
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
  ]
  const day = String(d)
  const month = months[m - 1] ?? String(m)
  if (opts?.omitYear) return `${day} ${month}`
  return `${day} ${month} ${y}`
}
