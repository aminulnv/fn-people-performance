import { Switch } from '@/components/ui'
import {
  ClipboardList,
  Gavel,
  Megaphone,
  User,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
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

const STAGE_ICONS: Partial<Record<ReviewStageId, LucideIcon>> = {
  self_review: User,
  manager_review: UserCheck,
  publish_managers: Users,
  publish_employees: Megaphone,
  appeal: Gavel,
  calibration_hod_hrbp: ClipboardList,
  calibration_slt: ClipboardList,
}

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
  excludedEmployeeIds?: number[]
  onExcludedEmployeeIdsChange?: (ids: number[]) => void
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
  excludedEmployeeIds,
  onExcludedEmployeeIdsChange,
}: ReviewStageListProps) {
  return (
    <ul className="pd-reviews-stage-list">
      {stageIds.map((id) => {
        const stage = (stagesConfig.reviewStages ?? []).find(
          (item) => item.id === id,
        )
        if (!stage) return null
        const required = isRequiredReviewStage(id)
        const active = stage.enabled || required || !moduleEnabled
        const StageIcon = STAGE_ICONS[id]
        return (
          <li
            key={id}
            id={stageSectionId(id)}
            className={[
              'pd-reviews-stage-list__item',
              highlightedId === id ? 'is-highlighted' : '',
              active ? 'is-active' : 'is-off',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="pd-reviews-stage-list__row">
              <div className="pd-reviews-stage-list__title-row">
                <p className="pd-reviews-stage-list__title">
                  {StageIcon ? (
                    <StageIcon size={15} strokeWidth={1.75} aria-hidden />
                  ) : null}
                  {REVIEW_STAGE_LABEL[id]}
                </p>
                <HintIcon
                  content={REVIEW_STAGE_HINT[id]}
                  label={`About ${REVIEW_STAGE_LABEL[id]}`}
                />
                {required ? (
                  <span className="pd-reviews-chip pd-reviews-chip--required">
                    Required
                  </span>
                ) : null}
              </div>
              {required ? null : (
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
            {active ? (
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
                    cycleName={cycle.name}
                    excludedEmployeeIds={
                      id === 'publish_employees'
                        ? excludedEmployeeIds
                        : undefined
                    }
                    onExcludedEmployeeIdsChange={
                      id === 'publish_employees'
                        ? onExcludedEmployeeIdsChange
                        : undefined
                    }
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
