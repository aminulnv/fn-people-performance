import { buildPeriod, findAnnualPeriod, findPeriod } from './periods'
import {
  normalizeCycleType,
  type CyclePeriodOption,
  type CyclePurpose,
  type ReviewCycle,
} from './types'

export const PURPOSE_LABEL: Record<CyclePurpose, string> = {
  quarterly_checkin: 'Quarterly check-in',
  annual_appraisal: 'Annual appraisal',
  custom: 'Custom cycle',
}

export const PURPOSE_SHORT_LABEL: Record<CyclePurpose, string> = {
  quarterly_checkin: 'Quarterly',
  annual_appraisal: 'Annual',
  custom: 'Custom',
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
  )
}

export function cyclePurposeOf(
  cycle: Pick<ReviewCycle, 'periodKey' | 'type'> | null | undefined,
): CyclePurpose {
  if (!cycle) return 'quarterly_checkin'
  return inferPurpose(
    cycle.periodKey,
    normalizeCycleType(cycle.type) === 'custom' ? 'custom' : 'quarterly_checkin',
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
): NonNullable<ReviewCycle['sourceLinks']> {
  const unique = [...new Set(sourceIds.filter(Boolean))]
  const weightPercent = Math.round(100 / Math.max(unique.length, 1))
  return unique.map((sourceCycleId) => ({
    sourceCycleId,
    weightPercent,
    excluded: false,
  }))
}

export function includedSourceIds(cycle: Pick<ReviewCycle, 'sourceLinks'>): string[] {
  return (cycle.sourceLinks ?? [])
    .filter((link) => !link.excluded)
    .map((link) => link.sourceCycleId)
}

export function findAnnualOwningSource(
  cycles: ReviewCycle[],
  sourceCycleId: string,
): ReviewCycle | undefined {
  return cycles.find(
    (cycle) =>
      cyclePurposeOf(cycle) === 'annual_appraisal' &&
      includedSourceIds(cycle).includes(sourceCycleId),
  )
}

export function includeSourceInAnnualPatches(
  cycles: ReviewCycle[],
  annualId: string,
  sourceCycleId: string,
): Array<{ cycleId: string; sourceLinks: NonNullable<ReviewCycle['sourceLinks']> }> {
  const annual = cycles.find((cycle) => cycle.id === annualId)
  const source = cycles.find((cycle) => cycle.id === sourceCycleId)
  if (!annual || !source) return []
  if (cyclePurposeOf(annual) !== 'annual_appraisal') return []
  if (!isLinkableSourceCycle(source, annualId)) return []
  if (includedSourceIds(annual).includes(sourceCycleId)) return []

  const patches = [
    {
      cycleId: annualId,
      sourceLinks: sourceLinksFromIds([
        ...includedSourceIds(annual),
        sourceCycleId,
      ]),
    },
  ]
  const previous = findAnnualOwningSource(
    cycles.filter((cycle) => cycle.id !== annualId),
    sourceCycleId,
  )
  if (previous) {
    patches.push({
      cycleId: previous.id,
      sourceLinks: sourceLinksFromIds(
        includedSourceIds(previous).filter((id) => id !== sourceCycleId),
      ),
    })
  }
  return patches
}

export function excludeSourceFromAnnualPatches(
  cycles: ReviewCycle[],
  sourceCycleId: string,
): Array<{ cycleId: string; sourceLinks: NonNullable<ReviewCycle['sourceLinks']> }> {
  const owner = findAnnualOwningSource(cycles, sourceCycleId)
  if (!owner) return []
  return [
    {
      cycleId: owner.id,
      sourceLinks: sourceLinksFromIds(
        includedSourceIds(owner).filter((id) => id !== sourceCycleId),
      ),
    },
  ]
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
