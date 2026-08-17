import { dayValue } from './periods'
import type { ReviewCycle } from './types'

export type CycleCalendarMarkerKind =
  | 'cycle'
  | 'goal-setting'
  | 'goal-extension'
  | 'performance-review'
  | 'calibration'
  | 'publish-managers'
  | 'publish-employees'

export type CycleCalendarRange = {
  kind: CycleCalendarMarkerKind
  label: string
  startDate: string
  endDate: string
}

export type CycleCalendarMilestone = {
  kind: CycleCalendarMarkerKind
  label: string
  date: string
}

export type CycleCalendarMarkers = {
  ranges: CycleCalendarRange[]
  milestones: CycleCalendarMilestone[]
  bounds: { startDate: string; endDate: string }
}

export type CycleCalendarMonth = {
  year: number
  /** 1–12 */
  month: number
  key: string
}

export type CycleCalendarDayMarkers = {
  ranges: CycleCalendarRange[]
  milestones: CycleCalendarMilestone[]
}

const RANGE_PRIORITY: Record<CycleCalendarMarkerKind, number> = {
  cycle: 0,
  'goal-setting': 1,
  'performance-review': 2,
  calibration: 3,
  'goal-extension': 4,
  'publish-managers': 5,
  'publish-employees': 6,
}

export function isDateInCycle(
  isoDate: string,
  bounds: { startDate: string; endDate: string },
): boolean {
  const value = dayValue(isoDate)
  return value >= dayValue(bounds.startDate) && value <= dayValue(bounds.endDate)
}

function clipRangeToCycle(
  range: CycleCalendarRange,
  startDate: string,
  endDate: string,
): CycleCalendarRange | null {
  const start = Math.max(dayValue(range.startDate), dayValue(startDate))
  const end = Math.min(dayValue(range.endDate), dayValue(endDate))
  if (start > end) return null

  return {
    ...range,
    startDate: isoFromDayValue(start),
    endDate: isoFromDayValue(end),
  }
}

export function extractCycleCalendarMarkers(
  cycle: ReviewCycle,
): CycleCalendarMarkers {
  const { stagesConfig } = cycle
  const bounds = { startDate: cycle.startDate, endDate: cycle.endDate }

  const rawRanges: CycleCalendarRange[] = [
    {
      kind: 'cycle',
      label: 'Cycle timeframe',
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    },
    {
      kind: 'goal-setting',
      label: 'Goal setting',
      startDate: stagesConfig.goals.employee.startDate,
      endDate: stagesConfig.goals.employee.endDate,
    },
    {
      kind: 'performance-review',
      label: 'Performance review',
      startDate: stagesConfig.performance.managerStart.date,
      endDate: stagesConfig.performance.managerEnd.date,
    },
  ]

  if (stagesConfig.calibration.enabled) {
    rawRanges.push({
      kind: 'calibration',
      label: 'Calibration',
      startDate: stagesConfig.calibration.start.date,
      endDate: stagesConfig.calibration.end.date,
    })
  }

  const ranges = rawRanges
    .map((range) =>
      range.kind === 'cycle'
        ? range
        : clipRangeToCycle(range, bounds.startDate, bounds.endDate),
    )
    .filter((range): range is CycleCalendarRange => range !== null)

  const milestones: CycleCalendarMilestone[] = [
    {
      kind: 'publish-managers' as const,
      label: 'Publish to managers',
      date: stagesConfig.publish.toManager.date,
    },
    {
      kind: 'publish-employees' as const,
      label: 'Publish to employees',
      date: stagesConfig.publish.toAll.date,
    },
    ...(stagesConfig.goals.extensions ?? []).map((extension) => ({
      kind: 'goal-extension' as const,
      label: 'Goal deadline extension',
      date: extension.endDate,
    })),
  ].filter((milestone) => isDateInCycle(milestone.date, bounds))

  return { ranges, milestones, bounds }
}

export function listCycleCalendarMonths(
  startDate: string,
  endDate: string,
): CycleCalendarMonth[] {
  const [startYear, startMonth] = startDate.split('-').map(Number)
  const [endYear, endMonth] = endDate.split('-').map(Number)
  if (!startYear || !startMonth || !endYear || !endMonth) return []

  const months: CycleCalendarMonth[] = []
  let year = startYear
  let month = startMonth

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({
      year,
      month,
      key: `${year}-${String(month).padStart(2, '0')}`,
    })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return months
}

export function initialCalendarMonthIndex(
  months: CycleCalendarMonth[],
  bounds: { startDate: string; endDate: string },
  today = new Date(),
): number {
  if (months.length === 0) return 0

  const todayIso = isoFromDayValue(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  )

  if (!isDateInCycle(todayIso, bounds)) return 0

  const index = months.findIndex(
    (month) =>
      month.year === today.getFullYear() &&
      month.month === today.getMonth() + 1,
  )

  return index >= 0 ? index : 0
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function isoFromDayValue(value: number): string {
  const date = new Date(value)
  return toIsoDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  )
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(year: number, month: number, day: number): number {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return (weekday + 6) % 7
}

export function markersForDay(
  isoDate: string,
  markers: CycleCalendarMarkers,
): CycleCalendarDayMarkers {
  if (!isDateInCycle(isoDate, markers.bounds)) {
    return { ranges: [], milestones: [] }
  }

  const value = dayValue(isoDate)
  const ranges = markers.ranges
    .filter(
      (range) =>
        value >= dayValue(range.startDate) && value <= dayValue(range.endDate),
    )
    .sort(
      (a, b) => RANGE_PRIORITY[a.kind] - RANGE_PRIORITY[b.kind],
    )
  const milestones = markers.milestones.filter(
    (milestone) => milestone.date === isoDate,
  )

  return { ranges, milestones }
}

/** Strongest marker kind used to colour a day cell when several overlap. */
export function primaryCalendarFillKind(
  dayMarkers: CycleCalendarDayMarkers,
): CycleCalendarMarkerKind | null {
  if (dayMarkers.milestones.length > 0) {
    return [...dayMarkers.milestones].sort(
      (a, b) => RANGE_PRIORITY[b.kind] - RANGE_PRIORITY[a.kind],
    )[0].kind
  }

  const ranges = dayMarkers.ranges.filter((range) => range.kind !== 'cycle')
  if (ranges.length > 0) {
    return [...ranges].sort(
      (a, b) => RANGE_PRIORITY[b.kind] - RANGE_PRIORITY[a.kind],
    )[0].kind
  }

  return null
}

export function legendItems(
  markers: CycleCalendarMarkers,
): Array<{ kind: CycleCalendarMarkerKind; label: string }> {
  const items = new Map<CycleCalendarMarkerKind, string>()

  for (const range of markers.ranges) {
    if (range.kind === 'cycle') continue
    items.set(range.kind, range.label)
  }
  for (const milestone of markers.milestones) {
    if (!items.has(milestone.kind)) {
      items.set(milestone.kind, milestone.label)
    }
  }

  return [...items.entries()]
    .sort(([a], [b]) => RANGE_PRIORITY[a] - RANGE_PRIORITY[b])
    .map(([kind, label]) => ({ kind, label }))
}
