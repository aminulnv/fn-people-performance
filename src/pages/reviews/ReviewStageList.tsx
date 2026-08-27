import { Switch } from '@/components/ui'
import { toUtcIso } from '@/lib/dates/timezone'
import {
  isPublishStage,
  isRequiredReviewStage,
  REVIEW_STAGE_HINT,
  REVIEW_STAGE_LABEL,
} from '@/lib/reviews/reviewStages'
import type {
  CycleStagesConfig,
  ReviewCycle,
  ReviewStageId,
} from '@/lib/reviews/types'
import { HintIcon } from './HintIcon'
import { PublishStageControls } from './PublishStageControls'
import { StageWindowFields } from './StageDateTable'

type ReviewStageListProps = {
  cycle: ReviewCycle
  groupId: string
  stageIds: ReviewStageId[]
  stagesConfig: CycleStagesConfig
  moduleEnabled?: boolean
  highlightedId?: ReviewStageId | null
  setStageEnabled: (id: ReviewStageId, enabled: boolean) => void
  setStageDate: (
    id: ReviewStageId,
    field: 'start' | 'end',
    date: string,
  ) => void
}

export function stageSectionId(id: ReviewStageId) {
  return `review-stage-${id}`
}

export function ReviewStageList({
  cycle,
  groupId,
  stageIds,
  stagesConfig,
  moduleEnabled = true,
  highlightedId,
  setStageEnabled,
  setStageDate,
}: ReviewStageListProps) {
  return (
    <ul className="pd-reviews-stage-list">
      {stageIds.map((id) => {
        const stage = (stagesConfig.reviewStages ?? []).find(
          (item) => item.id === id,
        )
        if (!stage) return null
        return (
          <li
            key={id}
            id={stageSectionId(id)}
            className={`pd-reviews-stage-list__item${highlightedId === id ? ' is-highlighted' : ''}`}
          >
            <div className="pd-reviews-stage-list__row">
              <div className="pd-reviews-stage-list__copy pd-reviews-edit-card__head">
                <p className="pd-reviews-stage-list__title">
                  {REVIEW_STAGE_LABEL[id]}
                </p>
                <HintIcon
                  content={REVIEW_STAGE_HINT[id]}
                  label={`About ${REVIEW_STAGE_LABEL[id]}`}
                />
                {isRequiredReviewStage(id) ? null : (
                  <Switch
                    label={`Enable ${REVIEW_STAGE_LABEL[id]}`}
                    className="pd-reviews-type-list__switch"
                    checked={stage.enabled}
                    onChange={(event) =>
                      setStageEnabled(id, event.target.checked)
                    }
                  />
                )}
              </div>
            </div>
            {stage.enabled || isRequiredReviewStage(id) || !moduleEnabled ? (
              <div className="pd-reviews-stage-list__window">
                {isPublishStage(id) ? (
                  <PublishStageControls
                    cycleId={cycle.id}
                    groupId={groupId}
                    target={
                      id === 'publish_managers' ? 'managers' : 'employees'
                    }
                    date={toUtcIso(
                      stage.start ?? {
                        date: cycle.endDate,
                        time: '00:00',
                      },
                    )}
                    dateLabel={
                      id === 'publish_managers'
                        ? 'Publish to managers from'
                        : 'Publish to everyone from'
                    }
                    releaseLabel={
                      id === 'publish_managers'
                        ? 'Publish to Managers First Now'
                        : 'Publish to Everyone Now'
                    }
                    onDateChange={(next) => setStageDate(id, 'start', next)}
                  />
                ) : (
                  <StageWindowFields
                    startLabel="Opens"
                    endLabel="Closes"
                    startValue={toUtcIso(
                      stage.start ?? {
                        date: cycle.startDate,
                        time: '00:00',
                      },
                    )}
                    endValue={toUtcIso(
                      stage.end ??
                        stage.start ?? {
                          date: cycle.endDate,
                          time: '00:00',
                        },
                    )}
                    onStartChange={(date) => setStageDate(id, 'start', date)}
                    onEndChange={(date) => setStageDate(id, 'end', date)}
                  />
                )}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
