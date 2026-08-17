import { NOTIFICATION_EVENTS } from './catalogue'
import { emitNotification } from './store'

export type NotificationRecipient = {
  id: string
  name: string
}

export function notifyReviewDeadlineChanged({
  actorId,
  cycleId,
  cycleName,
  stage,
  oldDate,
  newDate,
  recipients,
}: {
  actorId?: string
  cycleId: string
  cycleName: string
  stage: string
  oldDate: string
  newDate: string
  recipients: NotificationRecipient[]
}): void {
  if (!oldDate || !newDate || oldDate === newDate) return
  for (const recipient of recipients) {
    emitNotification({
      eventKey: NOTIFICATION_EVENTS.REVIEW_DEADLINE_UPDATED,
      recipientId: recipient.id,
      actorId,
      dedupeKey: `review-deadline:${cycleId}:${stage}:${newDate}:${recipient.id}`,
      destination: `/cycles/${encodeURIComponent(cycleId)}/settings`,
      cycleId,
      variables: {
        cycle: cycleName,
        stage,
        oldDate,
        newDate,
      },
    })
  }
}
