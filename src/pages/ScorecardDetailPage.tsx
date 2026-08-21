import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { resolveReviewCycleKey } from '@/lib/reviews/scorecards'
import { reviewsTabPath } from '@/lib/reviews/paths'
import { ReviewPacketView } from '@/pages/reviews/ReviewPacketView'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

export default function ScorecardDetailPage() {
  const { cycleKey = '', employeeId: employeeIdParam } = useParams()
  const employeeId = Number(employeeIdParam)
  const cycleId = useMemo(() => resolveReviewCycleKey(cycleKey), [cycleKey])

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return <Navigate to={reviewsTabPath('scorecards')} replace />
  }

  return <ReviewPacketView cycleId={cycleId} employeeId={employeeId} />
}
