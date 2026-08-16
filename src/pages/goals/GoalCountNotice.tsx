import { Lightbulb } from 'lucide-react'

/** Non-blocking goal-count guidance, shown while the list is still editable. */
export function GoalCountNotice({ message }: { message: string }) {
  return (
    <aside className="pd-goals-sendback pd-goals-sendback--info" role="status">
      <span className="pd-goals-sendback__icon" aria-hidden>
        <Lightbulb size={13} strokeWidth={2.25} />
      </span>
      <div className="pd-goals-sendback__copy">
        <div className="pd-goals-sendback__head">
          <p className="pd-goals-sendback__title">Recommendation</p>
        </div>
        <p className="pd-goals-sendback__reason">{message}</p>
      </div>
    </aside>
  )
}
