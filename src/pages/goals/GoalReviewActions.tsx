import { useState } from 'react'
import { Check, Undo2 } from 'lucide-react'
import { Textarea } from '@/components/ui'

type GoalReviewActionsProps = {
  personName: string
  canApprove: boolean
  canSendBack: boolean
  busy: boolean
  sendBackReason: string
  onSendBackReason: (value: string) => void
  onApprove: () => void
  onSendBack: () => void
  /** Banner sits above a person's goal list; inline sits in a goal detail. */
  variant?: 'banner' | 'inline'
}

/**
 * Batch approve / send-back for one person's goals. Approval is per employee,
 * not per goal - same actions on the reports list and on that person's page.
 */
export function GoalReviewActions({
  personName,
  canApprove,
  canSendBack,
  busy,
  sendBackReason,
  onSendBackReason,
  onApprove,
  onSendBack,
  variant = 'banner',
}: GoalReviewActionsProps) {
  const [reasonOpen, setReasonOpen] = useState(false)

  if (!canApprove && !canSendBack) return null

  const buttons = (
    <div className="pd-goals__footer-actions">
      {canApprove ? (
        <button
          type="button"
          className="pd-people__ghost-btn pd-people__ghost-btn--success"
          disabled={busy}
          onClick={onApprove}
        >
          <Check size={16} strokeWidth={1.75} aria-hidden />
          Approve
        </button>
      ) : null}
      {canSendBack ? (
        <button
          type="button"
          className="pd-people__ghost-btn"
          disabled={busy}
          aria-expanded={reasonOpen}
          onClick={() => setReasonOpen((open) => !open)}
        >
          <Undo2 size={16} strokeWidth={1.75} aria-hidden />
          Send Back
        </button>
      ) : null}
    </div>
  )

  const reason = reasonOpen ? (
    <div className="pd-goals-approval__reason">
      <Textarea
        label="Send back reason"
        value={sendBackReason}
        onChange={(event) => onSendBackReason(event.target.value)}
        placeholder={`Tell ${personName} what to revise`}
        rows={2}
      />
      <div className="pd-goals__footer-actions">
        <button
          type="button"
          className="pd-people__ghost-btn"
          disabled={busy || !sendBackReason.trim()}
          onClick={() => {
            onSendBack()
            setReasonOpen(false)
          }}
        >
          Confirm Send Back
        </button>
      </div>
    </div>
  ) : null

  if (variant === 'inline') {
    return (
      <>
        {buttons}
        {reason}
      </>
    )
  }

  return (
    <section
      className="pd-goals-approval pd-goals-approval--subject"
      aria-label="Goal approval"
    >
      <div className="pd-goals-approval__head">
        <div className="pd-goals-approval__text">
          <span className="pd-goals-approval__name">
            Awaiting your approval
          </span>
          <span className="pd-goals-approval__sub">
            Approve all of {personName}&apos;s goals, or send the batch back.
          </span>
        </div>
        {buttons}
      </div>
      {reason}
    </section>
  )
}
