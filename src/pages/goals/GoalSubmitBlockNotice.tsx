import { Fragment } from 'react'
import { CircleAlert, Plus } from 'lucide-react'
import {
  sentenceFromSuffix,
  type SubmitGoalBlocker,
} from '@/lib/goals/weightage'

function BlockerLine({
  blocker,
  onOpenGoal,
  nameTheGoal,
}: {
  blocker: SubmitGoalBlocker
  onOpenGoal?: (goalId: string) => void
  nameTheGoal: boolean
}) {
  if (!nameTheGoal) {
    return <>{blocker.suffix ? sentenceFromSuffix(blocker.suffix) : blocker.reason}</>
  }
  const canOpen = Boolean(blocker.goalId && blocker.goalTitle && onOpenGoal)
  if (!canOpen) return <>{blocker.reason}</>
  return (
    <>
      <button
        type="button"
        className="pd-goals-sendback__goal"
        onClick={() => onOpenGoal?.(blocker.goalId!)}
      >
        {blocker.goalTitle}
      </button>
      {blocker.suffix}
    </>
  )
}

export function GoalSubmitBlockNotice({
  blockers,
  onOpenGoal,
  onAddGoal,
  addGoalLabel = 'Add a goal',
  layout = 'card',
  nameTheGoal = true,
}: {
  blockers: SubmitGoalBlocker[]
  onOpenGoal?: (goalId: string) => void
  onAddGoal?: () => void
  addGoalLabel?: string
  /** `ribbon` is a flush strip; `card` is the inset notice. */
  layout?: 'card' | 'ribbon'
  /** False inside a goal window — the name is already the context. */
  nameTheGoal?: boolean
}) {
  if (blockers.length === 0) return null
  const canAddGoal =
    Boolean(onAddGoal) &&
    blockers.some((blocker) => blocker.action === 'add_goal')
  const reasonLine = (
    <p className="pd-goals-sendback__reason pd-goals-banner__detail">
      {blockers.map((blocker, index) => (
        <Fragment key={`${blocker.goalId ?? 'global'}-${index}`}>
          {index > 0 ? ' ' : null}
          <BlockerLine
            blocker={blocker}
            onOpenGoal={onOpenGoal}
            nameTheGoal={nameTheGoal}
          />
        </Fragment>
      ))}
    </p>
  )
  const reasons =
    layout === 'ribbon' || blockers.length === 1 ? (
      reasonLine
    ) : (
      <ul className="pd-goals-sendback__reason pd-goals-banner__detail">
        {blockers.map((blocker, index) => (
          <li key={`${blocker.goalId ?? 'global'}-${index}`}>
            <BlockerLine
              blocker={blocker}
              onOpenGoal={onOpenGoal}
              nameTheGoal={nameTheGoal}
            />
          </li>
        ))}
      </ul>
    )

  if (layout === 'ribbon') {
    return (
      <aside
        className="pd-goals-sendback pd-goals-sendback--danger pd-goals-sendback--ribbon pd-goals-banner pd-goals-banner--danger"
        role="alert"
      >
        <div className="pd-goals-banner__start">
          <span className="pd-goals-banner__icon" aria-hidden>
            <CircleAlert size={13} strokeWidth={2.25} />
          </span>
          <p className="pd-goals-banner__title">Action required</p>
          {reasons}
        </div>
        {canAddGoal ? (
          <button
            type="button"
            className="pd-goals-sendback__action"
            onClick={onAddGoal}
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            {addGoalLabel}
          </button>
        ) : null}
      </aside>
    )
  }

  return (
    <aside
      className={[
        'pd-goals-sendback',
        'pd-goals-sendback--danger',
        'pd-goals-sendback--compact',
        canAddGoal ? 'pd-goals-sendback--with-action' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="alert"
    >
      <span className="pd-goals-sendback__icon" aria-hidden>
        <CircleAlert size={13} strokeWidth={2.25} />
      </span>
      <div className="pd-goals-sendback__copy">
        <div className="pd-goals-sendback__head">
          <p className="pd-goals-sendback__title">Action required</p>
        </div>
        {reasons}
      </div>
      {canAddGoal ? (
        <button
          type="button"
          className="pd-goals-sendback__action"
          onClick={onAddGoal}
        >
          <Plus size={14} strokeWidth={2.25} aria-hidden />
          {addGoalLabel}
        </button>
      ) : null}
    </aside>
  )
}
