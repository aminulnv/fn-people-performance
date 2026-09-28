import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { ScorecardDetail } from '@/lib/reviews/scorecards'
import {
  gradeForViewStage,
  gradeLabelForViewStage,
  type ScorecardViewStage,
} from '@/lib/reviews/scorecardStages'
import type { ReviewPacket } from '@/lib/reviews/types'
import { GradeChip } from '@/pages/reviews/GradeChip'

export function ScorecardHero({
  detail,
  packet,
  viewerEmployeeId,
  viewingStage = 'self_review',
}: {
  detail: ScorecardDetail
  packet: ReviewPacket | null
  viewerEmployeeId?: number | null
  viewingStage?: ScorecardViewStage
}) {
  const viewingGrade = gradeForViewStage(
    packet,
    viewingStage,
    viewerEmployeeId,
  )

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
              {detail.cycleLabel && detail.cycleLabel !== '-' ? (
                <span className="pd-reviews-score-status pd-reviews-score-status--pending">
                  {detail.cycleLabel}
                </span>
              ) : null}
            </div>
            <p className="pd-reviews-scorecard__meta">
              {[detail.role, detail.department]
                .filter((value) => value && value !== '-')
                .flatMap((value, index) =>
                  index === 0
                    ? [
                        <span key={value}>{value}</span>,
                      ]
                    : [
                        <span
                          key={`${value}-sep`}
                          className="pd-reviews-scorecard__meta-sep"
                          aria-hidden
                        >
                          ·
                        </span>,
                        <span key={value}>{value}</span>,
                      ],
                )}
              {detail.reviewerName && detail.reviewerName !== '-' ? (
                <>
                  <span className="pd-reviews-scorecard__meta-sep" aria-hidden>
                    ·
                  </span>
                  <span className="pd-reviews-scorecard__reviewer">
                    Reviewer:
                    <Avatar
                      name={detail.reviewerName}
                      src={detail.reviewerAvatarUrl || undefined}
                      size="sm"
                      className="pd-reviews-scorecard__reviewer-avatar"
                      style={avatarStyle(detail.reviewerName)}
                    />
                    <span className="pd-reviews-scorecard__reviewer-name">
                      {detail.reviewerName}
                    </span>
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="pd-reviews-scorecard__hero-aside">
          <div className="pd-reviews-scorecard__latest">
            <span className="pd-reviews-scorecard__latest-label">
              {viewingGrade
                ? gradeLabelForViewStage(viewingStage)
                : 'No grade yet'}
            </span>
            <GradeChip grade={viewingGrade} />
          </div>
        </div>
      </div>
    </header>
  )
}
