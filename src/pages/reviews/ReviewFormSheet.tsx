import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { ListboxSelect } from '@/components/ui'
import { scorecardsBuilderPath } from '@/lib/reviews/paths'
import type { ReviewPolicy, ScorecardForm } from '@/lib/reviews/types'
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

/** Summary-only sheet; forms are authored in Scorecards Builder. */
export const REVIEW_FORM_SHEET_WIDTH = 360

export function reviewFormSideSheet(args: {
  policy: ReviewPolicy
  forms: ScorecardForm[]
  scorecardFormId: string | null | undefined
  onAllocate: (formId: string | null) => void
}): SettingsSideSheet {
  return {
    tabLabel: REVIEW_FORM_TAB_LABEL,
    tabIcon: ClipboardList,
    label: REVIEW_FORM_SHEET_LABEL,
    preferredWidth: REVIEW_FORM_SHEET_WIDTH,
    content: (
      <ReviewFormSheet
        policy={args.policy}
        forms={args.forms}
        scorecardFormId={args.scorecardFormId}
        onAllocate={args.onAllocate}
      />
    ),
  }
}

/** Compact side-sheet: allocate a shared form template to this group. */
export function ReviewFormSheet({
  policy,
  forms,
  scorecardFormId,
  onAllocate,
}: {
  policy: ReviewPolicy
  forms: ScorecardForm[]
  scorecardFormId: string | null | undefined
  onAllocate: (formId: string | null) => void
}) {
  const allocated = scorecardFormId
    ? forms.find((form) => form.id === scorecardFormId)
    : null
  const resolved = allocated?.policy ?? policy
  const areas = resolved.scorecard.pillars.filter((pillar) => pillar.enabled)
  const questions = resolved.scorecard.questions.filter(
    (question) => question.enabled,
  )
  const builderHref = allocated
    ? scorecardsBuilderPath(allocated.id)
    : scorecardsBuilderPath()

  return (
    <div className="pd-reviews-form-sheet">
      <header className="pd-reviews-form-sheet__head">
        <h2>
          <ClipboardList size={20} strokeWidth={2.25} aria-hidden />
          Review Form
        </h2>
      </header>
      <div className="pd-reviews-form-sheet__body">
        <div className="pd-reviews-form-sheet__summary">
          <label className="pd-field">
            <span className="pd-field__label">Allocated form</span>
            <ListboxSelect
              aria-label="Allocated form"
              allowEmpty
              emptyLabel="No form allocated"
              value={scorecardFormId ?? ''}
              onValueChange={(next) => onAllocate(next || null)}
              options={forms.map((form) => ({
                value: form.id,
                label: form.name,
                description: reviewFormSummary(form.policy),
              }))}
            />
          </label>

          <p className="pd-reviews-form-sheet__lede">
            {allocated
              ? `${reviewFormSummary(resolved)}. Allocated forms are locked — duplicate in Scorecards Builder to change the scorecard without affecting past quarters.`
              : 'Allocate a form from Scorecards Builder. Once allocated, the scorecard is locked so past quarters stay unchanged.'}
          </p>

          {allocated && areas.length > 0 ? (
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

          {allocated && questions.length > 0 ? (
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
          ) : null}

          {!allocated ? (
            <p className="pd-reviews-form-sheet__empty">
              No form allocated. Create or pick a template in Scorecards Builder.
            </p>
          ) : null}

          <Link
            className="pd-btn pd-btn--primary pd-btn--pill pd-reviews-form-sheet__edit"
            to={builderHref}
          >
            {allocated ? 'Edit in Builder' : 'Open Scorecards Builder'}
          </Link>
        </div>
      </div>
    </div>
  )
}
