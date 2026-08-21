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

export const GRADE_BAND_META: Record<GradeBandId, { label: string }> = {
  exceptional: { label: 'Exceptional' },
  exceeding: { label: 'Exceeding' },
  performing: { label: 'Performing' },
  developing: { label: 'Developing' },
  unsatisfactory: { label: 'Unsatisfactory' },
}

export const GRADE_BAND_ORDER: GradeBandId[] = [
  'exceptional',
  'exceeding',
  'performing',
  'developing',
  'unsatisfactory',
]

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
  const [y, m, d] = value.date.split('-').map(Number)
  if (!y || !m || !d) return `${value.date}, ${value.time} UTC`
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
  const [hh, mm] = value.time.split(':')
  return `${d} ${months[m - 1]} ${y}, ${hh}:${mm} UTC`
}

export function stagesConfigToTimeline(
  config: CycleStagesConfig,
): CycleStage[] {
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
