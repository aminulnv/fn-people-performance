import { ClipboardList } from 'lucide-react'
import type { ReviewPolicy } from '@/lib/reviews/types'
import { ScorecardFormEditor } from './ScorecardFormEditor'
import type { SettingsSideSheet } from './SettingsSideSheetRail'

export const REVIEW_FORM_SHEET_LABEL = 'Review form templates'
export const REVIEW_FORM_TAB_LABEL = 'Review form'

export function reviewFormSummary(policy: ReviewPolicy): string {
  const questions = policy.scorecard.questions.filter((question) => question.enabled)
  const pillars = policy.scorecard.pillars.filter((pillar) => pillar.enabled)
  const questionLabel =
    questions.length === 1 ? '1 question' : `${questions.length} questions`
  const areaLabel = pillars.length === 1 ? '1 area' : `${pillars.length} areas`
  return `${questionLabel} · ${areaLabel}`
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
          Review form
        </h2>
      </header>
      <div className="pd-reviews-form-sheet__body">
        <ScorecardFormEditor policy={policy} onChange={onChange} />
      </div>
    </div>
  )
}
