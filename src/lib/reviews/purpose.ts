import { buildPeriod, findAnnualPeriod, findPeriod } from './periods'
import type { CyclePeriodOption, CyclePurpose, ReviewCycle } from './types'

export const PURPOSE_LABEL: Record<CyclePurpose, string> = {
  quarterly_checkin: 'Quarterly check-in',
  annual_appraisal: 'Annual appraisal',
  custom: 'Custom cycle',
}

export const PURPOSE_SHORT: Record<CyclePurpose, string> = {
  quarterly_checkin: 'Goals, a manager rating, or both.',
  annual_appraisal: 'Year-end packet from the cycles you pick.',
  custom: 'Your own dates and modules.',
}

export const PURPOSE_HINT: Record<CyclePurpose, string> = {
  quarterly_checkin:
    'Starts with goals and a manager rating. Q4 starts with goals only. Kind is a preset — you can change the modules.',
  annual_appraisal:
    'Starts as review only. You choose which cycles roll into the year-end packet. Goal setting stays on those cycles.',
  custom: 'Your own dates. Turn Goals and Reviews on for what this cycle needs.',
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
): NonNullable<ReviewCycle['sourceLinks']> {
  return sourceLinksFromIds(
    defaultSourcePeriodKeys(yearKey)
      .map((key) => cycles.find((cycle) => cycle.periodKey === key || cycle.id === key))
      .filter((cycle): cycle is ReviewCycle => Boolean(cycle))
      .map((cycle) => cycle.id),
    cycles,
    yearKey,
  )
}

export function cyclePurposeOf(cycle: Pick<ReviewCycle, 'purpose' | 'periodKey' | 'type'>): CyclePurpose {
  return (
    cycle.purpose ??
    inferPurpose(
      cycle.periodKey,
      cycle.type === 'ad-hoc' ? 'custom' : 'quarterly_checkin',
    )
  )
}

export function isLinkableSourceCycle(
  cycle: ReviewCycle,
  excludeId?: string,
): boolean {
  if (excludeId && cycle.id === excludeId) return false
  return cyclePurposeOf(cycle) !== 'annual_appraisal'
}

export function listLinkableSourceCycles(
  cycles: ReviewCycle[],
  opts?: { excludeId?: string; yearKey?: string },
): ReviewCycle[] {
  const yearKey = opts?.yearKey
  return cycles
    .filter((cycle) => isLinkableSourceCycle(cycle, opts?.excludeId))
    .sort((left, right) => {
      const leftMatch = yearKey && left.yearKey === yearKey ? 0 : 1
      const rightMatch = yearKey && right.yearKey === yearKey ? 0 : 1
      if (leftMatch !== rightMatch) return leftMatch - rightMatch
      return left.startDate.localeCompare(right.startDate)
    })
}

export function sourceLinksFromIds(
  sourceIds: string[],
  cycles: ReviewCycle[],
  yearKey?: string,
): NonNullable<ReviewCycle['sourceLinks']> {
  const unique = [...new Set(sourceIds.filter(Boolean))]
  const weightPercent = Math.round(100 / Math.max(unique.length, 1))
  return unique.map((sourceCycleId) => {
    const source = cycles.find((cycle) => cycle.id === sourceCycleId)
    return {
      sourceCycleId,
      weightPercent,
      excluded: false,
      transitionGrade:
        source?.periodKey && yearKey && source.periodKey === `q1-${yearKey}`
          ? ('performing' as const)
          : null,
    }
  })
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
