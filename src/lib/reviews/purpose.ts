import { buildPeriod, findAnnualPeriod, findPeriod } from './periods'
import type { CyclePeriodOption, CyclePurpose, ReviewCycle } from './types'

export const PURPOSE_LABEL: Record<CyclePurpose, string> = {
  quarterly_checkin: 'Quarterly check-in',
  annual_appraisal: 'Annual appraisal',
  custom: 'Custom cycle',
}

export const PURPOSE_HINT: Record<CyclePurpose, string> = {
  quarterly_checkin:
    'Goals plus a manager rating for one quarter. Employees do not self-rate.',
  annual_appraisal:
    'Year-end packet. Pulls Q1–Q3 ratings, rates Q4 inside this review, then calibrates and releases one final grade.',
  custom: 'Your own dates and stages. Nothing is assumed until you turn it on.',
}

export function inferPurpose(
  periodKey?: string,
  fallback: CyclePurpose = 'custom',
): CyclePurpose {
  if (!periodKey) return fallback
  if (/^annual-\d{4}$/i.test(periodKey)) return 'annual_appraisal'
  if (/^q[1-4]-\d{4}$/i.test(periodKey)) return 'quarterly_checkin'
  return fallback
}

export function inferYearKey(
  periodKey?: string,
  startDate?: string,
): string | undefined {
  const fromPeriod = periodKey?.match(/(\d{4})$/)?.[1]
  if (fromPeriod) return fromPeriod
  return startDate?.slice(0, 4)
}

export function defaultSourcePeriodKeys(yearKey: string): string[] {
  return [1, 2, 3, 4].map((quarter) => `q${quarter}-${yearKey}`)
}

export function suggestedSourceLinks(
  yearKey: string,
  cycles: ReviewCycle[],
): ReviewCycle['sourceLinks'] {
  return defaultSourcePeriodKeys(yearKey)
    .map((key) => cycles.find((cycle) => cycle.periodKey === key || cycle.id === key))
    .filter((cycle): cycle is ReviewCycle => Boolean(cycle))
    .map((cycle) => ({
      sourceCycleId: cycle.id,
      weightPercent: 25,
      excluded: false,
      transitionGrade:
        cycle.periodKey === `q1-${yearKey}` ? ('performing' as const) : null,
    }))
}

export function quarterLabelForCycle(cycle: Pick<ReviewCycle, 'periodKey' | 'name'>): string {
  const period = cycle.periodKey ? findPeriod(cycle.periodKey) : undefined
  if (period) return period.label
  const annual = cycle.periodKey ? findAnnualPeriod(cycle.periodKey) : undefined
  return annual?.label ?? cycle.name
}

export function listQuarterPeriodsForYear(year: number): CyclePeriodOption[] {
  return ([1, 2, 3, 4] as const).map((quarter) => buildPeriod(year, quarter))
}
