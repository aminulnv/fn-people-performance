import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import {
  latestScorecardGrade,
  type ScorecardDetail,
} from '@/lib/reviews/scorecards'
import { REVIEW_STAGE_LABEL, getReviewStage } from '@/lib/reviews/reviewStages'
import type {
  ReviewPacket,
  ReviewPacketStatus,
  ReviewStageConfig,
  ReviewStageId,
} from '@/lib/reviews/types'
import { GradeChip } from '@/pages/reviews/GradeChip'

const FLOW_STEPS: Array<{
  id: ReviewStageId
  until: ReviewPacketStatus[]
}> = [
  {
    id: 'self_review',
    until: ['not_started', 'self_in_progress'],
  },
  {
    id: 'manager_review',
    until: ['self_submitted', 'manager_in_progress'],
  },
  {
    id: 'calibration_hod_hrbp',
    until: ['manager_submitted', 'in_calibration'],
  },
  {
    id: 'publish_employees',
    until: ['calibrated', 'released_to_managers', 'released_to_employees'],
  },
  {
    id: 'appeal',
    until: ['appealed'],
  },
]

const PACKET_STATUS_ORDER: ReviewPacketStatus[] = [
  'not_started',
  'self_in_progress',
  'self_submitted',
  'manager_in_progress',
  'manager_submitted',
  'in_calibration',
  'calibrated',
  'released_to_managers',
  'released_to_employees',
  'appealed',
]

function statusRank(status: ReviewPacketStatus) {
  return PACKET_STATUS_ORDER.indexOf(status)
}

function stepIsCurrent(
  step: (typeof FLOW_STEPS)[number],
  status: ReviewPacketStatus,
) {
  return step.until.includes(status)
}

function stepIsPassed(
  step: (typeof FLOW_STEPS)[number],
  status: ReviewPacketStatus,
) {
  return statusRank(status) > Math.max(...step.until.map(statusRank))
}

function currentScorecardStepIndex(
  steps: Array<(typeof FLOW_STEPS)[number]>,
  status: ReviewPacketStatus,
) {
  const current = steps.findIndex((step) => stepIsCurrent(step, status))
  if (current >= 0) return current
  const next = steps.findIndex((step) => !stepIsPassed(step, status))
  return next === -1 ? Math.max(0, steps.length - 1) : next
}

function flowStepState(
  step: (typeof FLOW_STEPS)[number],
  stepIndex: number,
  currentIndex: number,
  status: ReviewPacketStatus,
): 'done' | 'active' | 'upcoming' {
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex > currentIndex) return 'upcoming'
  if (
    (step.id === 'publish_employees' && status === 'released_to_employees') ||
    (step.id === 'appeal' && status === 'appealed')
  ) {
    return 'done'
  }
  return 'active'
}

function visibleScorecardSteps(
  stages: ReviewStageConfig[] | undefined,
  packet: ReviewPacket | null,
) {
  return FLOW_STEPS.filter((step) => {
    if (step.id === 'calibration_hod_hrbp') {
      return Boolean(
        getReviewStage(stages, 'calibration_hod_hrbp')?.enabled ||
          getReviewStage(stages, 'calibration_slt')?.enabled ||
          packet?.calibratedOverallGrade ||
          (packet?.calibrationEvents.length ?? 0) > 0,
      )
    }
    if (step.id === 'appeal') {
      return Boolean(
        getReviewStage(stages, 'appeal')?.enabled ||
          (packet?.appeals.length ?? 0) > 0 ||
          packet?.status === 'appealed',
      )
    }
    if (step.id === 'self_review') {
      return Boolean(
        getReviewStage(stages, 'self_review')?.enabled || packet?.selfOverallGrade,
      )
    }
    return true
  })
}

export function ScorecardHero({
  detail,
  packet,
  stages,
}: {
  detail: ScorecardDetail
  packet: ReviewPacket | null
  stages?: ReviewStageConfig[]
}) {
  const latest = latestScorecardGrade(packet)
  const visibleSteps = visibleScorecardSteps(stages, packet)
  const currentStepIndex = packet
    ? currentScorecardStepIndex(visibleSteps, packet.status)
    : 0

  return (
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
              {detail.cycleLabel && detail.cycleLabel !== '—' ? (
                <span className="pd-reviews-score-status pd-reviews-score-status--pending">
                  {detail.cycleLabel}
                </span>
              ) : null}
            </div>
            <p className="pd-reviews-scorecard__meta">
              {[detail.role, detail.department]
                .filter((value) => value && value !== '—')
                .join(' · ')}
              {detail.reviewerName && detail.reviewerName !== '—' ? (
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
              {latest.grade ? 'Overall grade' : 'No grade yet'}
            </span>
            <GradeChip grade={latest.grade} />
          </div>
        </div>
      </div>

      {visibleSteps.length > 1 ? (
        <ol className="pd-reviews-scorecard__steps" aria-label="Review stages">
          {visibleSteps.map((step, index) => {
            const state = packet
              ? flowStepState(step, index, currentStepIndex, packet.status)
              : flowStepState(step, index, currentStepIndex, 'not_started')
            return (
              <li
                key={step.id}
                className={`pd-reviews-scorecard__step is-${state}`}
              >
                <span className="pd-reviews-scorecard__step-dot" aria-hidden />
                <span>
                  {step.id === 'calibration_hod_hrbp'
                    ? 'Calibration'
                    : step.id === 'publish_employees'
                      ? 'Published'
                      : REVIEW_STAGE_LABEL[step.id]}
                </span>
              </li>
            )
          })}
        </ol>
      ) : null}
    </header>
  )
}
