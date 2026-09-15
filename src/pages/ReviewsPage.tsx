import { ReviewsTabs } from './reviews/ReviewsTabs'
import { ScorecardsList } from './reviews/ScorecardsList'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

export default function ReviewsPage() {
  return (
    <div
      className="pd-page pd-page--pane pd-page--wide pd-reviews"
      aria-label="Performance reviews"
    >
      <ReviewsTabs current="scorecards" />
      <ScorecardsList />
    </div>
  )
}
