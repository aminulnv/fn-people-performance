import { cyclePurposeOf } from './purpose'
import type { ReviewCycle } from './types'

export type CycleListNode = {
  cycle: ReviewCycle
  children: ReviewCycle[]
}

/**
 * Nest source cycles under the annual that includes them. A cycle is claimed
 * by at most one annual (newer year first). Unlinked cycles stay top-level.
 * Root order is the input order; children sort by start date, latest first.
 */
export function nestCyclesForList(cycles: ReviewCycle[]): CycleListNode[] {
  const byId = new Map(cycles.map((cycle) => [cycle.id, cycle]))
  const claimed = new Set<string>()
  const childrenByParent = new Map<string, ReviewCycle[]>()

  const annuals = cycles
    .filter((cycle) => cyclePurposeOf(cycle) === 'annual_appraisal')
    .slice()
    .sort((left, right) => {
      const year = (right.yearKey ?? '').localeCompare(left.yearKey ?? '')
      if (year !== 0) return year
      return right.startDate.localeCompare(left.startDate)
    })

  for (const annual of annuals) {
    const children: ReviewCycle[] = []
    for (const link of annual.sourceLinks ?? []) {
      if (link.excluded) continue
      const child = byId.get(link.sourceCycleId)
      if (!child || claimed.has(child.id)) continue
      if (cyclePurposeOf(child) === 'annual_appraisal') continue
      claimed.add(child.id)
      children.push(child)
    }
    children.sort((left, right) => {
      const start = right.startDate.localeCompare(left.startDate)
      if (start !== 0) return start
      return right.name.localeCompare(left.name)
    })
    childrenByParent.set(annual.id, children)
  }

  return cycles
    .filter((cycle) => !claimed.has(cycle.id))
    .map((cycle) => ({
      cycle,
      children: childrenByParent.get(cycle.id) ?? [],
    }))
}
