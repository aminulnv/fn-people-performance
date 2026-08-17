import type { BadgeVariant } from '@/components/ui'
import type { DemoPhase, SubmissionStatus } from '@/lib/goalsApi'

export function statusLabel(status: SubmissionStatus): string {
  switch (status) {
    case 'not_eligible':
      return 'Not eligible'
    case 'draft':
      return 'Draft'
    case 'submitted':
      return 'Pending approval'
    case 'sent_back':
      return 'Sent back'
    case 'approved':
      return 'Approved'
    case 'incomplete':
      return 'Incomplete'
    default:
      return status
  }
}

/**
 * People with no submission are stored as `draft`, so the raw label claims a
 * draft exists before anyone has written a goal. Prefer this wherever the goal
 * count is known.
 */
export function submissionStatusLabel(
  status: SubmissionStatus,
  goalCount: number,
): string {
  if (goalCount === 0 && status === 'draft') return 'Not started'
  return statusLabel(status)
}

export function statusVariant(status: SubmissionStatus): BadgeVariant {
  switch (status) {
    case 'approved':
      return 'completed'
    case 'submitted':
      return 'pending'
    case 'sent_back':
      return 'in-progress'
    case 'incomplete':
    case 'not_eligible':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function phaseLabel(phase: DemoPhase): string {
  switch (phase) {
    case 'not_open':
      return 'Not open'
    case 'window_open':
      return 'Window open'
    case 'hard_lock':
      return 'Hard lock'
    case 'check_in':
      return 'Check-in'
    case 'closed':
      return 'Closed'
  }
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
