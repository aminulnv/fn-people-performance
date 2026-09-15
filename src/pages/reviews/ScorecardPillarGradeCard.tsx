import { gradeLabel } from '@/lib/reviews/scorecards'
import type { GradeBandId } from '@/lib/reviews/types'

/** Read-only pillar grade row used on the live scorecard (Skills, Values, etc.). */
export function ScorecardPillarGradeCard({
  label,
  weight,
  grade,
  emptyLabel = 'Not graded yet',
}: {
  label: string
  weight: number
  grade: GradeBandId | null
  emptyLabel?: string
}) {
  return (
    <section className="pd-reviews-scorecard__card" aria-label={label}>
      <div className="pd-reviews-scorecard__contribution-card">
        <div className="pd-reviews-scorecard__card-title">
          <h2 className="pd-reviews-scorecard__section-title">{label}</h2>
          <span className="pd-reviews-scorecard__goals-percent">{weight}%</span>
        </div>
        {grade ? (
          <span
            className={[
              'pd-reviews-scorecard__band',
              `pd-reviews-scorecard__band--${grade}`,
            ].join(' ')}
          >
            {gradeLabel(grade)}
          </span>
        ) : (
          <span className="pd-reviews-flow__hint">{emptyLabel}</span>
        )}
      </div>
    </section>
  )
}
