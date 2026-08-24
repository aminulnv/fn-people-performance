import type { ReactNode } from 'react'
import { Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { SubmissionStatus } from '@/lib/goals/types'
import { statusVariant } from './statusLabels'

export function GoalStatusBadge({
  status,
  children,
  className,
}: {
  status: SubmissionStatus
  children: ReactNode
  className?: string
}) {
  return (
    <Badge variant={statusVariant(status)} className={className}>
      {status === 'sent_back' ? (
        <Undo2 size={11} strokeWidth={2.4} aria-hidden />
      ) : null}
      {children}
    </Badge>
  )
}
