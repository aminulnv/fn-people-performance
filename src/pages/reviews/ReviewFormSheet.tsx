import { ClipboardList } from 'lucide-react'
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
    policy.managerReview.gradeGoals ? 'goals grade' : null,
    policy.managerReview.gradeOverall ? 'overall grade' : null,
  ].filter(Boolean)
  const gradeLabel = gradeBits.length > 0 ? gradeBits.join(' + ') : 'no grades'
  return `${questionLabel} · ${areaLabel} · ${gradeLabel}`
}

export function reviewFormSideSheet(
  policy: ReviewPolicy,
  onChange: (next: ReviewPolicy) => void,
): SettingsSideSheet {
  return {
    tabLabel: REVIEW_FORM_TAB_LABEL,
    tabIcon: ClipboardList,
    label: REVIEW_FORM_SHEET_LABEL,
    content: <ReviewFormSheet policy={policy} onChange={onChange} />,
  }
}

/** Preset form editor sized for the settings panel's pull-out sheet. */
export function ReviewFormSheet({
  policy,
  onChange,
}: {
  policy: ReviewPolicy
  onChange: (next: ReviewPolicy) => void
}) {
  return (
    <div className="pd-reviews-form-sheet">
      <header className="pd-reviews-form-sheet__head">
        <h2>
          <ClipboardList size={20} strokeWidth={2.25} aria-hidden />
          Review Form
        </h2>
      </header>
      <div className="pd-reviews-form-sheet__body">
        <ScorecardFormEditor policy={policy} onChange={onChange} />
      </div>
    </div>
  )
}
