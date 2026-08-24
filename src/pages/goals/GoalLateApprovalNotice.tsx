import type { ReactNode } from 'react'
import { Clock } from 'lucide-react'
import type { PersonGoals } from '@/lib/goals/types'
import { PersonOrRole, type MentionPerson } from './PersonMention'

export type LateApprovalPerson = MentionPerson

/**
 * Employee-facing status for a goal set submitted after the deadline, naming
 * the people who still have to sign off rather than their roles.
 */
export function GoalLateApprovalNotice({
  stage,
  manager,
  skipLevelManager,
}: {
  stage: NonNullable<PersonGoals['postWindowApprovalStage']>
  manager?: LateApprovalPerson | null
  skipLevelManager?: LateApprovalPerson | null
}) {
  const awaitingManager = stage === 'manager'
  const managerLabel: ReactNode = (
    <PersonOrRole person={manager} fallback="the direct manager" />
  )
  const skipLevelLabel: ReactNode = (
    <PersonOrRole
      person={skipLevelManager}
      fallback="the skip-level manager"
    />
  )

  return (
    <aside className="pd-goals-late" role="status">
      <span className="pd-goals-late__icon" aria-hidden>
        <Clock size={13} strokeWidth={2.25} />
      </span>
      <div className="pd-goals-late__copy">
        <p className="pd-goals-late__title">
          {awaitingManager
            ? 'Submitted after the deadline'
            : 'Pending final approval'}
        </p>
        <p className="pd-goals-late__body">
          {awaitingManager ? (
            <>
              Awaiting {managerLabel}, then {skipLevelLabel}.
            </>
          ) : (
            <>
              Awaiting {skipLevelLabel}.
            </>
          )}
        </p>
      </div>
    </aside>
  )
}
