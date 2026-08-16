import { Check } from 'lucide-react'
import { formatDateRange } from '@/lib/reviews/periods'
import { stageProgress } from '@/lib/reviews/stageProgress'
import type { CycleStage } from '@/lib/reviews/types'

type CycleStagesTimelineProps = {
  stages: CycleStage[]
  today?: Date
}

export function CycleStagesTimeline({
  stages,
  today = new Date(),
}: CycleStagesTimelineProps) {
  if (stages.length === 0) {
    return <p className="pd-reviews-stages__empty">No stages configured yet.</p>
  }

  return (
    <ol className="pd-reviews-stages">
      {stages.map((stage, index) => {
        const progress = stageProgress(stage, today)
        return (
          <li
            key={stage.id}
            className={`pd-reviews-stages__item is-${progress}`}
            aria-current={progress === 'active' ? 'step' : undefined}
          >
            <div className="pd-reviews-stages__track" aria-hidden>
              <span className="pd-reviews-stages__dot">
                {progress === 'done' ? (
                  <Check size={9} strokeWidth={3.25} aria-hidden />
                ) : null}
              </span>
              {index < stages.length - 1 ? (
                <span className="pd-reviews-stages__line" />
              ) : null}
            </div>
            <div className="pd-reviews-stages__content">
              <span className="pd-reviews-stages__label">{stage.label}</span>
              <span className="pd-reviews-stages__dates">
                {formatDateRange(stage.startDate, stage.endDate)}
              </span>
              {progress === 'active' ? (
                <span className="pd-reviews-stages__now">In progress</span>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
