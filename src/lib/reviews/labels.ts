import { formatLocalTimestamp } from '@/lib/dates/timezone'
import type {
  CalibrationLogic,
  CalibrationModeId,
  CycleStage,
  CycleStagesConfig,
  CycleSettings,
  DateTimeValue,
  GoalCountPolicy,
  GradeBandId,
  GradeRecommendationId,
  PostWindowGoalPolicy,
  ReviewTypeId,
} from './types'

export const REVIEW_TYPE_META: Record<
  ReviewTypeId,
  {
    label: string
    description: string
    badge?: 'required' | 'recommended'
    required?: boolean
  }
> = {
  line_manager: {
    label: 'Line manager reviews',
    description:
      'Review feedback from line managers are the foundation of the performance result.',
    badge: 'required',
    required: true,
  },
  self: {
    label: 'Self reviews',
    description:
      'Allows the employee to submit a review of their own performance and behaviours.',
    badge: 'recommended',
  },
  upwards: {
    label: 'Upwards reviews',
    description:
      'Direct and functional reports are allowed to submit anonymous reviews of their managers.',
    badge: 'recommended',
  },
  peer: {
    label: 'Peer reviews',
    description: 'Allow peers to review each other.',
    badge: 'recommended',
  },
  functional_manager: {
    label: 'Functional manager reviews',
    description:
      'Allows functional managers (FM) to submit performance reviews for their reports.',
  },
}

export const REVIEW_TYPE_ORDER: ReviewTypeId[] = [
  'line_manager',
  'self',
  'upwards',
  'peer',
  'functional_manager',
]

export const GRADE_BAND_META: Record<
  GradeBandId,
  { label: string; description: string }
> = {
  exceptional: {
    label: 'Exceptional',
    description:
      'Reserved for people who consistently exceed every goal and operate well above their grade.',
  },
  exceeding: {
    label: 'Exceeding',
    description:
      'People who achieve all goals and often deliver beyond what was asked.',
  },
  performing: {
    label: 'Performing',
    description:
      'The expected band — reliably achieves goals and consistently lives company values.',
  },
  developing: {
    label: 'Developing',
    description:
      'Partially achieves goals and needs regular support to close competency or values gaps.',
  },
  unsatisfactory: {
    label: 'Unsatisfactory',
    description:
      'Significantly misses goals, or shows competency or values gaps, despite management support.',
  },
}

export const GRADE_BAND_ORDER: GradeBandId[] = [
  'exceptional',
  'exceeding',
  'performing',
  'developing',
  'unsatisfactory',
]

/** Low → high. Used on the overall-grade radio list. */
export const OVERALL_GRADE_ORDER: GradeBandId[] = [
  'unsatisfactory',
  'developing',
  'performing',
  'exceeding',
  'exceptional',
]

export const GRADE_BAND_CRITERIA: Record<GradeBandId, readonly [string, string, string]> = {
  unsatisfactory: [
    'Significantly misses goals despite management support.',
    'Significant competency gaps affecting performance.',
    'Behaviours frequently inconsistent with company values.',
  ],
  developing: [
    'Partially achieves goals; requires regular support.',
    'Some gaps in key competencies needing targeted improvement.',
    'Inconsistent alignment with company values — improvement expected.',
  ],
  performing: [
    'Reliably achieves goals with minimal guidance.',
    'Demonstrates core competencies expected for their grade and role.',
    'Consistently lives company values in day-to-day work.',
  ],
  exceeding: [
    'Achieves all goals and often delivers beyond what was asked.',
    'Demonstrates competencies above role expectations.',
    'Consistently applies company values and influences the team positively.',
  ],
  exceptional: [
    'Consistently exceeds all goals.',
    'Operates at a skill level significantly above their grade.',
    'Embodies and actively elevates the company culture — recognised as a role model for both performance and values.',
  ],
}

export const CALIBRATION_MODE_META: Record<
  CalibrationModeId,
  { label: string; description: string }
> = {
  manual: {
    label: 'Manual',
    description:
      'Add a calibrator column to the calibration table. Assign calibrators individually for each employee as needed.',
  },
  department: {
    label: 'Department owners',
    description:
      'Department owners calibrate grades for people in their department.',
  },
  central: {
    label: 'Central calibration',
    description:
      'A central calibrator group reviews and finalises grades across the organisation.',
  },
}

export const GRADE_RECOMMENDATION_META: Record<
  GradeRecommendationId,
  { label: string; description: string }
> = {
  none: {
    label: 'No recommendation',
    description: 'Keep the column empty - calibrators need to pick.',
  },
  manager_average: {
    label: 'Manager average',
    description: 'Pre-fill with the average of manager-submitted scores.',
  },
  weighted: {
    label: 'Weighted scorecards',
    description:
      'Pre-fill from weighted scorecard results across review types.',
  },
}

export const CALIBRATION_SECTION_HINTS = {
  calibrators: 'Who reviews and finalises grades for people in this group.',
  recommendation:
    'Whether calibrators see a suggested grade before they decide.',
  seniorLeadership: 'People who sit in SLT calibration for this group.',
  distribution:
    'The target mix of grades for this group. Percentages must add up to 100%.',
} as const

export function enabledReviewTypeLabels(settings: CycleSettings): string {
  const types: Record<ReviewTypeId, boolean> = {
    line_manager: true,
    self: false,
    upwards: false,
    peer: false,
    functional_manager: false,
  }
  for (const id of REVIEW_TYPE_ORDER) {
    if (typeof settings.reviewTypes?.[id] === 'boolean') {
      types[id] = settings.reviewTypes[id]
    }
  }
  const labels = REVIEW_TYPE_ORDER.filter((id) => types[id]).map((id) =>
    REVIEW_TYPE_META[id].label.replace(/ reviews$/i, ''),
  )
  return labels.length > 0 ? labels.join(', ') : 'None'
}

export function goalCountPolicyLabel(policy: GoalCountPolicy): string {
  const hardRange = policy.maximumAllowed
    ? `${policy.minimumRequired}–${policy.maximumAllowed} required`
    : `${policy.minimumRequired}+ required`
  return `${hardRange} · ${policy.recommendedMinimum}–${policy.recommendedMaximum} recommended`
}

export function postWindowGoalPolicyLabel(policy: PostWindowGoalPolicy): string {
  return policy === 'two_tier_approval'
    ? 'Allowed · two-tier approval'
    : 'Not allowed'
}

export function formatDateTimeValue(value: DateTimeValue): string {
  return formatLocalTimestamp(value)
}

export function stagesConfigToTimeline(
  config: CycleStagesConfig,
): CycleStage[] {
  const enabled = (config.reviewStages ?? []).filter((stage) => stage.enabled)
  if (enabled.length > 0) {
    return enabled.map((stage) => ({
      id: stage.id === 'goals' ? 'employee_goals' : stage.id,
      label:
        stage.id === 'goals'
          ? 'Goal setting'
          : stage.id.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      startDate: stage.start?.date ?? config.goals.employee.startDate,
      endDate: stage.end?.date,
    }))
  }
  return [
    {
      id: 'employee_goals',
      label: 'Goal setting',
      startDate: config.goals.employee.startDate,
      endDate: config.goals.employee.endDate,
    },
    {
      id: 'performance_review',
      label: 'Performance review',
      startDate: config.performance.managerStart.date,
      endDate: config.performance.managerEnd.date,
    },
  ]
}

const GOAL_STAGE_IDS = new Set(['employee_goals'])

export function goalStagesTimeline(config: CycleStagesConfig): CycleStage[] {
  return stagesConfigToTimeline(config).filter((stage) =>
    GOAL_STAGE_IDS.has(stage.id),
  )
}

export function reviewStagesTimeline(config: CycleStagesConfig): CycleStage[] {
  return stagesConfigToTimeline(config).filter(
    (stage) => !GOAL_STAGE_IDS.has(stage.id),
  )
}

export function distributionTotal(
  distribution: CalibrationLogic['gradeDistribution'],
): number {
  return GRADE_BAND_ORDER.reduce((sum, id) => sum + distribution[id], 0)
}
