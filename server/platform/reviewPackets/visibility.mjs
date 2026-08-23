const PACKET_STATUS_ORDER = [
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

function statusRank(status) {
  return PACKET_STATUS_ORDER.indexOf(status)
}

export function managerReviewIsComplete(status) {
  return statusRank(status) >= statusRank('manager_submitted')
}

export function calibrationIsEditable(status) {
  return (
    managerReviewIsComplete(status) &&
    statusRank(status) < statusRank('released_to_managers')
  )
}

function officialReviewReleasedToEmployee(status) {
  return status === 'released_to_employees' || status === 'appealed'
}

function stripUnpublishedOfficialReview(packet) {
  return {
    ...packet,
    managerOverallGrade: null,
    calibratedOverallGrade: null,
    publishedOverallGrade: null,
    managerOverrideReason: '',
    answers: (packet.answers ?? []).filter((answer) => answer.actorRole === 'self'),
    pillarScores: (packet.pillarScores ?? []).filter(
      (score) => score.actorRole === 'self',
    ),
    calibrationEvents: [],
  }
}

export function packetForViewer(packet, viewerEmployeeId) {
  if (!packet) return null
  if (
    viewerEmployeeId != null &&
    Number(viewerEmployeeId) === Number(packet.employeeId) &&
    !officialReviewReleasedToEmployee(packet.status)
  ) {
    return stripUnpublishedOfficialReview(packet)
  }
  return packet
}

export function packetsForViewer(packets, viewerEmployeeId) {
  return packets.map((packet) => packetForViewer(packet, viewerEmployeeId))
}
