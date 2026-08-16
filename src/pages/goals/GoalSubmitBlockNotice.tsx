import { CircleAlert } from 'lucide-react'
import type { SubmitGoalBlocker } from '@/lib/goals/weightage'

export function GoalSubmitBlockNotice({
  blockers,
  onOpenGoal,
}: {
  blockers: SubmitGoalBlocker[]
  onOpenGoal?: (goalId: string) => void
}) {
  const focus = blockers.find((blocker) => blocker.goalId) ?? blockers[0]
  if (!focus) return null

  const canOpen = Boolean(focus.goalId && focus.goalTitle && onOpenGoal)

  return (
    <aside className="pd-goals-sendback pd-goals-sendback--danger" role="alert">
      <span className="pd-goals-sendback__icon" aria-hidden>
        <CircleAlert size={13} strokeWidth={2.25} />
      </span>
      <div className="pd-goals-sendback__copy">
        <div className="pd-goals-sendback__head">
          <p className="pd-goals-sendback__title">Action required</p>
        </div>
        <p className="pd-goals-sendback__reason">
          {canOpen ? (
            <>
              <button
                type="button"
                className="pd-goals-sendback__goal"
                onClick={() => onOpenGoal?.(focus.goalId!)}
              >
                {focus.goalTitle}
              </button>
              {focus.suffix}
            </>
          ) : (
            blockers.map((blocker) => blocker.reason).join(' ')
          )}
        </p>
      </div>
    </aside>
  )
}
