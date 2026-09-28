import { GoalEditLockNotice } from '@/pages/goals/GoalEditLockNotice'
import type { ReviewEditWindowLock } from '@/lib/reviews/editWindow'
import '@/styles/layout-goals.css'

/** Flush read-only strip that sits under the top bar on review pages. */
export function ReviewEditLockRibbon({
  lock,
}: {
  lock: ReviewEditWindowLock
}) {
  return (
    <div className="pd-reviews-lock-ribbon">
      <GoalEditLockNotice
        layout="ribbon"
        title={lock.title}
        message={lock.message}
        spoken={`${lock.title}. ${lock.message}`}
      />
    </div>
  )
}
