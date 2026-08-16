import { Check } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { SubmissionStatus } from '@/lib/goals/types'
import { statusLabel, statusVariant } from './statusLabels'

export function GoalApprovalStatus({
  status,
  checkClassName = 'pd-goals-overview__check',
}: {
  status: SubmissionStatus
  checkClassName?: string
}) {
  if (status === 'approved') {
    return (
      <span className={checkClassName} aria-label="Approved">
        <Check size={14} strokeWidth={2.5} aria-hidden />
      </span>
    )
  }
  if (status === 'submitted') {
    return <Badge variant="pending">Pending</Badge>
  }
  if (status === 'draft') {
    return <span className="pd-goals-overview__muted">—</span>
  }
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
}
