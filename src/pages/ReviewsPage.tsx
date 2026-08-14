import { Navigate, useParams } from 'react-router-dom'
import { isReviewsTab } from '@/lib/reviews/tabs'
import { CyclesList } from './reviews/CyclesList'
import { ScorecardsList } from './reviews/ScorecardsList'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

export default function ReviewsPage() {
  const { tab } = useParams()

  if (!isReviewsTab(tab)) {
    return <Navigate to="/reviews/scorecards" replace />
  }

  if (tab === 'cycles') {
    return (
      <div className="pd-page pd-reviews" aria-label="Review cycles">
        <CyclesList />
      </div>
    )
  }

  return (
    <div className="pd-page pd-reviews" aria-label="Scorecards">
      <ScorecardsList />
    </div>
  )
}
