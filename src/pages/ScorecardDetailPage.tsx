import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'
import { reviewsTabPath } from '@/lib/reviews/paths'
import { resolveReviewCycleKey } from '@/lib/reviews/scorecards'
import { useReviewsSnapshot } from '@/lib/reviews/useReviews'
import { ReviewPacketView } from '@/pages/reviews/ReviewPacketView'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

/** One scorecard page — view and edit share the same body via `?mode=edit`. */
export default function ScorecardDetailPage() {
  const { cycleKey = '', employeeId: employeeIdParam } = useParams()
  const [searchParams] = useSearchParams()
  const employeeId = Number(employeeIdParam)
  const editing = searchParams.get('mode') === 'edit'
  const { cycles } = useReviewsSnapshot()
  const resolvedCycleId = useMemo(
    () => resolveReviewCycleKey(cycleKey),
    [cycleKey, cycles],
  )

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return <Navigate to={reviewsTabPath('scorecards')} replace />
  }

  return (
    <ReviewPacketView
      cycleId={resolvedCycleId}
      employeeId={employeeId}
      editing={editing}
    />
  )
}
