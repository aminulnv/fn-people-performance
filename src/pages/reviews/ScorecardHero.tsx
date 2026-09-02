import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  MessageSquareWarning,
  Scale,
  UserRound,
  UserRoundCog,
  type LucideIcon,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { ScorecardDetail } from '@/lib/reviews/scorecards'
import {
  currentScorecardStepIndex,
  flowStepState,
  gradeForViewStage,
  gradeLabelForViewStage,
  resolveScorecardViewStage,
  scorecardStageIsOpen,
  scorecardStepLabel,
  visibleScorecardSteps,
  type ScorecardViewStage,
} from '@/lib/reviews/scorecardStages'
import type {
  ReviewPacket,
  ReviewStageConfig,
} from '@/lib/reviews/types'
import { GradeChip } from '@/pages/reviews/GradeChip'

const STAGE_ICON: Record<ScorecardViewStage, LucideIcon> = {
  self_review: UserRound,
  manager_review: UserRoundCog,
  calibration_hod_hrbp: Scale,
  publish_employees: BadgeCheck,
  appeal: MessageSquareWarning,
}

export function ScorecardHero({
  detail,
  packet,
  stages,
  viewerEmployeeId,
  viewingStage,
  onViewStage,
}: {
  detail: ScorecardDetail
  packet: ReviewPacket | null
  stages?: ReviewStageConfig[]
  viewerEmployeeId?: number | null
  viewingStage?: ScorecardViewStage
  onViewStage?: (stage: ScorecardViewStage) => void
}) {
  const visibleSteps = visibleScorecardSteps(stages, packet)
  const currentStepIndex = packet
    ? currentScorecardStepIndex(visibleSteps, packet.status)
    : 0
  const viewing = resolveScorecardViewStage({
    requested: viewingStage ?? null,
    steps: visibleSteps,
    packet,
    viewerEmployeeId,
  })
  const viewingGrade = gradeForViewStage(packet, viewing, viewerEmployeeId)

  const stageMap =
    visibleSteps.length > 1 ? (
      <ol className="pd-reviews-scorecard__steps" aria-label="Review stages">
        {visibleSteps.map((step, index) => {
          const state = flowStepState(
            step,
            index,
            currentStepIndex,
            packet?.status ?? 'not_started',
          )
          const open = scorecardStageIsOpen(
            step,
            index,
            currentStepIndex,
            packet,
            viewerEmployeeId,
          )
          const isViewing = step.id === viewing
          const label = scorecardStepLabel(step.id)
          const Icon = STAGE_ICON[step.id]
          const marker = (
            <>
              <span className="pd-reviews-scorecard__step-dot" aria-hidden>
                <Icon size={12} strokeWidth={2.25} />
              </span>
              <span className="pd-reviews-scorecard__step-label">{label}</span>
            </>
          )
          return (
            <li
              key={step.id}
              className={[
                'pd-reviews-scorecard__step',
                `is-${state}`,
                isViewing ? 'is-viewing' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {open ? (
                <button
                  type="button"
                  className="pd-reviews-scorecard__step-button"
                  aria-current={isViewing ? 'step' : undefined}
                  onClick={() => onViewStage?.(step.id)}
                >
                  {marker}
                </button>
              ) : (
                marker
              )}
            </li>
          )
        })}
      </ol>
    ) : null

  return (
    <>
      {stageMap}
      <header className="pd-reviews-scorecard__hero">
        <div className="pd-reviews-scorecard__hero-top">
          <div className="pd-reviews-scorecard__identity">
            <Avatar
              name={detail.employeeName}
              src={detail.employeeAvatarUrl || undefined}
              size="lg"
              className="pd-reviews-scorecard__avatar"
              style={avatarStyle(detail.employeeName)}
            />
            <div className="pd-reviews-scorecard__identity-text">
              <div className="pd-reviews-scorecard__name-row">
                <h1>
                  <Link to={`/people/${detail.employeeId}`}>
                    {detail.employeeName}
                  </Link>
                </h1>
                {detail.cycleLabel && detail.cycleLabel !== '-' ? (
                  <span className="pd-reviews-score-status pd-reviews-score-status--pending">
                    {detail.cycleLabel}
                  </span>
                ) : null}
              </div>
              <p className="pd-reviews-scorecard__meta">
                {[detail.role, detail.department]
                  .filter((value) => value && value !== '-')
                  .join(' · ')}
                {detail.reviewerName && detail.reviewerName !== '-' ? (
                  <>
                    <span aria-hidden> · </span>
                    Reviewer {detail.reviewerName}
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="pd-reviews-scorecard__hero-aside">
            <div className="pd-reviews-scorecard__latest">
              <span className="pd-reviews-scorecard__latest-label">
                {viewingGrade
                  ? gradeLabelForViewStage(viewing)
                  : 'No grade yet'}
              </span>
              <GradeChip grade={viewingGrade} />
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
