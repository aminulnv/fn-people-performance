import { NOTIFICATION_EVENTS } from './catalogue'
import { emitNotifications } from './store'

export type NotificationRecipient = {
  id: string
  name: string
}

/** In-browser notify is for a targeted list, not the whole directory. */
const MAX_INLINE_DEADLINE_RECIPIENTS = 25

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
  if (
    !oldDate ||
    !newDate ||
    oldDate === newDate ||
    recipients.length === 0 ||
    recipients.length > MAX_INLINE_DEADLINE_RECIPIENTS
  ) {
    return
  }
  emitNotifications(
    recipients.map((recipient) => ({
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
    })),
  )
}
