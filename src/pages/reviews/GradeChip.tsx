import { gradeLabel } from '@/lib/reviews/scorecards'
import type { GradeBandId } from '@/lib/reviews/types'

export function GradeChip({ grade }: { grade: GradeBandId | null }) {
  if (!grade) {
    return <span className="pd-reviews-scorecard__grade-empty">Not graded</span>
  }
  return (
    <span
      className={[
        'pd-reviews-scorecard__band',
        `pd-reviews-scorecard__band--${grade}`,
      ].join(' ')}
    >
      {gradeLabel(grade)}
    </span>
  )
}
