import {
  officialReviewReleasedToEmployee,
  packetForViewer,
  selfReviewSubmitted,
  sessionReviewAccess,
  type ReviewViewerAccess,
} from './packetVisibility'
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

/**
 * Keep the other review's progress when one side saves.
 * Do not move a submitted manager review backwards.
 * Matches server/platform/reviewPackets/visibility.mjs.
 */
export function nextPacketStatus(
  current: ReviewPacketStatus,
  actorRole: 'self' | 'manager',
  submit: boolean,
): ReviewPacketStatus {
  const rank = statusRank(current)
  if (rank >= statusRank('manager_submitted')) return current
  if (actorRole === 'manager') {
    return submit ? 'manager_submitted' : 'manager_in_progress'
  }
  if (submit) {
    if (rank >= statusRank('manager_in_progress')) return current
    return 'self_submitted'
  }
  if (rank >= statusRank('self_submitted')) return current
  return 'self_in_progress'
}

/** Preserve an existing self-review submit when the manager saves first. */
export function nextSelfSubmittedAt(
  packet: Pick<ReviewPacket, 'status' | 'selfSubmittedAt' | 'updatedAt'>,
  actorRole: 'self' | 'manager',
  submit: boolean,
): string | null {
  if (packet.selfSubmittedAt) return packet.selfSubmittedAt
  if (actorRole === 'self' && submit) return new Date().toISOString()
  if (packet.selfSubmittedAt === null) return null
  if (statusRank(packet.status) >= statusRank('self_submitted')) {
    return packet.updatedAt ?? new Date().toISOString()
  }
  return null
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
  if (id === 'publish_employees') return 'Published Review'
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
      // No in-system appeals — challenges are handled offline with HR.
      return false
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

function resolveSubjectEmployeeId(
  packet: ReviewPacket | null,
  subjectEmployeeId?: number | null,
) {
  return packet?.employeeId ?? subjectEmployeeId ?? null
}

/**
 * True only when we know the viewer is someone other than the subject.
 * Unknown identity defaults to subject-safe access (least privilege).
 */
export function viewerIsKnownNonSubject(
  viewerEmployeeId?: number | null,
  packet: ReviewPacket | null = null,
  subjectEmployeeId?: number | null,
) {
  const subjectId = resolveSubjectEmployeeId(packet, subjectEmployeeId)
  return (
    viewerEmployeeId != null &&
    subjectId != null &&
    viewerEmployeeId !== subjectId
  )
}

export function viewerCanOpenStage(
  stage: ScorecardViewStage,
  packet: ReviewPacket | null,
  viewerEmployeeId?: number | null,
  subjectEmployeeId?: number | null,
) {
  if (stage === 'self_review') return true
  if (stage === 'manager_review' || stage === 'calibration_hod_hrbp') {
    return viewerIsKnownNonSubject(
      viewerEmployeeId,
      packet,
      subjectEmployeeId,
    )
  }
  if (!packet) return false
  if (
    viewerIsKnownNonSubject(viewerEmployeeId, packet, subjectEmployeeId)
  ) {
    return true
  }
  // Subject (or unresolved identity): only official published results.
  if (!officialReviewReleasedToEmployee(packet.status)) return false
  return true
}

/** Stages the viewer should see in the scorecard switcher. */
export function visibleScorecardStepsForViewer(
  stages: ReviewStageConfig[] | undefined,
  packet: ReviewPacket | null,
  viewerEmployeeId?: number | null,
  subjectEmployeeId?: number | null,
) {
  const steps = visibleScorecardSteps(stages, packet)
  // Least privilege while loading: hide manager/calibration until the viewer
  // is confirmed not to be the employee on this scorecard.
  if (
    viewerIsKnownNonSubject(viewerEmployeeId, packet, subjectEmployeeId)
  ) {
    return steps
  }
  return steps.filter(
    (step) =>
      step.id !== 'manager_review' && step.id !== 'calibration_hod_hrbp',
  )
}

export function scorecardStageIsOpen(
  step: (typeof SCORECARD_FLOW_STEPS)[number],
  stepIndex: number,
  currentIndex: number,
  packet: ReviewPacket | null,
  viewerEmployeeId?: number | null,
  subjectEmployeeId?: number | null,
) {
  const state = flowStepState(
    step,
    stepIndex,
    currentIndex,
    packet?.status ?? 'not_started',
  )
  if (step.id === 'appeal' && packet?.status === 'released_to_employees') {
    const subjectId = resolveSubjectEmployeeId(packet, subjectEmployeeId)
    return (
      viewerEmployeeId != null &&
      subjectId != null &&
      viewerEmployeeId === subjectId
    )
  }
  const parallelManagerReview =
    step.id === 'manager_review' &&
    viewerIsKnownNonSubject(viewerEmployeeId, packet, subjectEmployeeId)
  if (state === 'upcoming' && !parallelManagerReview) return false
  if (
    step.id === 'calibration_hod_hrbp' &&
    !managerReviewIsComplete(packet?.status ?? 'not_started')
  ) {
    return false
  }
  return viewerCanOpenStage(
    step.id,
    packet,
    viewerEmployeeId,
    subjectEmployeeId,
  )
}

export function resolveScorecardViewStage(input: {
  requested: ScorecardViewStage | null
  steps: Array<(typeof SCORECARD_FLOW_STEPS)[number]>
  packet: ReviewPacket | null
  viewerEmployeeId?: number | null
  subjectEmployeeId?: number | null
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
      input.subjectEmployeeId,
    ),
  )
  if (
    input.requested &&
    open.some((step) => step.id === input.requested)
  ) {
    return input.requested
  }
  if (
    viewerIsKnownNonSubject(
      input.viewerEmployeeId,
      input.packet,
      input.subjectEmployeeId,
    ) &&
    !managerReviewIsComplete(status) &&
    open.some((step) => step.id === 'manager_review')
  ) {
    return 'manager_review'
  }
  const current = input.steps[currentIndex]
  if (
    current &&
    open.some((step) => step.id === current.id)
  ) {
    return current.id
  }
  return open[open.length - 1]?.id ?? input.steps[0]?.id ?? 'self_review'
}

export function gradeForViewStage(
  packet: ReviewPacket | null | undefined,
  stage: ScorecardViewStage,
  viewerEmployeeId?: number | null,
  access: ReviewViewerAccess = sessionReviewAccess(),
): GradeBandId | null {
  const visible = packetForViewer(
    packet,
    viewerEmployeeId,
    [],
    access,
  )
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
  if (stage === 'self_review') return 'Self-Review Grade'
  if (stage === 'manager_review') return 'Manager grade'
  if (stage === 'calibration_hod_hrbp') return 'Calibrated grade'
  return 'Overall Grading'
}

export function feedbackRoleForViewStage(
  stage: ScorecardViewStage,
): 'self' | 'manager' {
  return stage === 'self_review' ? 'self' : 'manager'
}

/** Stages that own the self/manager review form (questions + overall on the form). */
export function stageShowsReviewForm(stage: ScorecardViewStage): boolean {
  return (
    stage === 'self_review' ||
    stage === 'manager_review' ||
    stage === 'publish_employees'
  )
}

/**
 * Edit mode must open a form stage. Publish/calibration/appeal keep the
 * current stage only when it already is a form stage; otherwise land on
 * manager review (or self when that is the only form).
 */
export function scorecardEditStage(
  viewing: ScorecardViewStage,
  options: { selfOn?: boolean; managerOn?: boolean; isSubject?: boolean } = {},
): ScorecardViewStage {
  if (viewing === 'self_review' || viewing === 'manager_review') return viewing
  if (options.isSubject && options.selfOn) return 'self_review'
  if (options.managerOn !== false) return 'manager_review'
  if (options.selfOn) return 'self_review'
  return 'manager_review'
}

/**
 * Whether the self/manager review form can still be changed.
 * Matches the lock rules on the edit page — Edit must not open a dead form.
 */
export function scorecardReviewFormIsEditable(
  stage: ScorecardViewStage,
  packet: ReviewPacket | null,
  isSubject: boolean,
): boolean {
  if (stage === 'self_review') {
    if (!isSubject) return false
    if (!packet) return true
    return !selfReviewSubmitted(packet)
  }
  if (stage === 'manager_review') {
    if (!packet) return true
    return (
      packet.status !== 'released_to_managers' &&
      packet.status !== 'released_to_employees'
    )
  }
  return false
}
