import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ClipboardList } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import type { ReviewPolicy } from '@/lib/reviews/types'
import { ScorecardFormEditor } from './ScorecardFormEditor'
import type { SettingsSideSheet } from './SettingsSideSheetRail'

export const REVIEW_FORM_SHEET_LABEL = 'Review Form Templates'
export const REVIEW_FORM_TAB_LABEL = 'Review Form'

export function reviewFormSummary(policy: ReviewPolicy): string {
  const questions = policy.scorecard.questions.filter((question) => question.enabled)
  const pillars = policy.scorecard.pillars.filter((pillar) => pillar.enabled)
  const questionLabel =
    questions.length === 1 ? '1 question' : `${questions.length} questions`
  const areaLabel = pillars.length === 1 ? '1 area' : `${pillars.length} areas`
  const gradeBits = [
    policy.managerReview.gradeGoals ? 'goals grading' : null,
    policy.managerReview.gradeOverall ? 'overall grading' : null,
  ].filter(Boolean)
  const gradeLabel = gradeBits.length > 0 ? gradeBits.join(' + ') : 'no grades'
  return `${questionLabel} · ${areaLabel} · ${gradeLabel}`
}

/** Summary-only sheet; editing happens in the modal. */
export const REVIEW_FORM_SHEET_WIDTH = 360

export function reviewFormSideSheet(
  policy: ReviewPolicy,
  onChange: (next: ReviewPolicy) => void,
): SettingsSideSheet {
  return {
    tabLabel: REVIEW_FORM_TAB_LABEL,
    tabIcon: ClipboardList,
    label: REVIEW_FORM_SHEET_LABEL,
    preferredWidth: REVIEW_FORM_SHEET_WIDTH,
    content: <ReviewFormSheet policy={policy} onChange={onChange} />,
  }
}

/** Compact side-sheet summary; full editor opens in a modal. */
export function ReviewFormSheet({
  policy,
  onChange,
}: {
  policy: ReviewPolicy
  onChange: (next: ReviewPolicy) => void
}) {
  const [editing, setEditing] = useState(false)
  const areas = policy.scorecard.pillars.filter((pillar) => pillar.enabled)
  const questions = policy.scorecard.questions.filter((question) => question.enabled)

  return (
    <>
      <div className="pd-reviews-form-sheet">
        <header className="pd-reviews-form-sheet__head">
          <h2>
            <ClipboardList size={20} strokeWidth={2.25} aria-hidden />
            Review Form
          </h2>
        </header>
        <div className="pd-reviews-form-sheet__body">
          <div className="pd-reviews-form-sheet__summary">
            <p className="pd-reviews-form-sheet__lede">
              {reviewFormSummary(policy)}
            </p>

            {areas.length > 0 ? (
              <section
                className="pd-reviews-form-sheet__block"
                aria-label="Grade areas"
              >
                <h3 className="pd-field__label">Grade areas</h3>
                <ul className="pd-reviews-form-sheet__list">
                  {areas.map((area) => (
                    <li key={area.id}>
                      {area.label}
                      <span className="pd-reviews-form-sheet__meta">
                        {area.weight}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {questions.length > 0 ? (
              <section
                className="pd-reviews-form-sheet__block"
                aria-label="Questions"
              >
                <h3 className="pd-field__label">Questions</h3>
                <ol className="pd-reviews-form-sheet__list pd-reviews-form-sheet__list--questions">
                  {questions.map((question) => (
                    <li key={question.id}>
                      {question.prompt.trim() || 'Untitled question'}
                    </li>
                  ))}
                </ol>
              </section>
            ) : (
              <p className="pd-reviews-form-sheet__empty">
                No questions yet. Open the editor to build this form.
              </p>
            )}

            <Button
              variant="primary"
              pill
              className="pd-reviews-form-sheet__edit"
              onClick={() => setEditing(true)}
            >
              Edit form
            </Button>
          </div>
        </div>
      </div>

      {createPortal(
        <Modal
          open={editing}
          onClose={() => setEditing(false)}
          title="Review Form"
          className="pd-reviews-form-modal"
          actions={
            <Button variant="primary" pill onClick={() => setEditing(false)}>
              Done
            </Button>
          }
        >
          {editing ? (
            <ScorecardFormEditor policy={policy} onChange={onChange} />
          ) : null}
        </Modal>,
        document.body,
      )}
    </>
  )
}
