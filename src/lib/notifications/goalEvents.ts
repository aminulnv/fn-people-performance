import type {
  DemoPerson,
  Goal,
  GoalsSnapshot,
  PersonGoals,
} from '@/lib/goals/types'
import { NOTIFICATION_EVENTS } from './catalogue'
import {
  completeNotificationAction,
  emitNotification,
  supersedeNotification,
} from './store'

type GoalEventContext = {
  snapshot: GoalsSnapshot
  actor: DemoPerson
  subject: DemoPerson
}

function goalDestination(cycleId: string, personId: string): string {
  return `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(personId)}`
}

function specificGoalDestination(
  cycleId: string,
  personId: string,
  goalId: string,
): string {
  return `${goalDestination(cycleId, personId)}/${encodeURIComponent(goalId)}`
}

function personById(snapshot: GoalsSnapshot, id?: string): DemoPerson | null {
  if (!id) return null
  return snapshot.people.find((person) => person.id === id) ?? null
}

function approvalTaskKey(
  cycleId: string,
  personId: string,
  stage: 'manager' | 'manager_manager',
): string {
  return `goal-approval:${cycleId}:${personId}:${stage}`
}

export function notifyGoalSubmitted({
  snapshot,
  actor,
  subject,
  previousStatus,
  row,
}: GoalEventContext & {
  previousStatus: PersonGoals['status']
  row: PersonGoals
}): void {
  completeNotificationAction(
    subject.id,
    `goal-sent-back:${snapshot.cycle.id}:${subject.id}`,
  )
  const manager = personById(snapshot, subject.managerId)
  if (!manager) return
  const skipLevelManager = personById(snapshot, manager.managerId)
  const isLate = row.postWindowApprovalStage === 'manager'
  const isResubmission = previousStatus === 'sent_back'
  const eventKey = isLate
    ? NOTIFICATION_EVENTS.GOAL_LATE_SUBMITTED
    : isResubmission
      ? NOTIFICATION_EVENTS.GOAL_RESUBMITTED
      : NOTIFICATION_EVENTS.GOAL_SUBMITTED

  emitNotification(
    {
      eventKey,
      recipientId: manager.id,
      actorId: actor.id,
      dedupeKey: approvalTaskKey(snapshot.cycle.id, subject.id, 'manager'),
      destination: goalDestination(snapshot.cycle.id, subject.id),
      cycleId: snapshot.cycle.id,
      personId: subject.id,
      dueAt: snapshot.cycle.goalWindow?.endDate,
      variables: {
        employee: subject.name,
        count: row.goals.length,
        cycle: snapshot.cycle.label,
        skipLevelManager: skipLevelManager?.name ?? 'their skip-level manager',
      },
      metadata: { approvalStage: 'manager', isLate },
    },
    { duplicate: 'reopen' },
  )
}

export function notifyGoalChangesRequireApproval({
  snapshot,
  actor,
  subject,
  row,
}: GoalEventContext & { row: PersonGoals }): void {
  const manager = personById(snapshot, subject.managerId)
  if (!manager) return
  emitNotification(
    {
      eventKey: NOTIFICATION_EVENTS.GOAL_CHANGES_REQUIRE_APPROVAL,
      recipientId: manager.id,
      actorId: actor.id,
      dedupeKey: approvalTaskKey(snapshot.cycle.id, subject.id, 'manager'),
      destination: goalDestination(snapshot.cycle.id, subject.id),
      cycleId: snapshot.cycle.id,
      personId: subject.id,
      dueAt: snapshot.cycle.goalWindow?.endDate,
      variables: {
        employee: subject.name,
        cycle: snapshot.cycle.label,
      },
      metadata: {
        approvalStage: 'manager',
        isLate: row.postWindowApprovalStage === 'manager',
      },
    },
    { duplicate: 'reopen' },
  )
}

export function withdrawGoalApprovalRequests({
  snapshot,
  subject,
}: Pick<GoalEventContext, 'snapshot' | 'subject'>): void {
  const manager = personById(snapshot, subject.managerId)
  if (manager) {
    supersedeNotification(
      manager.id,
      approvalTaskKey(snapshot.cycle.id, subject.id, 'manager'),
    )
    const skipLevelManager = personById(snapshot, manager.managerId)
    if (skipLevelManager) {
      supersedeNotification(
        skipLevelManager.id,
        approvalTaskKey(snapshot.cycle.id, subject.id, 'manager_manager'),
      )
    }
  }
  supersedeNotification(
    subject.id,
    `goal-pending-final:${snapshot.cycle.id}:${subject.id}`,
  )
}

export function notifyGoalsEditedByManager({
  snapshot,
  actor,
  subject,
}: GoalEventContext): void {
  if (actor.id === subject.id) return
  emitNotification(
    {
      eventKey: NOTIFICATION_EVENTS.GOAL_MANAGER_EDITED,
      recipientId: subject.id,
      actorId: actor.id,
      dedupeKey: `goal-manager-edit:${snapshot.cycle.id}:${subject.id}`,
      destination: goalDestination(snapshot.cycle.id, subject.id),
      cycleId: snapshot.cycle.id,
      personId: subject.id,
      variables: {
        manager: actor.name,
        cycle: snapshot.cycle.label,
      },
    },
    { duplicate: 'refresh' },
  )
}

export function notifyGoalApproved({
  snapshot,
  actor,
  subject,
  previousRow,
}: GoalEventContext & { previousRow: PersonGoals }): void {
  const manager = personById(snapshot, subject.managerId)
  const previousStage = previousRow.postWindowApprovalStage
  const actorStage =
    previousStage === 'manager_manager' ? 'manager_manager' : 'manager'
  completeNotificationAction(
    actor.id,
    approvalTaskKey(snapshot.cycle.id, subject.id, actorStage),
  )

  if (previousStage === 'manager') {
    const skipLevelManager = personById(snapshot, manager?.managerId)
    if (!skipLevelManager) return
    emitNotification({
      eventKey: NOTIFICATION_EVENTS.GOAL_FINAL_APPROVAL_REQUESTED,
      recipientId: skipLevelManager.id,
      actorId: actor.id,
      dedupeKey: approvalTaskKey(
        snapshot.cycle.id,
        subject.id,
        'manager_manager',
      ),
      destination: goalDestination(snapshot.cycle.id, subject.id),
      cycleId: snapshot.cycle.id,
      personId: subject.id,
      variables: {
        manager: actor.name,
        employee: subject.name,
        cycle: snapshot.cycle.label,
      },
      metadata: { approvalStage: 'manager_manager', isLate: true },
    })
    emitNotification({
      eventKey: NOTIFICATION_EVENTS.GOAL_PENDING_FINAL_APPROVAL,
      recipientId: subject.id,
      actorId: actor.id,
      dedupeKey: `goal-pending-final:${snapshot.cycle.id}:${subject.id}`,
      destination: goalDestination(snapshot.cycle.id, subject.id),
      cycleId: snapshot.cycle.id,
      personId: subject.id,
      variables: {
        manager: actor.name,
        skipLevelManager: skipLevelManager.name,
      },
    })
    return
  }

  const isFinalApproval = previousStage === 'manager_manager'
  if (isFinalApproval) {
    supersedeNotification(
      subject.id,
      `goal-pending-final:${snapshot.cycle.id}:${subject.id}`,
    )
  }
  emitNotification({
    eventKey: isFinalApproval
      ? NOTIFICATION_EVENTS.GOAL_FINAL_APPROVED
      : NOTIFICATION_EVENTS.GOAL_APPROVED,
    recipientId: subject.id,
    actorId: actor.id,
    dedupeKey: `goal-approved:${snapshot.cycle.id}:${subject.id}`,
    destination: goalDestination(snapshot.cycle.id, subject.id),
    cycleId: snapshot.cycle.id,
    personId: subject.id,
    variables: {
      manager: actor.name,
      skipLevelManager: actor.name,
      cycle: snapshot.cycle.label,
    },
  })

  if (isFinalApproval && manager && manager.id !== actor.id) {
    emitNotification({
      eventKey: NOTIFICATION_EVENTS.GOAL_FINAL_APPROVED_MANAGER,
      recipientId: manager.id,
      actorId: actor.id,
      dedupeKey: `goal-final-approved-manager:${snapshot.cycle.id}:${subject.id}`,
      destination: goalDestination(snapshot.cycle.id, subject.id),
      cycleId: snapshot.cycle.id,
      personId: subject.id,
      variables: {
        employee: subject.name,
        skipLevelManager: actor.name,
        cycle: snapshot.cycle.label,
      },
    })
  }
}

export function notifyGoalSentBack({
  snapshot,
  actor,
  subject,
  previousRow,
  reason,
}: GoalEventContext & {
  previousRow: PersonGoals
  reason: string
}): void {
  const isFinal = previousRow.postWindowApprovalStage === 'manager_manager'
  if (isFinal) {
    supersedeNotification(
      subject.id,
      `goal-pending-final:${snapshot.cycle.id}:${subject.id}`,
    )
  }
  const actorStage = isFinal ? 'manager_manager' : 'manager'
  completeNotificationAction(
    actor.id,
    approvalTaskKey(snapshot.cycle.id, subject.id, actorStage),
  )

  emitNotification({
    eventKey: isFinal
      ? NOTIFICATION_EVENTS.GOAL_FINAL_SENT_BACK
      : NOTIFICATION_EVENTS.GOAL_SENT_BACK,
    recipientId: subject.id,
    actorId: actor.id,
    dedupeKey: `goal-sent-back:${snapshot.cycle.id}:${subject.id}`,
    destination: goalDestination(snapshot.cycle.id, subject.id),
    cycleId: snapshot.cycle.id,
    personId: subject.id,
    variables: {
      approver: actor.name,
      skipLevelManager: actor.name,
      cycle: snapshot.cycle.label,
      reason,
    },
  })

  const manager = personById(snapshot, subject.managerId)
  if (isFinal && manager && manager.id !== actor.id) {
    emitNotification({
      eventKey: NOTIFICATION_EVENTS.GOAL_FINAL_SENT_BACK_MANAGER,
      recipientId: manager.id,
      actorId: actor.id,
      dedupeKey: `goal-final-sent-back-manager:${snapshot.cycle.id}:${subject.id}`,
      destination: goalDestination(snapshot.cycle.id, subject.id),
      cycleId: snapshot.cycle.id,
      personId: subject.id,
      variables: {
        employee: subject.name,
        skipLevelManager: actor.name,
        cycle: snapshot.cycle.label,
      },
    })
  }
}

export function notifyGoalProgressAdjusted({
  snapshot,
  actor,
  subject,
  changedGoalCount,
}: GoalEventContext & { changedGoalCount: number }): void {
  if (actor.id === subject.id || changedGoalCount === 0) return
  emitNotification(
    {
      eventKey: NOTIFICATION_EVENTS.GOAL_PROGRESS_ADJUSTED,
      recipientId: subject.id,
      actorId: actor.id,
      dedupeKey: `goal-progress-adjusted:${snapshot.cycle.id}:${subject.id}`,
      destination: goalDestination(snapshot.cycle.id, subject.id),
      cycleId: snapshot.cycle.id,
      personId: subject.id,
      variables: {
        manager: actor.name,
        count: changedGoalCount,
      },
    },
    { duplicate: 'refresh' },
  )
}

export function notifyGoalCheckInCompleted({
  snapshot,
  actor,
  subject,
}: GoalEventContext): void {
  emitNotification({
    eventKey: NOTIFICATION_EVENTS.GOAL_CHECK_IN_COMPLETED,
    recipientId: subject.id,
    actorId: actor.id,
    dedupeKey: `goal-check-in:${snapshot.cycle.id}:${subject.id}`,
    destination: goalDestination(snapshot.cycle.id, subject.id),
    cycleId: snapshot.cycle.id,
    personId: subject.id,
    variables: {
      manager: actor.name,
      cycle: snapshot.cycle.label,
    },
  })
}

export function notifyGoalHardLock(
  snapshot: GoalsSnapshot,
  subject: DemoPerson,
): void {
  emitNotification({
    eventKey: NOTIFICATION_EVENTS.GOAL_DEADLINE_CLOSED,
    recipientId: subject.id,
    dedupeKey: `goal-deadline-closed:${snapshot.cycle.id}:${subject.id}`,
    destination: goalDestination(snapshot.cycle.id, subject.id),
    cycleId: snapshot.cycle.id,
    personId: subject.id,
    variables: {
      cycle: snapshot.cycle.label,
      deadline: snapshot.cycle.goalWindow?.endDate ?? 'the deadline',
    },
  })
}

export function notifyGoalCascaded({
  snapshot,
  actor,
  subject,
  goal,
}: GoalEventContext & { goal: Goal }): void {
  emitNotification({
    eventKey: NOTIFICATION_EVENTS.GOAL_CASCADED,
    recipientId: subject.id,
    actorId: actor.id,
    dedupeKey: `goal-cascaded:${snapshot.cycle.id}:${subject.id}:${goal.id}`,
    destination: specificGoalDestination(snapshot.cycle.id, subject.id, goal.id),
    cycleId: snapshot.cycle.id,
    personId: subject.id,
    goalId: goal.id,
    variables: {
      manager: actor.name,
      goal: goal.description.trim() || 'Untitled goal',
      cycle: snapshot.cycle.label,
    },
  })
}
