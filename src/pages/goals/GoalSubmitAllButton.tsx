import { useId, useState } from 'react'
import { Send } from 'lucide-react'
import { ConfirmDialog, Tooltip } from '@/components/ui'
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
  onSubmit,
}: {
  status: SubmissionStatus
  busy: boolean
  reasons?: string[]
  blockers?: SubmitGoalBlocker[]
  warning?: string | null
  onSubmit: () => void
}) {
  const [warningOpen, setWarningOpen] = useState(false)
  const hintId = useId()
  const hints = blockers
    ? submitHoverHints(blockers)
    : reasons ?? []
  const blocked = hints.length > 0 ? hints.join(' ') : undefined
  const isResubmit = status === 'sent_back'
  const actionLabel = isResubmit ? 'Resubmit All' : 'Submit All'
  const disabled = busy || Boolean(blocked)

  const requestSubmit = () => {
    if (warning) {
      setWarningOpen(true)
      return
    }
    onSubmit()
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
      <ConfirmDialog
        open={warningOpen}
        title={`${isResubmit ? 'Resubmit' : 'Submit'} these goals?`}
        description={warning ?? undefined}
        confirmLabel={isResubmit ? 'Resubmit anyway' : 'Submit anyway'}
        cancelLabel="Review goals"
        onClose={() => setWarningOpen(false)}
        onConfirm={() => {
          setWarningOpen(false)
          onSubmit()
        }}
      />
    </>
  )
}
