import { ScorecardsList } from './reviews/ScorecardsList'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

export default function ReviewsPage() {
  return (
    <div
      className="pd-page pd-page--pane pd-reviews"
      aria-label="Check-ins"
    >
      <ScorecardsList />
    </div>
  )
}
