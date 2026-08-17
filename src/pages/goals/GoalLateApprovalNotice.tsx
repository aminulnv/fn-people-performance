import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PersonGoals } from '@/lib/goals/types'

export type LateApprovalPerson = {
  id?: string | null
  name: string
  avatarUrl?: string
}

function PersonChip({ person }: { person: LateApprovalPerson }) {
  const inner = (
    <>
      <Avatar
        name={person.name}
        src={person.avatarUrl}
        size="sm"
        className="pd-goals-late__avatar"
        alt=""
        style={avatarStyle(person.name)}
      />
      <span className="pd-goals-late__person-name">{person.name}</span>
    </>
  )

  if (!person.id) {
    return <span className="pd-goals-late__person">{inner}</span>
  }

  return (
    <Link to={`/people/${person.id}`} className="pd-goals-late__person">
      {inner}
    </Link>
  )
}

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
  const managerLabel: ReactNode = manager ? (
    <PersonChip person={manager} />
  ) : (
    'the direct manager'
  )
  const skipLevelLabel: ReactNode = skipLevelManager ? (
    <PersonChip person={skipLevelManager} />
  ) : (
    'the skip-level manager'
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
              Awaiting {managerLabel} approval, then {skipLevelLabel} gives
              final approval.
            </>
          ) : (
            <>
              {managerLabel} approved · awaiting final approval from{' '}
              {skipLevelLabel}.
            </>
          )}
        </p>
      </div>
    </aside>
  )
}
