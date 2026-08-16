import { NOTIFICATION_EVENTS } from './catalogue'
import { emitNotification } from './store'

export type GoalReminderRecipient = {
  id: string
  name: string
}

/** Shared command for future single-recipient and mass-reminder UI. */
export function sendGoalSubmissionReminder({
  senderId,
  senderName,
  recipients,
  cycleId,
  cycleName,
  deadline,
  message,
}: {
  senderId: string
  senderName: string
  recipients: GoalReminderRecipient[]
  cycleId: string
  cycleName: string
  deadline: string
  message?: string
}): number {
  for (const recipient of recipients) {
    emitNotification({
      eventKey: NOTIFICATION_EVENTS.GOAL_MANUAL_REMINDER,
      recipientId: recipient.id,
      actorId: senderId,
      dedupeKey: `goal-manual-reminder:${cycleId}:${recipient.id}:${Date.now()}`,
      destination: `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(recipient.id)}`,
      cycleId,
      personId: recipient.id,
      dueAt: deadline,
      variables: {
        manager: senderName,
        message: message?.trim() || 'Please complete your goals.',
        cycle: cycleName,
        deadline,
      },
    })
  }
  return recipients.length
}
