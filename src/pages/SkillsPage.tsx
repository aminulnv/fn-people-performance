import { SkillsLibrary } from './reviews/SkillsLibrary'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

export default function SkillsPage() {
  return (
    <div
      className="pd-page pd-page--pane pd-page--wide pd-reviews"
      aria-label="Skills library"
    >
      <SkillsLibrary />
    </div>
  )
}
