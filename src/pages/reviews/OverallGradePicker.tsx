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
  onChange,
}: {
  name: string
  value: GradeBandId | ''
  disabled?: boolean
  onChange?: (value: GradeBandId) => void
}) {
  const headingId = `${name}-heading`
  return (
    <section className="pd-reviews-scorecard__overall" aria-labelledby={headingId}>
      <h2 id={headingId} className="pd-reviews-scorecard__section-title">
        <Trophy size={18} strokeWidth={1.75} aria-hidden />
        Overall Grade
      </h2>
      <div
        className="pd-reviews-scorecard__overall-options"
        role="radiogroup"
        aria-labelledby={headingId}
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
    </section>
  )
}
