import type { ScorecardFeedback } from '@/lib/reviews/scorecards'
import { MessageSquareText } from 'lucide-react'

function FeedbackField({
  title,
  value,
  locked = false,
  editing = false,
  onChange,
}: {
  title: string
  value: string
  locked?: boolean
  editing?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <section aria-label={title}>
      <h3>{title}</h3>
      {editing ? (
        <label className="pd-field">
          <span className="pd-sr-only">{title}</span>
          <textarea
            className="pd-reviews-scorecard__feedback-box pd-field__control pd-field__control--textarea"
            rows={8}
            disabled={locked}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
          />
        </label>
      ) : (
        <p className="pd-reviews-scorecard__feedback-box">
          {value.trim() ? value : '\u00a0'}
        </p>
      )}
    </section>
  )
}

export function ScorecardFeedbackCard({
  feedback,
  editing = false,
  locked = false,
  strengths,
  developments,
  onStrengthsChange,
  onDevelopmentsChange,
}: {
  feedback: ScorecardFeedback
  editing?: boolean
  locked?: boolean
  strengths?: string
  developments?: string
  onStrengthsChange?: (value: string) => void
  onDevelopmentsChange?: (value: string) => void
}) {
  const viewStrengths = feedback.strengths.trim()
  const viewDevelopments = feedback.developments.trim()
  const editStrengths = strengths ?? viewStrengths
  const editDevelopments = developments ?? viewDevelopments

  return (
    <section className="pd-reviews-scorecard__card" aria-label="Feedback">
      <h2 className="pd-reviews-scorecard__section-title">
        <MessageSquareText size={18} strokeWidth={1.75} aria-hidden />
        Feedback
      </h2>
      <div
        className={[
          'pd-reviews-scorecard__feedback-grid',
          editing ? 'pd-reviews-scorecard__feedback-grid--edit' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <FeedbackField
          title="Strengths"
          value={editing ? editStrengths : viewStrengths}
          editing={editing}
          locked={locked}
          onChange={onStrengthsChange}
        />
        <FeedbackField
          title="Areas Of Improvement"
          value={editing ? editDevelopments : viewDevelopments}
          editing={editing}
          locked={locked}
          onChange={onDevelopmentsChange}
        />
      </div>
    </section>
  )
}
