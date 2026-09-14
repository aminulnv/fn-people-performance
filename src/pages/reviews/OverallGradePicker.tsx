import { Trophy } from 'lucide-react'
import {
  GRADE_BAND_CRITERIA,
  GRADE_BAND_META,
  OVERALL_GRADE_ORDER,
} from '@/lib/reviews/labels'
import type { GradeBandId } from '@/lib/reviews/types'

export function OverallGradePicker({
  name,
  value,
  disabled = false,
  suggestedGrade = null,
  hideTitle = false,
  onChange,
}: {
  name: string
  value: GradeBandId | ''
  disabled?: boolean
  /** Formula suggestion; picker stays editable unless disabled. */
  suggestedGrade?: GradeBandId | null
  /** Hide the built-in heading when a parent section already titles this block. */
  hideTitle?: boolean
  onChange?: (value: GradeBandId) => void
}) {
  const headingId = `${name}-heading`
  const suggestionLabel = suggestedGrade
    ? GRADE_BAND_META[suggestedGrade].label
    : null
  const body = (
    <>
      {hideTitle ? null : (
        <h2 id={headingId} className="pd-reviews-scorecard__section-title">
          <Trophy size={18} strokeWidth={1.75} aria-hidden />
          Overall Grading
        </h2>
      )}
      {suggestionLabel ? (
        <p className="pd-reviews-flow__hint">
          Suggested from Goals 50% / Skills 25% / Values 25%: {suggestionLabel}.
          You can change this grade.
        </p>
      ) : null}
      <div
        className="pd-reviews-scorecard__overall-options"
        role="radiogroup"
        aria-labelledby={hideTitle ? undefined : headingId}
        aria-label={hideTitle ? 'Overall Grading' : undefined}
      >
        {OVERALL_GRADE_ORDER.map((id) => (
          <label
            key={id}
            className={[
              'pd-reviews-scorecard__overall-option',
              `pd-reviews-scorecard__overall-option--${id}`,
              value === id ? 'is-selected' : '',
              disabled ? 'is-disabled' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              className="pd-reviews-scorecard__overall-input"
              type="radio"
              name={name}
              value={id}
              checked={value === id}
              disabled={disabled}
              onChange={() => {
                if (!disabled) onChange?.(id)
              }}
            />
            <span className="pd-reviews-scorecard__overall-radio" aria-hidden />
            <span className="pd-reviews-scorecard__overall-text">
              <span className="pd-reviews-scorecard__overall-label">
                {GRADE_BAND_META[id].label}
              </span>
              <ul>
                {GRADE_BAND_CRITERIA[id].map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </span>
          </label>
        ))}
      </div>
    </>
  )

  if (hideTitle) {
    return <div className="pd-reviews-scorecard__overall">{body}</div>
  }

  return (
    <section className="pd-reviews-scorecard__overall" aria-labelledby={headingId}>
      {body}
    </section>
  )
}
