import { ValuesLibrary } from './reviews/ValuesLibrary'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

export default function ValuesPage() {
  return (
    <div
      className="pd-page pd-page--pane pd-page--wide pd-reviews"
      aria-label="Core Values library"
    >
      <ValuesLibrary />
    </div>
  )
}
