import { CircleHelp, Trophy } from 'lucide-react'
import { Tooltip } from '@/components/ui'
import {
  GRADE_BAND_CRITERIA,
  GRADE_BAND_META,
  OVERALL_GRADE_ORDER,
} from '@/lib/reviews/labels'
import type { OverallGradeReasonNeed } from '@/lib/reviews/overallGradeReason'
import type { GradeBandId } from '@/lib/reviews/types'

const JUSTIFICATION_HELP =
  'You chose a different grade than the calculated one. Please add a short justification.'

const DEFAULT_CALC_ROWS = [
  { label: 'Goals', weight: 50, gradeLabel: '—' },
  { label: 'Skills', weight: 25, gradeLabel: '—' },
  { label: 'Values', weight: 25, gradeLabel: '—' },
] as const

export type OverallCalcRow = {
  label: string
  weight: number
  gradeLabel: string
}

const LEAVE_VALUE = 'leave'

function CalculatedGradeTip({
  rows,
  resultLabel,
}: {
  rows: readonly OverallCalcRow[]
  resultLabel: string
}) {
  return (
    <div className="pd-reviews-scorecard__calc-tip">
      <p className="pd-reviews-scorecard__calc-tip-title">How this is calculated</p>
      <ul className="pd-reviews-scorecard__calc-tip-list">
        {rows.map((row) => (
          <li key={row.label}>
            <span>
              {row.label} ({row.weight}%)
            </span>
            <strong>{row.gradeLabel}</strong>
          </li>
        ))}
      </ul>
      <p className="pd-reviews-scorecard__calc-tip-note">
        Result: <strong>{resultLabel}</strong>
      </p>
    </div>
  )
}

export function OverallGradePicker({
  name,
  value,
  disabled = false,
  suggestedGrade = null,
  calculationRows,
  hideTitle = false,
  leave = false,
  allowLeave = false,
  leaveBusy = false,
  reasonNeed = null,
  reason = '',
  onChange,
  onLeaveChange,
  onReasonChange,
}: {
  name: string
  value: GradeBandId | ''
  disabled?: boolean
  /** Formula calculation; picker stays editable unless disabled. */
  suggestedGrade?: GradeBandId | null
  /** Pillar weights and grades used for the calculated overall. */
  calculationRows?: readonly OverallCalcRow[]
  /** Hide the built-in heading when a parent section already titles this block. */
  hideTitle?: boolean
  /** Full-quarter leave (O) — excludes the quarter from the annual goals average. */
  leave?: boolean
  allowLeave?: boolean
  leaveBusy?: boolean
  reasonNeed?: OverallGradeReasonNeed | null
  reason?: string
  onChange?: (value: GradeBandId) => void
  onLeaveChange?: (leave: boolean) => void
  onReasonChange?: (value: string) => void
}) {
  const headingId = `${name}-heading`
  const calculatedLabel = suggestedGrade
    ? GRADE_BAND_META[suggestedGrade].label
    : null
  const tipRows =
    calculationRows && calculationRows.length > 0
      ? calculationRows
      : DEFAULT_CALC_ROWS
  const leaveDisabled = leaveBusy || !onLeaveChange
  const selectedValue = leave ? LEAVE_VALUE : value

  const body = (
    <>
      <div className="pd-reviews-scorecard__overall-head">
        {hideTitle ? null : (
          <h2 id={headingId} className="pd-reviews-scorecard__section-title">
            <Trophy size={18} strokeWidth={1.75} aria-hidden />
            Overall Grading
          </h2>
        )}
        {calculatedLabel && !leave ? (
          <p className="pd-reviews-scorecard__overall-suggest" role="status">
            <span className="pd-reviews-scorecard__overall-suggest-grade">
              Calculated: {calculatedLabel}
            </span>
            <Tooltip
              content={
                <CalculatedGradeTip
                  rows={tipRows}
                  resultLabel={calculatedLabel}
                />
              }
              side="bottom"
              portal
              delayMs={80}
            >
              <button
                type="button"
                className="pd-help-icon pd-reviews-scorecard__overall-suggest-help"
                aria-label="How this calculated grade works"
              >
                <CircleHelp size={14} strokeWidth={2} aria-hidden />
              </button>
            </Tooltip>
          </p>
        ) : null}
        {leave ? (
          <p className="pd-reviews-scorecard__overall-suggest" role="status">
            <span className="pd-reviews-scorecard__overall-suggest-grade">
              Leave (O)
            </span>
            <span className="pd-reviews-scorecard__overall-suggest-meta">
              This quarter is excluded from the annual goals average.
            </span>
          </p>
        ) : null}
      </div>
      <div
        className={[
          'pd-reviews-scorecard__overall-options',
          allowLeave ? 'has-leave' : '',
        ]
          .filter(Boolean)
          .join(' ')}
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
              selectedValue === id ? 'is-selected' : '',
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
              checked={selectedValue === id}
              disabled={disabled || leaveBusy}
              onChange={() => {
                if (disabled || leaveBusy) return
                if (leave) onLeaveChange?.(false)
                onChange?.(id)
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
        {allowLeave ? (
          <label
            className={[
              'pd-reviews-scorecard__overall-option',
              'pd-reviews-scorecard__overall-option--leave',
              leave ? 'is-selected' : '',
              leaveDisabled ? 'is-disabled' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              className="pd-reviews-scorecard__overall-input"
              type="radio"
              name={name}
              value={LEAVE_VALUE}
              checked={leave}
              disabled={leaveDisabled}
              onClick={() => {
                // Radios don't fire onChange when already selected — allow clear.
                if (leave && !leaveDisabled) onLeaveChange?.(false)
              }}
              onChange={() => {
                if (leaveDisabled || leave) return
                onLeaveChange?.(true)
              }}
            />
            <span className="pd-reviews-scorecard__overall-radio" aria-hidden />
            <span className="pd-reviews-scorecard__overall-text">
              <span className="pd-reviews-scorecard__overall-label">Leave (O)</span>
              <ul>
                <li>Away for the whole quarter — excluded from the annual average.</li>
              </ul>
            </span>
          </label>
        ) : null}
      </div>
      {reasonNeed && !leave ? (
        <div className="pd-reviews-scorecard__overall-justification">
          <div className="pd-reviews-scorecard__overall-justification-label">
            <span className="pd-reviews-question__dual-label">Justification</span>
            <Tooltip
              content={reasonNeed.hint || JUSTIFICATION_HELP}
              side="top"
              portal
              delayMs={80}
            >
              <button
                type="button"
                className="pd-help-icon"
                aria-label="Why justification is required"
              >
                <CircleHelp size={16} strokeWidth={2} aria-hidden />
              </button>
            </Tooltip>
          </div>
          {onReasonChange && !disabled ? (
            <textarea
              className="pd-reviews-scorecard__feedback-box pd-field__control pd-field__control--textarea"
              rows={3}
              aria-label="Justification"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
            />
          ) : (
            <p className="pd-reviews-scorecard__feedback-box">
              {reason.trim() ? reason : '\u00a0'}
            </p>
          )}
        </div>
      ) : null}
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
