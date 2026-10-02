import {
  completeNotificationAction,
  emitRuleNotification,
  supersedeNotification,
} from './emitFromRule.mjs'

function goalDestination(cycleId, personId) {
  return `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(personId)}`
}

function approvalTaskKey(cycleId, personId, stage) {
  return `goal-approval:${cycleId}:${personId}:${stage}`
}

async function loadEmployee(client, employeeId) {
  const id = Number(employeeId)
  if (!Number.isInteger(id) || id <= 0) return null
  const { rows } = await client.query(
    `SELECT
       e.employee_id,
       e.name,
       e.email,
       e.reports_to_employee_id,
       e.status,
       e.join_date
     FROM platform.employees e
     WHERE e.employee_id = $1`,
    [id],
  )
  return rows[0] ?? null
}

async function loadCycleLabel(client, cycleId) {
  const { rows } = await client.query(
    `SELECT name FROM platform.review_cycles WHERE id = $1`,
    [cycleId],
  )
  return rows[0]?.name ?? cycleId
}

async function managerLineRecipientIds(client, managerId) {
  const id = Number(managerId)
  if (!Number.isInteger(id) || id <= 0) return []
  // Manager + anyone actively covering them.
  const { rows } = await client.query(
    `SELECT DISTINCT delegate_employee_id AS employee_id
     FROM platform.manager_delegations
     WHERE absent_employee_id = $1
       AND revoked_at IS NULL
       AND starts_at <= now()
       AND ends_at >= now()`,
    [id],
  )
  const ids = new Set([id, ...rows.map((row) => Number(row.employee_id))])
  return [...ids].filter((value) => Number.isInteger(value) && value > 0)
}

async function emitToManagerLine(client, managerId, input) {
  for (const recipientId of await managerLineRecipientIds(client, managerId)) {
    await emitRuleNotification(client, {
      ...input,
      recipientEmployeeId: recipientId,
    })
  }
}

async function completeApprovalLine(client, managerId, actorId, dedupeKey) {
  const ids = new Set([
    Number(actorId),
    ...(await managerLineRecipientIds(client, managerId)),
  ])
  for (const id of ids) {
    if (Number.isInteger(id) && id > 0) {
      await completeNotificationAction(client, id, dedupeKey)
    }
  }
}

/**
 * After submit — notify manager line (and complete prior send-back action).
 */
export async function notifyGoalSubmitted(client, {
  cycleId,
  employeeId,
  actorEmployeeId,
  actorName,
  goalCount,
  previousStatus,
  isLate,
  dueAt,
}) {
  const subject = await loadEmployee(client, employeeId)
  if (!subject?.reports_to_employee_id) return
  await completeNotificationAction(
    client,
    employeeId,
    `goal-sent-back:${cycleId}:${employeeId}`,
  )
  const manager = await loadEmployee(client, subject.reports_to_employee_id)
  const skip = manager?.reports_to_employee_id
    ? await loadEmployee(client, manager.reports_to_employee_id)
    : null
  const cycleLabel = await loadCycleLabel(client, cycleId)
  const eventKey = isLate
    ? 'goal.late_submitted'
    : previousStatus === 'sent_back'
      ? 'goal.resubmitted'
      : 'goal.submitted'

  await emitToManagerLine(client, manager.employee_id, {
    eventKey,
    actorEmployeeId,
    dedupeKey: approvalTaskKey(cycleId, employeeId, 'manager'),
    destination: goalDestination(cycleId, employeeId),
    cycleId,
    personId: employeeId,
    dueAt: dueAt ?? null,
    variables: {
      employee: subject.name,
      count: goalCount,
      cycle: cycleLabel,
      skipLevelManager: skip?.name ?? 'their skip-level manager',
      manager: actorName ?? manager.name,
    },
    metadata: { approvalStage: 'manager', isLate: Boolean(isLate) },
  })
}

export async function notifyGoalsEditedByManager(client, {
  cycleId,
  employeeId,
  actorEmployeeId,
  actorName,
}) {
  if (Number(actorEmployeeId) === Number(employeeId)) return
  const cycleLabel = await loadCycleLabel(client, cycleId)
  await emitRuleNotification(client, {
    eventKey: 'goal.manager_edited',
    recipientEmployeeId: employeeId,
    actorEmployeeId,
    dedupeKey: `goal-manager-edit:${cycleId}:${employeeId}`,
    destination: goalDestination(cycleId, employeeId),
    cycleId,
    personId: employeeId,
    variables: {
      manager: actorName ?? 'Your manager',
      cycle: cycleLabel,
    },
  })
}

export async function notifyGoalApproved(client, {
  cycleId,
  employeeId,
  actorEmployeeId,
  actorName,
  previousStage,
  nextStatus,
  nextStage,
}) {
  const subject = await loadEmployee(client, employeeId)
  if (!subject) return
  const manager = subject.reports_to_employee_id
    ? await loadEmployee(client, subject.reports_to_employee_id)
    : null
  const cycleLabel = await loadCycleLabel(client, cycleId)
  const actorStage =
    previousStage === 'manager_manager' ? 'manager_manager' : 'manager'
  await completeApprovalLine(
    client,
    actorStage === 'manager_manager'
      ? manager?.reports_to_employee_id
      : manager?.employee_id,
    actorEmployeeId,
    approvalTaskKey(cycleId, employeeId, actorStage),
  )

  if (previousStage === 'manager' && nextStage === 'manager_manager') {
    const skipId = manager?.reports_to_employee_id
    if (!skipId) return
    const skip = await loadEmployee(client, skipId)
    await emitToManagerLine(client, skipId, {
      eventKey: 'goal.final_approval_requested',
      actorEmployeeId,
      dedupeKey: approvalTaskKey(cycleId, employeeId, 'manager_manager'),
      destination: goalDestination(cycleId, employeeId),
      cycleId,
      personId: employeeId,
      variables: {
        manager: actorName ?? manager?.name ?? 'Manager',
        employee: subject.name,
        cycle: cycleLabel,
      },
      metadata: { approvalStage: 'manager_manager', isLate: true },
    })
    await emitRuleNotification(client, {
      eventKey: 'goal.pending_final_approval',
      recipientEmployeeId: employeeId,
      actorEmployeeId,
      dedupeKey: `goal-pending-final:${cycleId}:${employeeId}`,
      destination: goalDestination(cycleId, employeeId),
      cycleId,
      personId: employeeId,
      variables: {
        manager: actorName ?? manager?.name ?? 'Manager',
        skipLevelManager: skip?.name ?? 'your skip-level manager',
      },
    })
    return
  }

  if (nextStatus !== 'approved') return
  const isFinal = previousStage === 'manager_manager'
  if (isFinal) {
    await supersedeNotification(
      client,
      employeeId,
      `goal-pending-final:${cycleId}:${employeeId}`,
    )
  }
  await emitRuleNotification(client, {
    eventKey: isFinal ? 'goal.final_approved' : 'goal.approved',
    recipientEmployeeId: employeeId,
    actorEmployeeId,
    dedupeKey: `goal-approved:${cycleId}:${employeeId}`,
    destination: goalDestination(cycleId, employeeId),
    cycleId,
    personId: employeeId,
    variables: {
      manager: actorName ?? 'Manager',
      skipLevelManager: actorName ?? 'Manager',
      cycle: cycleLabel,
    },
  })
  if (
    isFinal &&
    manager &&
    Number(manager.employee_id) !== Number(actorEmployeeId)
  ) {
    await emitToManagerLine(client, manager.employee_id, {
      eventKey: 'goal.final_approved.manager',
      actorEmployeeId,
      dedupeKey: `goal-final-approved-manager:${cycleId}:${employeeId}`,
      destination: goalDestination(cycleId, employeeId),
      cycleId,
      personId: employeeId,
      variables: {
        employee: subject.name,
        skipLevelManager: actorName ?? 'Skip-level manager',
        cycle: cycleLabel,
      },
    })
  }
}

export async function notifyGoalSentBack(client, {
  cycleId,
  employeeId,
  actorEmployeeId,
  actorName,
  previousStage,
  reason,
}) {
  const subject = await loadEmployee(client, employeeId)
  if (!subject) return
  const isFinal = previousStage === 'manager_manager'
  if (isFinal) {
    await supersedeNotification(
      client,
      employeeId,
      `goal-pending-final:${cycleId}:${employeeId}`,
    )
  }
  const manager = subject.reports_to_employee_id
    ? await loadEmployee(client, subject.reports_to_employee_id)
    : null
  const actorStage = isFinal ? 'manager_manager' : 'manager'
  await completeApprovalLine(
    client,
    isFinal ? manager?.reports_to_employee_id : manager?.employee_id,
    actorEmployeeId,
    approvalTaskKey(cycleId, employeeId, actorStage),
  )
  const cycleLabel = await loadCycleLabel(client, cycleId)
  await emitRuleNotification(client, {
    eventKey: isFinal ? 'goal.final_sent_back' : 'goal.sent_back',
    recipientEmployeeId: employeeId,
    actorEmployeeId,
    dedupeKey: `goal-sent-back:${cycleId}:${employeeId}`,
    destination: goalDestination(cycleId, employeeId),
    cycleId,
    personId: employeeId,
    variables: {
      approver: actorName ?? 'Manager',
      skipLevelManager: actorName ?? 'Manager',
      cycle: cycleLabel,
      reason: reason || 'Please revise and resubmit.',
    },
  })
  if (
    isFinal &&
    manager &&
    Number(manager.employee_id) !== Number(actorEmployeeId)
  ) {
    await emitToManagerLine(client, manager.employee_id, {
      eventKey: 'goal.final_sent_back.manager',
      actorEmployeeId,
      dedupeKey: `goal-final-sent-back-manager:${cycleId}:${employeeId}`,
      destination: goalDestination(cycleId, employeeId),
      cycleId,
      personId: employeeId,
      variables: {
        employee: subject.name,
        skipLevelManager: actorName ?? 'Skip-level manager',
        cycle: cycleLabel,
      },
    })
  }
}

export async function notifyGoalCascaded(client, {
  cycleId,
  recipientEmployeeId,
  actorEmployeeId,
  actorName,
  goalId,
  sourceEmployeeName,
}) {
  if (Number(actorEmployeeId) === Number(recipientEmployeeId)) return
  const cycleLabel = await loadCycleLabel(client, cycleId)
  await emitRuleNotification(client, {
    eventKey: 'goal.cascaded',
    recipientEmployeeId,
    actorEmployeeId,
    dedupeKey: `goal-cascaded:${cycleId}:${recipientEmployeeId}:${goalId}`,
    destination: `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(recipientEmployeeId)}/${encodeURIComponent(goalId)}`,
    cycleId,
    personId: recipientEmployeeId,
    goalId,
    variables: {
      manager: actorName ?? sourceEmployeeName ?? 'A manager',
      cycle: cycleLabel,
    },
  })
}

export async function listWriteAllAdminEmployeeIds(client) {
  const { rows } = await client.query(
    `SELECT DISTINCT eap.employee_id
     FROM platform.employee_access_profiles eap
     INNER JOIN platform.access_profile_permissions app
       ON app.profile_key = eap.profile_key
     INNER JOIN platform.employees e
       ON e.employee_id = eap.employee_id
     WHERE app.permission_key = 'platform.write_all'
       AND e.status = 'active'`,
  )
  return rows
    .map((row) => Number(row.employee_id))
    .filter((id) => Number.isInteger(id) && id > 0)
}
