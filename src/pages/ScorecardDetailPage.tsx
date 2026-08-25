import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { PageStatus } from '@/components/ui'
import { useEmployees } from '@/lib/employees/useEmployees'
import { selectGoalCycle } from '@/lib/goalsApi'
import { getGoalsSnapshotForCycle, subscribeGoalsStore } from '@/lib/goals/store'
import { useAuth } from '@/lib/auth'
import { goalsDetailPath } from '@/pages/goals/goalHelpers'
import { fetchReviewPacket } from '@/lib/reviews/packetsApi'
import { useLiveTopic } from '@/lib/realtime/useLiveTopic'
import { reviewsTabPath } from '@/lib/reviews/paths'
import {
  buildScorecardDetail,
  feedbackTextForRole,
  resolveReviewCycleKey,
  scorecardDetailPath,
} from '@/lib/reviews/scorecards'
import {
  feedbackRoleForViewStage,
  gradeForViewStage,
} from '@/lib/reviews/scorecardStages'
import {
  defaultReviewPolicy,
  enabledPillars,
  gradesGoalsSeparately,
  gradesOverall,
} from '@/lib/reviews/reviewPolicy'
import { getReviewCycle } from '@/lib/reviews/store'
import { resolveCyclePolicyForPerson } from '@/lib/reviews/cycleGroups'
import type { ReviewPacket } from '@/lib/reviews/types'
import { OverallGradePicker } from '@/pages/reviews/OverallGradePicker'
import { ReviewPacketView } from '@/pages/reviews/ReviewPacketView'
import { ScorecardFeedbackCard } from '@/pages/reviews/ScorecardFeedbackCard'
import { AnnualGoalsQuarters } from '@/pages/reviews/AnnualGoalsQuarters'
import { ScorecardGoalsCard } from '@/pages/reviews/ScorecardGoalsCard'
import { useAnnualLinkedQuarters } from '@/pages/reviews/useAnnualLinkedQuarters'
import { ScorecardHero } from '@/pages/reviews/ScorecardHero'
import { useScorecardViewStage } from '@/pages/reviews/useScorecardViewStage'
import {
  ReviewActionIsland,
  ReviewSaveBanner,
  type ReviewSaveNotice,
} from '@/pages/reviews/ReviewSaveBanner'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

export default function ScorecardDetailPage() {
  const { cycleKey = '', employeeId: employeeIdParam } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const employeeId = Number(employeeIdParam)
  const { user } = useAuth()
  const { employees, isLoading } = useEmployees()
  const resolvedCycleId = useMemo(
    () => resolveReviewCycleKey(cycleKey),
    [cycleKey],
  )
  const [goalsRevision, setGoalsRevision] = useState(0)
  const [packet, setPacket] = useState<ReviewPacket | null>(null)
  const [packetReady, setPacketReady] = useState(false)
  const [saveNotice, setSaveNotice] = useState<ReviewSaveNotice | null>(null)
  const editing = searchParams.get('mode') === 'edit'
  const incomingNotice = (
    location.state as { reviewNotice?: ReviewSaveNotice } | null
  )?.reviewNotice
  const cycle = getReviewCycle(resolvedCycleId)
  const policyResolution = cycle
    ? resolveCyclePolicyForPerson(cycle, employeeId)
    : null
  const policy =
    policyResolution?.settings.reviewPolicy ??
    defaultReviewPolicy(cycle?.purpose ?? 'quarterly_checkin')
  const goalsPillar = enabledPillars(policy).find((pillar) => pillar.id === 'goals')
  const linkedQuarters = useAnnualLinkedQuarters({
    cycle,
    employeeId,
    goalsPillar,
    goalsRevision,
  })

  useEffect(() => {
    let cancelled = false
    void selectGoalCycle(resolvedCycleId).then(() => {
      if (!cancelled) setGoalsRevision((value) => value + 1)
    })
    return () => {
      cancelled = true
    }
  }, [resolvedCycleId])

  useEffect(() => {
    return subscribeGoalsStore(() => setGoalsRevision((value) => value + 1))
  }, [])

  useEffect(() => {
    if (!incomingNotice) return
    setSaveNotice(incomingNotice)
    navigate('.', { replace: true, state: null })
  }, [incomingNotice, navigate])

  useEffect(() => {
    if (!Number.isInteger(employeeId) || employeeId <= 0) return
    let cancelled = false
    setPacketReady(false)
    void fetchReviewPacket(resolvedCycleId, employeeId)
      .then((next) => {
        if (!cancelled) setPacket(next)
      })
      .catch(() => {
        if (!cancelled) setPacket(null)
      })
      .finally(() => {
        if (!cancelled) setPacketReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [employeeId, resolvedCycleId])

  const refreshLivePacket = useCallback(
    (event: { cycleId?: string; employeeId?: string }) => {
      if (!Number.isInteger(employeeId) || employeeId <= 0) return
      if (event.cycleId && event.cycleId !== resolvedCycleId) return
      if (event.employeeId && event.employeeId !== String(employeeId)) return
      void fetchReviewPacket(resolvedCycleId, employeeId)
        .then(setPacket)
        .catch(() => {
          /* Keep the open packet until the next event or navigation. */
        })
    },
    [employeeId, resolvedCycleId],
  )
  useLiveTopic('packets', refreshLivePacket)

  const detail = useMemo(() => {
    if (!Number.isInteger(employeeId) || employeeId <= 0) return null
    return buildScorecardDetail(
      cycleKey,
      employeeId,
      employees,
      user?.email,
      packet,
    )
  }, [cycleKey, employeeId, employees, goalsRevision, packet, user?.email])

  const stages = policyResolution?.stagesConfig.reviewStages
  const stageView = useScorecardViewStage({
    packet,
    stages,
    viewerEmployeeId: user?.employeeId,
  })
  const viewingGrade = gradeForViewStage(
    packet,
    stageView.viewing,
    user?.employeeId,
  )
  const viewingFeedback = feedbackTextForRole(
    packet?.answers ?? [],
    feedbackRoleForViewStage(stageView.viewing),
  )

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return <Navigate to={reviewsTabPath('scorecards')} replace />
  }

  if (editing) {
    return <ReviewPacketView cycleId={resolvedCycleId} employeeId={employeeId} />
  }

  if (!detail) {
    if (isLoading || !packetReady) {
      return (
        <PageStatus
          variant="loading"
          pageClassName="pd-reviews"
          aria-label="Loading performance review"
          description="Loading performance review details…"
        />
      )
    }
    return <Navigate to={reviewsTabPath('scorecards')} replace />
  }

  return (
    <div
      className="pd-page pd-page--wide pd-reviews pd-reviews-scorecard pd-review-packet"
      aria-label={`${detail.employeeName} performance review`}
    >
      <ReviewSaveBanner
        notice={saveNotice}
        onDismiss={() => setSaveNotice(null)}
      />
      <ScorecardHero
        detail={detail}
        packet={packet}
        stages={stages}
        viewerEmployeeId={user?.employeeId}
        viewingStage={stageView.viewing}
        onViewStage={stageView.selectStage}
      />

      {linkedQuarters.enabled ? (
        <AnnualGoalsQuarters
          rows={linkedQuarters.rows}
          goalsByCycleId={linkedQuarters.goalsByCycleId}
          q4Goals={linkedQuarters.q4Goals}
          q4CycleId={linkedQuarters.progressRow?.sourceCycleId}
          personId={String(detail.employeeId)}
          owner={{
            id: String(detail.employeeId),
            name: detail.employeeName,
            avatarUrl: detail.employeeAvatarUrl || undefined,
          }}
        />
      ) : (
        <ScorecardGoalsCard
          cycleId={resolvedCycleId}
          personId={String(detail.employeeId)}
          owner={{
            id: String(detail.employeeId),
            name: detail.employeeName,
            avatarUrl: detail.employeeAvatarUrl || undefined,
          }}
          cycleLabel={detail.cycleLabel}
          goals={
            getGoalsSnapshotForCycle(resolvedCycleId).byPerson[
              String(detail.employeeId)
            ]?.goals ?? []
          }
          overallPercent={detail.goalsOverallPercent}
          overallBand={
            gradesGoalsSeparately(policy) ? detail.goalsOverallBand : null
          }
          goalsHref={goalsDetailPath(resolvedCycleId, String(detail.employeeId))}
        />
      )}

      {gradesOverall(policy) ? (
        <section className="pd-reviews-scorecard__card">
          <OverallGradePicker
            name="scorecard-overall-grade"
            value={viewingGrade ?? ''}
            disabled
          />
        </section>
      ) : null}

      {stageView.viewing === 'calibration_hod_hrbp' ? (
        <section
          className="pd-reviews-scorecard__card"
          aria-label="Calibration"
        >
          <h2 className="pd-reviews-scorecard__section-title">Calibration</h2>
          {(packet?.calibrationEvents.length ?? 0) === 0 ? (
            <p className="pd-reviews-flow__hint">No calibration notes yet.</p>
          ) : (
            <ol className="pd-reviews-scorecard__events">
              {packet?.calibrationEvents.map((event) => (
                <li key={event.id}>
                  {event.actorName || 'Calibrator'} changed{' '}
                  {event.fromGrade ?? '—'} to {event.toGrade}
                  {event.reason ? `: ${event.reason}` : ''}
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {stageView.viewing === 'appeal' ? (
        <section className="pd-reviews-scorecard__card" aria-label="Appeal">
          <h2 className="pd-reviews-scorecard__section-title">Appeal</h2>
          {(packet?.appeals.length ?? 0) === 0 ? (
            <p className="pd-reviews-flow__hint">No appeal on this review.</p>
          ) : (
            <p className="pd-reviews-scorecard__feedback-box">
              {packet?.appeals[0]?.body}
            </p>
          )}
        </section>
      ) : (
        <ScorecardFeedbackCard
          feedback={{
            ...detail.feedback,
            authorName:
              stageView.viewing === 'self_review'
                ? detail.employeeName
                : detail.reviewerName,
            authorRole: stageView.viewing === 'self_review' ? 'Self' : 'LM',
            strengths: viewingFeedback.strengths,
            developments: viewingFeedback.developments,
          }}
        />
      )}

      <ReviewActionIsland>
        <div className="pd-review-packet__island">
          <div className="pd-review-packet__actions">
            <Link
              to={`${scorecardDetailPath(detail.cycleKey, detail.employeeId)}?mode=edit&stage=${stageView.viewing}`}
              className="pd-btn pd-btn--primary pd-btn--md pd-btn--pill"
            >
              <span className="pd-btn__label">
                <Pencil size={16} strokeWidth={1.75} aria-hidden />
                Edit
              </span>
            </Link>
          </div>
        </div>
      </ReviewActionIsland>
    </div>
  )
}
