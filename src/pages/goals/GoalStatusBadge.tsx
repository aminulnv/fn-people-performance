import type { ReactNode } from 'react'
import {
  Ban,
  Check,
  CircleAlert,
  Clock3,
  FilePenLine,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import type { SubmissionStatus } from '@/lib/goals/types'
import { statusVariant } from './statusLabels'

const STATUS_ICONS: Record<SubmissionStatus, LucideIcon> = {
  not_eligible: Ban,
  draft: FilePenLine,
  submitted: Clock3,
  sent_back: Undo2,
  approved: Check,
  incomplete: CircleAlert,
}

export function GoalStatusBadge({
  status,
  children,
  className,
}: {
  status: SubmissionStatus
  children: ReactNode
  className?: string
}) {
  const StatusIcon = STATUS_ICONS[status]

  return (
    <Badge variant={statusVariant(status)} className={className}>
      <StatusIcon size={11} strokeWidth={2.4} aria-hidden />
      {children}
    </Badge>
  )
}
