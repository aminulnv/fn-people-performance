import { useEffect, useMemo, useState } from 'react'
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
import { reviewsTabPath } from '@/lib/reviews/paths'
import {
  buildScorecardDetail,
  resolveReviewCycleKey,
  scorecardDetailPath,
} from '@/lib/reviews/scorecards'
import { getReviewCycle } from '@/lib/reviews/store'
import { resolveCyclePolicyForPerson } from '@/lib/reviews/cycleGroups'
import type { ReviewPacket } from '@/lib/reviews/types'
import { OverallGradePicker } from '@/pages/reviews/OverallGradePicker'
import { ReviewPacketView } from '@/pages/reviews/ReviewPacketView'
import { ScorecardFeedbackCard } from '@/pages/reviews/ScorecardFeedbackCard'
import { ScorecardGoalsCard } from '@/pages/reviews/ScorecardGoalsCard'
import { ScorecardHero } from '@/pages/reviews/ScorecardHero'
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

  const stages = policyResolution?.stagesConfig.reviewStages

  return (
    <div
      className="pd-page pd-page--wide pd-reviews pd-reviews-scorecard pd-review-packet"
      aria-label={`${detail.employeeName} performance review`}
    >
      <ReviewSaveBanner
        notice={saveNotice}
        onDismiss={() => setSaveNotice(null)}
      />
      <ScorecardHero detail={detail} packet={packet} stages={stages} />

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
        overallBand={detail.goalsOverallBand}
        goalsHref={goalsDetailPath(resolvedCycleId, String(detail.employeeId))}
      />

      <section className="pd-reviews-scorecard__card">
        <OverallGradePicker
          name="scorecard-overall-grade"
          value={detail.overallGrade ?? ''}
          disabled
        />
      </section>

      <ScorecardFeedbackCard feedback={detail.feedback} />

      <ReviewActionIsland>
        <div className="pd-review-packet__island">
          <div className="pd-review-packet__actions">
            <Link
              to={`${scorecardDetailPath(detail.cycleKey, detail.employeeId)}?mode=edit`}
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
