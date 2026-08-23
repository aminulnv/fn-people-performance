import { useState } from 'react'
import { Send } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui'
import type { SubmissionStatus } from '@/lib/goals/types'

export function submitBlockedReason(reasons: string[]): string | undefined {
  return reasons.length > 0 ? reasons.join(' ') : undefined
}

export function GoalSubmitAllButton({
  status,
  busy,
  reasons,
  warning,
  onSubmit,
}: {
  status: SubmissionStatus
  busy: boolean
  reasons: string[]
  warning?: string | null
  onSubmit: () => void
}) {
  const [warningOpen, setWarningOpen] = useState(false)
  const blocked = submitBlockedReason(reasons)
  const isResubmit = status === 'sent_back'
  const actionLabel = isResubmit ? 'Resubmit All' : 'Submit All'

  const requestSubmit = () => {
    if (warning) {
      setWarningOpen(true)
      return
    }
    onSubmit()
  }

  return (
    <>
      <button
        type="button"
        className="pd-people__ghost-btn pd-people__ghost-btn--success"
        disabled={busy || Boolean(blocked)}
        title={blocked}
        onClick={requestSubmit}
      >
        <Send size={16} strokeWidth={1.75} aria-hidden />
        {actionLabel}
      </button>
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
