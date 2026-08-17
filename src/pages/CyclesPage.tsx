import { CyclesList } from './reviews/CyclesList'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

export default function CyclesPage() {
  return (
    <div
      className="pd-page pd-page--pane pd-reviews"
      aria-label="Performance Cycles"
    >
      <CyclesList />
    </div>
  )
}
