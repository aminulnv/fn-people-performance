import { findCycleGroupForPerson } from '@/lib/reviews/cycleGroups'
import { GRADE_BAND_ORDER } from '@/lib/reviews/labels'
import type { GradeBandId, ReviewCycle } from '@/lib/reviews/types'

type Guideline = Record<GradeBandId, number>

function sameGuideline(left: Guideline, right: Guideline): boolean {
  return GRADE_BAND_ORDER.every((id) => left[id] === right[id])
}

/** Whole percentages that add up to 100, keeping the largest fractional parts. */
function blendGuidelines(
  parts: Array<{ weight: number; guideline: Guideline }>,
): Guideline {
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0)
  if (totalWeight <= 0) return parts[0].guideline
  const shares = GRADE_BAND_ORDER.map((id) => {
    const value =
      parts.reduce((sum, part) => sum + part.guideline[id] * part.weight, 0) /
      totalWeight
    return { id, floor: Math.floor(value), fraction: value - Math.floor(value) }
  })
  let remainder = 100 - shares.reduce((sum, share) => sum + share.floor, 0)
  const byFraction = [...shares].sort(
    (left, right) => right.fraction - left.fraction,
  )
  const result = Object.fromEntries(
    shares.map((share) => [share.id, share.floor]),
  ) as Guideline
  for (const share of byFraction) {
    if (remainder <= 0) break
    result[share.id] += 1
    remainder -= 1
  }
  return result
}

/**
 * Expected grade mix for these people.
 * Each person's group setting wins over the cycle's sample curve.
 * Mixed groups are weighted by how many of these people sit in each group.
 */
export function guidelineForEmployees(
  cycle: Pick<ReviewCycle, 'calibration' | 'groups'>,
  employeeIds: readonly number[],
): Guideline {
  const fallback = cycle.calibration.gradeDistribution
  if (employeeIds.length === 0) return fallback

  const buckets = new Map<string, { weight: number; guideline: Guideline }>()
  for (const employeeId of employeeIds) {
    const group = findCycleGroupForPerson(cycle, employeeId)
    const guideline = group?.calibration.gradeDistribution ?? fallback
    const key = GRADE_BAND_ORDER.map((id) => guideline[id] ?? 0).join(':')
    const current = buckets.get(key)
    if (current) {
      current.weight += 1
    } else {
      buckets.set(key, { weight: 1, guideline })
    }
  }

  const parts = [...buckets.values()]
  if (parts.length === 1) return parts[0].guideline
  if (parts.every((part) => sameGuideline(part.guideline, parts[0].guideline))) {
    return parts[0].guideline
  }
  return blendGuidelines(parts)
}
