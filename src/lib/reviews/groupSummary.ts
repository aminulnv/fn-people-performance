import { CALIBRATION_MODE_META } from './labels'
import { formatDateRange } from './periods'
import {
  cycleModulesOf,
  describeEnabledFlow,
  isReviewsModuleEnabled,
} from './reviewStages'
import type {
  CycleGroup,
  CycleModules,
  GoalCountPolicy,
  ReviewCycle,
} from './types'

export function peopleCountLabel(count: number): string {
  return count === 1 ? '1 person' : `${count} people`
}

export function groupWorkLabel(modules: CycleModules): string {
  if (modules.goals && modules.reviews) return 'Goals and reviews'
  if (modules.goals) return 'Goals only'
  if (modules.reviews) return 'Reviews only'
  return 'Nothing turned on'
}

export function goalCountSummary(policy: GoalCountPolicy): string {
  const min = policy.recommendedMinimum
  const max = policy.recommendedMaximum
  if (max) return `${min}–${max} goals`
  return `At least ${min} goals`
}

export function groupNextStep(group: CycleGroup): string | null {
  if (group.memberIds.length === 0) return 'Add people'
  const modules = cycleModulesOf(group.stagesConfig.reviewStages)
  if (!modules.goals && !modules.reviews) {
    return 'Choose goals, reviews, or both'
  }
  return null
}

export function groupWindowSummary(group: CycleGroup): string {
  const modules = cycleModulesOf(group.stagesConfig.reviewStages)
  const parts: string[] = []
  if (modules.goals) {
    const window = group.stagesConfig.goals.employee
    parts.push(`Goals ${formatDateRange(window.startDate, window.endDate)}`)
  }
  if (modules.reviews) {
    const window = group.stagesConfig.performance
    parts.push(
      `Reviews ${formatDateRange(
        window.managerStart.date,
        window.managerEnd.date,
      )}`,
    )
  }
  return parts.join(' · ')
}

export function goalsJobSummary(group: CycleGroup): string {
  const window = group.stagesConfig.goals.employee
  const range = formatDateRange(window.startDate, window.endDate)
  const policy = group.settings.goalCountPolicy
  return policy ? `${range} · ${goalCountSummary(policy)}` : range
}

export function reviewJobSummary(group: CycleGroup): string {
  return describeEnabledFlow(group.stagesConfig.reviewStages)
}

export function gradesJobSummary(group: CycleGroup): string {
  return CALIBRATION_MODE_META[group.calibration.calibrationMode].label
}

export function includedCycleCount(cycle: ReviewCycle): string | null {
  const count = (cycle.sourceLinks ?? []).filter((link) => !link.excluded)
    .length
  if (count === 0) return null
  return count === 1 ? '1 cycle' : `${count} cycles`
}

/** True when this cycle or any group runs reviews (not goals-only). */
export function cycleHasReviews(
  cycle: Pick<ReviewCycle, 'stagesConfig' | 'groups'>,
): boolean {
  if (isReviewsModuleEnabled(cycle.stagesConfig.reviewStages)) return true
  return (cycle.groups ?? []).some((group) =>
    isReviewsModuleEnabled(group.stagesConfig.reviewStages),
  )
}
