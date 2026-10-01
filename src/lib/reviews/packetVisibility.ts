import { readSession } from '@/lib/authApi'
import { canViewAllReviews } from '@/lib/accessControl/types'
import { isEffectiveDirectReport } from '@/lib/delegations/roles'
import { listEmployees } from '@/lib/employees/store'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { ReviewPacket, ReviewPacketStatus, ReviewQuestion } from './types'

/** Who may see manager and calibration grades before they are released. */
export type ReviewViewerAccess = {
  canViewAllReviews?: boolean
  /** Subjects this viewer manages directly, or through an active delegation. */
  managedEmployeeIds?: number[]
}

export function reviewAccessForDirectory(
  viewer: PlatformEmployee | null | undefined,
  directory: readonly PlatformEmployee[],
  access: ReviewViewerAccess = {},
): ReviewViewerAccess {
  if (!viewer) return access
  return {
    ...access,
    managedEmployeeIds: directory
      .filter((person) => isEffectiveDirectReport(person, viewer, directory))
      .map((person) => person.employeeId),
  }
}

export function sessionReviewAccess(): ReviewViewerAccess {
  const session = readSession()
  const directory = listEmployees()
  const viewer = directory.find(
    (person) => person.employeeId === session?.user.employeeId,
  )
  return reviewAccessForDirectory(viewer, directory, {
    canViewAllReviews: canViewAllReviews(session?.user.permissions),
  })
}

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

function statusRank(status: ReviewPacketStatus) {
  return PACKET_STATUS_ORDER.indexOf(status)
}

function managerReviewIsComplete(status: ReviewPacketStatus) {
  return statusRank(status) >= statusRank('manager_submitted')
}

/**
 * Self-review submit is independent of status so the manager can start first.
 * Packets without the field still treat a post-self status as submitted.
 */
export function selfReviewSubmitted(
  packet: Pick<ReviewPacket, 'status' | 'selfSubmittedAt'> | null | undefined,
): boolean {
  if (!packet) return false
  if (Object.prototype.hasOwnProperty.call(packet, 'selfSubmittedAt')) {
    return Boolean(packet.selfSubmittedAt)
  }
  return statusRank(packet.status) >= statusRank('self_submitted')
}

/** Line manager sees the self-review only after both sides have submitted. */
export function managerCanSeeSelfReview(
  packet: Pick<ReviewPacket, 'status' | 'selfSubmittedAt'> | null | undefined,
): boolean {
  if (!packet) return false
  return managerReviewIsComplete(packet.status) && selfReviewSubmitted(packet)
}

/**
 * True when this viewer is the line manager (or covering manager) and must
 * not see self-review content yet. Admins who are not the line manager are
 * not blinded.
 */
export function managerIsBlindedFromSelfReview(
  packet:
    | Pick<
        ReviewPacket,
        'status' | 'selfSubmittedAt' | 'employeeId' | 'managerEmployeeId'
      >
    | null
    | undefined,
  viewerEmployeeId: number | null | undefined,
  access: ReviewViewerAccess = {},
): boolean {
  if (!packet || viewerEmployeeId == null) return false
  if (viewerEmployeeId === packet.employeeId) return false
  if (!viewerIsLineManager(packet, viewerEmployeeId, access)) return false
  return !managerCanSeeSelfReview(packet)
}

/** Official manager / calibration result is visible to the subject after this. */
export function officialReviewReleasedToEmployee(
  status: ReviewPacketStatus,
): boolean {
  return status === 'released_to_employees' || status === 'appealed'
}

function stripUnpublishedOfficialReview(packet: ReviewPacket): ReviewPacket {
  return {
    ...packet,
    managerOverallGrade: null,
    calibratedOverallGrade: null,
    publishedOverallGrade: null,
    managerOverrideReason: '',
    answers: packet.answers.filter((answer) => answer.actorRole === 'self'),
    pillarScores: packet.pillarScores.filter((score) => score.actorRole === 'self'),
    calibrationEvents: [],
  }
}

function outputReleasedToManager(status: ReviewPacketStatus): boolean {
  return (
    status === 'released_to_managers' ||
    status === 'released_to_employees' ||
    status === 'appealed'
  )
}

function filterAnswersForAudience(
  packet: ReviewPacket,
  questions: ReviewQuestion[],
  audience: ReviewQuestion['outputVisibility'][number],
): ReviewPacket {
  const hiddenQuestionIds = new Set(
    questions
      .filter(
        (question) =>
          !(question.outputVisibility ?? ['employee', 'manager']).includes(
            audience,
          ),
      )
      .map((question) => question.id),
  )
  if (hiddenQuestionIds.size === 0) return packet
  return {
    ...packet,
    answers: packet.answers.filter(
      (answer) => !hiddenQuestionIds.has(answer.questionId),
    ),
  }
}

function canSeeUnpublishedReview(
  packet: ReviewPacket,
  _viewerEmployeeId: number | null | undefined,
  access: ReviewViewerAccess,
): boolean {
  if (access.canViewAllReviews) return true
  return (access.managedEmployeeIds ?? []).includes(packet.employeeId)
}

function stripSelfReview(packet: ReviewPacket): ReviewPacket {
  return {
    ...packet,
    selfOverallGrade: null,
    answers: packet.answers.filter((answer) => answer.actorRole !== 'self'),
    pillarScores: packet.pillarScores.filter((score) => score.actorRole !== 'self'),
  }
}

function viewerIsLineManager(
  packet: Pick<ReviewPacket, 'employeeId' | 'managerEmployeeId'>,
  viewerEmployeeId: number | null | undefined,
  access: ReviewViewerAccess,
): boolean {
  if (
    viewerEmployeeId != null &&
    packet.managerEmployeeId != null &&
    viewerEmployeeId === packet.managerEmployeeId
  ) {
    return true
  }
  return (access.managedEmployeeIds ?? []).includes(packet.employeeId)
}

function withSelfReviewBlind(
  packet: ReviewPacket,
  viewerEmployeeId: number | null | undefined,
  access: ReviewViewerAccess,
): ReviewPacket {
  const isSubject =
    viewerEmployeeId != null && viewerEmployeeId === packet.employeeId
  if (isSubject) return packet
  if (!viewerIsLineManager(packet, viewerEmployeeId, access)) return packet
  if (managerCanSeeSelfReview(packet)) return packet
  return stripSelfReview(packet)
}

function stripProvisionalGradesForEmployee(packet: ReviewPacket): ReviewPacket {
  return {
    ...packet,
    managerOverallGrade: null,
    calibratedOverallGrade: null,
    managerOverrideReason: '',
    calibrationEvents: [],
  }
}

/**
 * The subject may only see their self-review until results are published
 * to employees. After publish they see the official published grade plus
 * manager narrative — not the provisional manager / calibrated overalls or
 * calibration-room history. The real manager, cover, and All read access
 * keep unpublished grades. Everyone else cannot.
 */
export function packetForViewer(
  packet: ReviewPacket,
  viewerEmployeeId?: number | null,
  questions?: ReviewQuestion[],
  access?: ReviewViewerAccess,
): ReviewPacket
export function packetForViewer(
  packet: ReviewPacket | null | undefined,
  viewerEmployeeId?: number | null,
  questions?: ReviewQuestion[],
  access?: ReviewViewerAccess,
): ReviewPacket | null
export function packetForViewer(
  packet: ReviewPacket | null | undefined,
  viewerEmployeeId?: number | null,
  questions: ReviewQuestion[] = [],
  access: ReviewViewerAccess = {},
): ReviewPacket | null {
  if (!packet) return null
  const isSubject =
    viewerEmployeeId != null &&
    viewerEmployeeId === packet.employeeId
  let visible = packet
  if (isSubject && !officialReviewReleasedToEmployee(packet.status)) {
    visible = stripUnpublishedOfficialReview(packet)
  } else if (isSubject) {
    visible = stripProvisionalGradesForEmployee(
      filterAnswersForAudience(packet, questions, 'employee'),
    )
  } else if (
    !officialReviewReleasedToEmployee(packet.status) &&
    !canSeeUnpublishedReview(packet, viewerEmployeeId, access)
  ) {
    visible = stripUnpublishedOfficialReview(packet)
  } else if (
    viewerEmployeeId != null &&
    viewerEmployeeId === packet.managerEmployeeId &&
    outputReleasedToManager(packet.status)
  ) {
    visible = filterAnswersForAudience(packet, questions, 'manager')
  }
  return withSelfReviewBlind(visible, viewerEmployeeId, access)
}

export function packetsForViewer(
  packets: ReviewPacket[],
  viewerEmployeeId?: number | null,
  questionsForPacket?: (packet: ReviewPacket) => ReviewQuestion[],
  access: ReviewViewerAccess = {},
): ReviewPacket[] {
  return packets.map((packet) =>
    packetForViewer(
      packet,
      viewerEmployeeId,
      questionsForPacket?.(packet) ?? [],
      access,
    ),
  )
}
