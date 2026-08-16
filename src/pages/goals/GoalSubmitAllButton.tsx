import { Send } from 'lucide-react'
import type { SubmissionStatus } from '@/lib/goals/types'

export function submitBlockedReason(reasons: string[]): string | undefined {
  return reasons.length > 0 ? reasons.join(' ') : undefined
}

export function GoalSubmitAllButton({
  status,
  busy,
  reasons,
  onSubmit,
}: {
  status: SubmissionStatus
  busy: boolean
  reasons: string[]
  onSubmit: () => void
}) {
  const blocked = submitBlockedReason(reasons)
  const isResubmit = status === 'sent_back'
  return (
    <button
      type="button"
      className="pd-people__ghost-btn pd-people__ghost-btn--primary"
      disabled={busy || Boolean(blocked)}
      title={blocked}
      onClick={onSubmit}
    >
      <Send size={16} strokeWidth={1.75} aria-hidden />
      {isResubmit ? 'Resubmit All' : 'Submit All'}
    </button>
  )
}
