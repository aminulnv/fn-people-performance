import type { ReviewPacket, ReviewPacketStatus, ReviewQuestion } from './types'

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

/**
 * The subject may only see their self-review until results are published
 * to employees. Managers and calibrators still get the full packet.
 */
export function packetForViewer(
  packet: ReviewPacket,
  viewerEmployeeId?: number | null,
  questions?: ReviewQuestion[],
): ReviewPacket
export function packetForViewer(
  packet: ReviewPacket | null | undefined,
  viewerEmployeeId?: number | null,
  questions?: ReviewQuestion[],
): ReviewPacket | null
export function packetForViewer(
  packet: ReviewPacket | null | undefined,
  viewerEmployeeId?: number | null,
  questions: ReviewQuestion[] = [],
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
): ReviewPacket[] {
  return packets.map((packet) =>
    packetForViewer(
      packet,
      viewerEmployeeId,
      questionsForPacket?.(packet) ?? [],
    ),
  )
}
