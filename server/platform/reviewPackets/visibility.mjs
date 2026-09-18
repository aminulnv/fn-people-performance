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

/**
 * True when this person may save a manager review.
 * The real manager, the person covering that manager during the delegation
 * window, or All read + write access. All read access can look, not change.
 */
export function managerReviewWriteAllowed({
  actorEmployeeId,
  subjectEmployeeId,
  reportsToEmployeeId = null,
  coveredManagerIds = [],
  canWriteAll = false,
}) {
  const actor = actorEmployeeId == null ? null : Number(actorEmployeeId)
  const subject = subjectEmployeeId == null ? null : Number(subjectEmployeeId)
  if (actor != null && actor === subject) return false
  if (canWriteAll) return true
  if (actor == null || reportsToEmployeeId == null) return false
  const managerId = Number(reportsToEmployeeId)
  if (actor === managerId) return true
  return coveredManagerIds.map(Number).includes(managerId)
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

function canSeeUnpublishedReview(packet, viewerEmployeeId, access) {
  if (access?.canViewAllReviews) return true
  const managed = access?.managedEmployeeIds
  const subjectId = Number(packet.employeeId)
  if (managed instanceof Set) return managed.has(subjectId)
  if (Array.isArray(managed)) return managed.map(Number).includes(subjectId)
  return false
}

/**
 * Unpublished manager and calibration grades are visible to the employee's
 * real manager, the person covering that manager, and people with All read
 * access or All read + write access. Being stored on the review is not enough.
 */
export function packetForViewer(
  packet,
  viewerEmployeeId,
  questions = [],
  access = {},
) {
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
    !officialReviewReleasedToEmployee(packet.status) &&
    !canSeeUnpublishedReview(packet, viewerEmployeeId, access)
  ) {
    return stripUnpublishedOfficialReview(packet)
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

export function packetsForViewer(
  packets,
  viewerEmployeeId,
  questionsForPacket,
  access = {},
) {
  return packets.map((packet) =>
    packetForViewer(
      packet,
      viewerEmployeeId,
      questionsForPacket?.(packet) ?? [],
      access,
    ),
  )
}
