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

function outputReleasedToManager(status) {
  return (
    status === 'released_to_managers' ||
    status === 'released_to_employees' ||
    status === 'appealed'
  )
}

function filterAnswersForAudience(packet, questions, audience) {
  const hiddenQuestionIds = new Set(
    (questions ?? [])
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
    answers: (packet.answers ?? []).filter(
      (answer) => !hiddenQuestionIds.has(answer.questionId),
    ),
  }
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

export function packetForViewer(packet, viewerEmployeeId, questions = []) {
  if (!packet) return null
  const isSubject =
    viewerEmployeeId != null &&
    Number(viewerEmployeeId) === Number(packet.employeeId)
  if (isSubject && !officialReviewReleasedToEmployee(packet.status)) {
    return stripUnpublishedOfficialReview(packet)
  }
  if (isSubject) {
    return filterAnswersForAudience(packet, questions, 'employee')
  }
  if (
    viewerEmployeeId != null &&
    Number(viewerEmployeeId) === Number(packet.managerEmployeeId) &&
    outputReleasedToManager(packet.status)
  ) {
    return filterAnswersForAudience(packet, questions, 'manager')
  }
  return packet
}

export function packetsForViewer(packets, viewerEmployeeId, questionsForPacket) {
  return packets.map((packet) =>
    packetForViewer(packet, viewerEmployeeId, questionsForPacket?.(packet) ?? []),
  )
}
