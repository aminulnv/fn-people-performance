import { formatDateRange } from '@/lib/reviews/periods'
import type { CycleStage } from '@/lib/reviews/types'

type CycleStagesTimelineProps = {
  stages: CycleStage[]
}

export function CycleStagesTimeline({ stages }: CycleStagesTimelineProps) {
  if (stages.length === 0) {
    return (
      <p className="pd-reviews-stages__empty">No stages configured yet.</p>
    )
  }

  return (
    <ol className="pd-reviews-stages">
      {stages.map((stage, index) => (
        <li key={stage.id} className="pd-reviews-stages__item">
          <div className="pd-reviews-stages__track" aria-hidden>
            <span className="pd-reviews-stages__dot" />
            {index < stages.length - 1 ? (
              <span className="pd-reviews-stages__line" />
            ) : null}
          </div>
          <div className="pd-reviews-stages__content">
            <span className="pd-reviews-stages__label">{stage.label}</span>
            <span className="pd-reviews-stages__dates">
              {formatDateRange(stage.startDate, stage.endDate)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
