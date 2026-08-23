import type { ReviewPacket, ReviewPacketStatus } from './types'

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

/**
 * The subject may only see their self-review until results are published
 * to employees. Managers and calibrators still get the full packet.
 */
export function packetForViewer(
  packet: ReviewPacket,
  viewerEmployeeId?: number | null,
): ReviewPacket
export function packetForViewer(
  packet: ReviewPacket | null | undefined,
  viewerEmployeeId?: number | null,
): ReviewPacket | null
export function packetForViewer(
  packet: ReviewPacket | null | undefined,
  viewerEmployeeId?: number | null,
): ReviewPacket | null {
  if (!packet) return null
  if (
    viewerEmployeeId != null &&
    viewerEmployeeId === packet.employeeId &&
    !officialReviewReleasedToEmployee(packet.status)
  ) {
    return stripUnpublishedOfficialReview(packet)
  }
  return packet
}

export function packetsForViewer(
  packets: ReviewPacket[],
  viewerEmployeeId?: number | null,
): ReviewPacket[] {
  return packets.map((packet) => packetForViewer(packet, viewerEmployeeId))
}
