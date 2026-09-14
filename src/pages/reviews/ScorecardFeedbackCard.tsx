import type { ScorecardFeedback } from '@/lib/reviews/scorecards'
import { MessageSquareText } from 'lucide-react'

function FeedbackField({
  title,
  value,
  locked = false,
  editing = false,
  onChange,
  onTitleChange,
}: {
  title: string
  value: string
  locked?: boolean
  editing?: boolean
  onChange?: (value: string) => void
  onTitleChange?: (title: string) => void
}) {
  return (
    <section aria-label={title}>
      {onTitleChange ? (
        <input
          className="pd-reviews-question__dual-label"
          aria-label="Field label"
          value={title}
          placeholder="Field label"
          onChange={(event) => onTitleChange(event.target.value)}
        />
      ) : (
        <h3 className="pd-reviews-question__dual-label">{title}</h3>
      )}
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
  title = 'Feedback',
  labels = ['Strengths', 'Areas Of Improvement'],
  onTitleChange,
  onLabelsChange,
  hideTitle = false,
  bare = false,
}: {
  feedback: ScorecardFeedback
  editing?: boolean
  locked?: boolean
  strengths?: string
  developments?: string
  onStrengthsChange?: (value: string) => void
  onDevelopmentsChange?: (value: string) => void
  title?: string
  labels?: [string, string]
  onTitleChange?: (title: string) => void
  onLabelsChange?: (labels: [string, string]) => void
  /** Hide the built-in heading when a parent section already titles this block. */
  hideTitle?: boolean
  /** Drop card chrome when nested inside a setup section. */
  bare?: boolean
}) {
  const viewStrengths = feedback.strengths.trim()
  const viewDevelopments = feedback.developments.trim()
  const editStrengths = strengths ?? viewStrengths
  const editDevelopments = developments ?? viewDevelopments
  const [labelA, labelB] = labels

  const body = (
    <>
      {hideTitle ? null : (
        <h2 className="pd-reviews-scorecard__section-title">
          <MessageSquareText size={18} strokeWidth={1.75} aria-hidden />
          {onTitleChange ? (
            <input
              className="pd-reviews-gform-card__prompt"
              aria-label="Feedback section title"
              value={title}
              placeholder="Feedback"
              onChange={(event) => onTitleChange(event.target.value)}
            />
          ) : (
            title
          )}
        </h2>
      )}
      <div
        className={[
          'pd-reviews-scorecard__feedback-grid',
          editing || onLabelsChange ? 'pd-reviews-scorecard__feedback-grid--edit' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <FeedbackField
          title={labelA}
          value={editing ? editStrengths : viewStrengths}
          editing={editing}
          locked={locked}
          onChange={onStrengthsChange}
          onTitleChange={
            onLabelsChange
              ? (next) => onLabelsChange([next, labelB])
              : undefined
          }
        />
        <FeedbackField
          title={labelB}
          value={editing ? editDevelopments : viewDevelopments}
          editing={editing}
          locked={locked}
          onChange={onDevelopmentsChange}
          onTitleChange={
            onLabelsChange
              ? (next) => onLabelsChange([labelA, next])
              : undefined
          }
        />
      </div>
    </>
  )

  if (bare) {
    return (
      <div className="pd-reviews-form-setup-section__inner">
        {body}
      </div>
    )
  }

  return (
    <section className="pd-reviews-scorecard__card" aria-label={title || 'Feedback'}>
      {body}
    </section>
  )
}
