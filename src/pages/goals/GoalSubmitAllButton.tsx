import { useId, useState } from 'react'
import { Send } from 'lucide-react'
import { Button, ConfirmDialog, Modal, Textarea, Tooltip } from '@/components/ui'
import type { SubmissionStatus } from '@/lib/goals/types'
import {
  submitHoverHints,
  type SubmitGoalBlocker,
} from '@/lib/goals/weightage'

export function submitBlockedReason(reasons: string[]): string | undefined {
  return reasons.length > 0 ? reasons.join(' ') : undefined
}

function SubmitBlockedTip({
  actionLabel,
  hints,
}: {
  actionLabel: string
  hints: string[]
}) {
  if (hints.length === 1) return hints[0]
  return (
    <ul className="pd-goals-submit-tip" aria-label={`Fix before you ${actionLabel.toLowerCase()}`}>
      {hints.map((hint) => (
        <li key={hint}>{hint}</li>
      ))}
    </ul>
  )
}

export function GoalSubmitAllButton({
  status,
  busy,
  reasons,
  blockers,
  warning,
  requiresLateJustification = false,
  initialLateJustification = '',
  onSubmit,
}: {
  status: SubmissionStatus
  busy: boolean
  reasons?: string[]
  blockers?: SubmitGoalBlocker[]
  warning?: string | null
  requiresLateJustification?: boolean
  initialLateJustification?: string
  onSubmit: (lateJustification?: string) => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [justification, setJustification] = useState(initialLateJustification)
  const hintId = useId()
  const hints = blockers
    ? submitHoverHints(blockers)
    : reasons ?? []
  const blocked = hints.length > 0 ? hints.join(' ') : undefined
  const isResubmit = status === 'sent_back'
  const actionLabel = isResubmit ? 'Resubmit All' : 'Submit All'
  const disabled = busy || Boolean(blocked)
  const needsDialog = Boolean(warning) || requiresLateJustification
  const canConfirmLate = justification.trim().length > 0

  const closeDialog = () => setDialogOpen(false)

  const requestSubmit = () => {
    if (needsDialog) {
      setJustification(initialLateJustification)
      setDialogOpen(true)
      return
    }
    onSubmit()
  }

  const confirmSubmit = (lateJustification?: string) => {
    closeDialog()
    onSubmit(lateJustification)
  }

  const button = (
    <>
      <button
        type="button"
        className="pd-people__ghost-btn pd-people__ghost-btn--success"
        disabled={disabled}
        aria-describedby={blocked ? hintId : undefined}
        onClick={requestSubmit}
      >
        <Send size={16} strokeWidth={1.75} aria-hidden />
        {actionLabel}
      </button>
      {blocked ? (
        <span id={hintId} className="pd-sr-only">
          {blocked}
        </span>
      ) : null}
    </>
  )

  return (
    <>
      {blocked ? (
        <Tooltip
          content={<SubmitBlockedTip actionLabel={actionLabel} hints={hints} />}
          side="bottom"
          portal
          delayMs={80}
          className="pd-goals-submit-all"
        >
          <span tabIndex={0}>{button}</span>
        </Tooltip>
      ) : (
        button
      )}
      {requiresLateJustification ? (
        <Modal
          open={dialogOpen}
          onClose={closeDialog}
          title={`${isResubmit ? 'Resubmit' : 'Submit'} after the deadline?`}
          description={
            warning
              ? `${warning} These goals are past the deadline. Explain why they are late — your manager and skip-level manager will see this.`
              : 'These goals are past the deadline. Explain why they are late — your manager and skip-level manager will see this.'
          }
          actions={
            <>
              <Button variant="secondary" onClick={closeDialog}>
                Review Goals
              </Button>
              <Button
                variant="primary"
                disabled={!canConfirmLate}
                onClick={() => confirmSubmit(justification.trim())}
              >
                {isResubmit ? 'Resubmit Late Goals' : 'Submit Late Goals'}
              </Button>
            </>
          }
        >
          <Textarea
            label="Why are these goals late?"
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            placeholder="For example, I was on leave until last week"
            rows={3}
            required
          />
        </Modal>
      ) : (
        <ConfirmDialog
          open={dialogOpen}
          title={`${isResubmit ? 'Resubmit' : 'Submit'} these goals?`}
          description={warning ?? undefined}
          confirmLabel={isResubmit ? 'Resubmit Anyway' : 'Submit Anyway'}
          cancelLabel="Review Goals"
          onClose={closeDialog}
          onConfirm={() => confirmSubmit()}
        />
      )}
    </>
  )
}
