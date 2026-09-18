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

/**
 * The subject may only see their self-review until results are published
 * to employees. The real manager, the person covering that manager, and
 * people with All read access or All read + write access can see unpublished
 * grades. Everyone else cannot.
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
  if (isSubject && !officialReviewReleasedToEmployee(packet.status)) {
    return stripUnpublishedOfficialReview(packet)
  }
  if (isSubject) {
    return filterAnswersForAudience(packet, questions, 'employee')
  }
  if (
    !officialReviewReleasedToEmployee(packet.status) &&
    !canSeeUnpublishedReview(packet, viewerEmployeeId, access)
  ) {
    return stripUnpublishedOfficialReview(packet)
  }
  if (
    viewerEmployeeId != null &&
    viewerEmployeeId === packet.managerEmployeeId &&
    outputReleasedToManager(packet.status)
  ) {
    return filterAnswersForAudience(packet, questions, 'manager')
  }
  return packet
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
