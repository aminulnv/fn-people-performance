import { officialReviewReleasedToEmployee, packetForViewer } from './packetVisibility'
import { REVIEW_STAGE_LABEL, getReviewStage } from './reviewStages'
import type {
  GradeBandId,
  ReviewPacket,
  ReviewPacketStatus,
  ReviewStageConfig,
  ReviewStageId,
} from './types'

export type ScorecardViewStage = Extract<
  ReviewStageId,
  | 'self_review'
  | 'manager_review'
  | 'calibration_hod_hrbp'
  | 'publish_employees'
  | 'appeal'
>

export const SCORECARD_FLOW_STEPS: Array<{
  id: ScorecardViewStage
  until: ReviewPacketStatus[]
}> = [
  {
    id: 'self_review',
    until: ['not_started', 'self_in_progress'],
  },
  {
    id: 'manager_review',
    until: ['self_submitted', 'manager_in_progress'],
  },
  {
    id: 'calibration_hod_hrbp',
    until: ['manager_submitted', 'in_calibration'],
  },
  {
    id: 'publish_employees',
    until: ['calibrated', 'released_to_managers', 'released_to_employees'],
  },
  {
    id: 'appeal',
    until: ['appealed'],
  },
]

const PACKET_STATUS_ORDER: ReviewPacketStatus[] = [
  'not_started',
  'self_in_progress',
  'self_submitted',
  'manager_in_progress',
  'manager_submitted',
  'in_calibration',
  'calibrated',
  'released_to_managers',
  'released_to_employees',
  'appealed',
]

const VIEW_STAGE_IDS = new Set<string>(
  SCORECARD_FLOW_STEPS.map((step) => step.id),
)

function statusRank(status: ReviewPacketStatus) {
  return PACKET_STATUS_ORDER.indexOf(status)
}

export function managerReviewIsComplete(status: ReviewPacketStatus) {
  return statusRank(status) >= statusRank('manager_submitted')
}

/** Calibration may be written only after the manager has submitted. */
export function calibrationIsEditable(status: ReviewPacketStatus) {
  return (
    managerReviewIsComplete(status) &&
    statusRank(status) < statusRank('released_to_managers')
  )
}

export function scorecardStepLabel(id: ScorecardViewStage) {
  if (id === 'calibration_hod_hrbp') return 'Calibration'
  if (id === 'publish_employees') return 'Published'
  return REVIEW_STAGE_LABEL[id]
}

export function visibleScorecardSteps(
  stages: ReviewStageConfig[] | undefined,
  packet: ReviewPacket | null,
) {
  return SCORECARD_FLOW_STEPS.filter((step) => {
    if (step.id === 'calibration_hod_hrbp') {
      return Boolean(
        getReviewStage(stages, 'calibration_hod_hrbp')?.enabled ||
          getReviewStage(stages, 'calibration_slt')?.enabled ||
          packet?.calibratedOverallGrade ||
          (packet?.calibrationEvents.length ?? 0) > 0,
      )
    }
    if (step.id === 'appeal') {
      return Boolean(
        getReviewStage(stages, 'appeal')?.enabled ||
          (packet?.appeals.length ?? 0) > 0 ||
          packet?.status === 'appealed',
      )
    }
    if (step.id === 'self_review') {
      return Boolean(
        getReviewStage(stages, 'self_review')?.enabled || packet?.selfOverallGrade,
      )
    }
    return true
  })
}

export function stepIsCurrent(
  step: (typeof SCORECARD_FLOW_STEPS)[number],
  status: ReviewPacketStatus,
) {
  return step.until.includes(status)
}

function stepIsPassed(
  step: (typeof SCORECARD_FLOW_STEPS)[number],
  status: ReviewPacketStatus,
) {
  return statusRank(status) > Math.max(...step.until.map(statusRank))
}

export function currentScorecardStepIndex(
  steps: Array<(typeof SCORECARD_FLOW_STEPS)[number]>,
  status: ReviewPacketStatus,
) {
  const current = steps.findIndex((step) => stepIsCurrent(step, status))
  if (current >= 0) return current
  const next = steps.findIndex((step) => !stepIsPassed(step, status))
  return next === -1 ? Math.max(0, steps.length - 1) : next
}

export function flowStepState(
  step: (typeof SCORECARD_FLOW_STEPS)[number],
  stepIndex: number,
  currentIndex: number,
  status: ReviewPacketStatus,
): 'done' | 'active' | 'upcoming' {
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex > currentIndex) return 'upcoming'
  if (
    (step.id === 'publish_employees' && status === 'released_to_employees') ||
    (step.id === 'appeal' && status === 'appealed')
  ) {
    return 'done'
  }
  return 'active'
}

export function parseScorecardViewStage(
  value: string | null | undefined,
): ScorecardViewStage | null {
  if (!value || !VIEW_STAGE_IDS.has(value)) return null
  return value as ScorecardViewStage
}

export function viewerCanOpenStage(
  stage: ScorecardViewStage,
  packet: ReviewPacket | null,
  viewerEmployeeId?: number | null,
) {
  if (!packet) return stage === 'self_review'
  if (
    viewerEmployeeId == null ||
    viewerEmployeeId !== packet.employeeId
  ) {
    return true
  }
  if (stage === 'self_review') return true
  if (!officialReviewReleasedToEmployee(packet.status)) return false
  return stage !== 'calibration_hod_hrbp'
}

export function scorecardStageIsOpen(
  step: (typeof SCORECARD_FLOW_STEPS)[number],
  stepIndex: number,
  currentIndex: number,
  packet: ReviewPacket | null,
  viewerEmployeeId?: number | null,
) {
  const state = flowStepState(
    step,
    stepIndex,
    currentIndex,
    packet?.status ?? 'not_started',
  )
  if (state === 'upcoming') return false
  if (
    step.id === 'calibration_hod_hrbp' &&
    !managerReviewIsComplete(packet?.status ?? 'not_started')
  ) {
    return false
  }
  return viewerCanOpenStage(step.id, packet, viewerEmployeeId)
}

export function resolveScorecardViewStage(input: {
  requested: ScorecardViewStage | null
  steps: Array<(typeof SCORECARD_FLOW_STEPS)[number]>
  packet: ReviewPacket | null
  viewerEmployeeId?: number | null
}): ScorecardViewStage {
  const status = input.packet?.status ?? 'not_started'
  const currentIndex = currentScorecardStepIndex(input.steps, status)
  const open = input.steps.filter((step, index) =>
    scorecardStageIsOpen(
      step,
      index,
      currentIndex,
      input.packet,
      input.viewerEmployeeId,
    ),
  )
  if (
    input.requested &&
    open.some((step) => step.id === input.requested)
  ) {
    return input.requested
  }
  const current = input.steps[currentIndex]
  if (
    current &&
    open.some((step) => step.id === current.id)
  ) {
    return current.id
  }
  return open.at(-1)?.id ?? input.steps[0]?.id ?? 'self_review'
}

export function gradeForViewStage(
  packet: ReviewPacket | null | undefined,
  stage: ScorecardViewStage,
  viewerEmployeeId?: number | null,
): GradeBandId | null {
  const visible = packetForViewer(packet, viewerEmployeeId)
  if (!visible) return null
  if (stage === 'self_review') return visible.selfOverallGrade
  if (stage === 'manager_review') return visible.managerOverallGrade
  if (stage === 'calibration_hod_hrbp') {
    return visible.calibratedOverallGrade ?? visible.managerOverallGrade
  }
  return (
    visible.publishedOverallGrade ??
    visible.calibratedOverallGrade ??
    visible.managerOverallGrade
  )
}

export function gradeLabelForViewStage(stage: ScorecardViewStage) {
  if (stage === 'self_review') return 'Self-review grade'
  if (stage === 'manager_review') return 'Manager grade'
  if (stage === 'calibration_hod_hrbp') return 'Calibrated grade'
  return 'Overall grade'
}

export function feedbackRoleForViewStage(
  stage: ScorecardViewStage,
): 'self' | 'manager' {
  return stage === 'self_review' ? 'self' : 'manager'
}
