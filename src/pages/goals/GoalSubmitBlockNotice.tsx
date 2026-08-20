import { CircleAlert } from 'lucide-react'
import type { SubmitGoalBlocker } from '@/lib/goals/weightage'

function BlockerLine({
  blocker,
  onOpenGoal,
}: {
  blocker: SubmitGoalBlocker
  onOpenGoal?: (goalId: string) => void
}) {
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
}: {
  blockers: SubmitGoalBlocker[]
  onOpenGoal?: (goalId: string) => void
}) {
  if (blockers.length === 0) return null

  return (
    <aside className="pd-goals-sendback pd-goals-sendback--danger" role="alert">
      <span className="pd-goals-sendback__icon" aria-hidden>
        <CircleAlert size={13} strokeWidth={2.25} />
      </span>
      <div className="pd-goals-sendback__copy">
        <div className="pd-goals-sendback__head">
          <p className="pd-goals-sendback__title">Action required</p>
        </div>
        {blockers.length === 1 ? (
          <p className="pd-goals-sendback__reason">
            <BlockerLine blocker={blockers[0]} onOpenGoal={onOpenGoal} />
          </p>
        ) : (
          <ul className="pd-goals-sendback__reason">
            {blockers.map((blocker, index) => (
              <li key={`${blocker.goalId ?? 'global'}-${index}`}>
                <BlockerLine blocker={blocker} onOpenGoal={onOpenGoal} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
