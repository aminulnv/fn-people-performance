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

/**
 * Self-review submit is independent of status so the manager can start first.
 * Packets without the field still treat a post-self status as submitted.
 */
export function selfReviewSubmitted(packet) {
  if (!packet) return false
  if (Object.prototype.hasOwnProperty.call(packet, 'selfSubmittedAt')) {
    return Boolean(packet.selfSubmittedAt)
  }
  return statusRank(packet.status) >= statusRank('self_submitted')
}

/** Line manager sees the self-review only after both sides have submitted. */
export function managerCanSeeSelfReview(packet) {
  return managerReviewIsComplete(packet?.status) && selfReviewSubmitted(packet)
}

/**
 * Keep the other review's progress when one side saves.
 * Do not move a submitted manager review backwards.
 */
export function nextPacketStatus(current, actorRole, submit) {
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

function stripSelfReview(packet) {
  return {
    ...packet,
    selfOverallGrade: null,
    answers: (packet.answers ?? []).filter((answer) => answer.actorRole !== 'self'),
    pillarScores: (packet.pillarScores ?? []).filter(
      (score) => score.actorRole !== 'self',
    ),
  }
}

function viewerIsLineManager(packet, viewerEmployeeId, access) {
  const viewer = viewerEmployeeId == null ? null : Number(viewerEmployeeId)
  if (
    viewer != null &&
    packet.managerEmployeeId != null &&
    viewer === Number(packet.managerEmployeeId)
  ) {
    return true
  }
  const managed = access?.managedEmployeeIds
  const subjectId = Number(packet.employeeId)
  if (managed instanceof Set) return managed.has(subjectId)
  if (Array.isArray(managed)) return managed.map(Number).includes(subjectId)
  return false
}

function withSelfReviewBlind(packet, viewerEmployeeId, access) {
  if (!packet) return packet
  const isSubject =
    viewerEmployeeId != null &&
    Number(viewerEmployeeId) === Number(packet.employeeId)
  if (isSubject) return packet
  if (!viewerIsLineManager(packet, viewerEmployeeId, access)) return packet
  if (managerCanSeeSelfReview(packet)) return packet
  return stripSelfReview(packet)
}

function stripProvisionalGradesForEmployee(packet) {
  return {
    ...packet,
    managerOverallGrade: null,
    calibratedOverallGrade: null,
    managerOverrideReason: '',
    calibrationEvents: [],
  }
}

/**
 * Unpublished manager and calibration grades are visible to the employee's
 * real manager, the person covering that manager, and people with All read
 * access or All read + write access. Being stored on the review is not enough.
 * After publish, the subject still does not see provisional manager /
 * calibrated overalls or calibration events — only the published grade and
 * the manager narrative allowed for the employee audience.
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
    Number(viewerEmployeeId) === Number(packet.managerEmployeeId) &&
    outputReleasedToManager(packet.status)
  ) {
    visible = filterAnswersForAudience(packet, questions, 'manager')
  }
  return withSelfReviewBlind(visible, viewerEmployeeId, access)
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
