import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageStatus } from '@/components/ui'
import { cycleDetailPath, cyclesListPath } from '@/lib/reviews/paths'
import { clearReviewsMutationError, getReviewCycle } from '@/lib/reviews/store'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
} from '@/lib/reviews/useReviews'
import { GroupSettingsView } from './GroupSettingsView'
import {
  ReviewSaveBanner,
  successNotice,
  type ReviewSaveNotice,
} from './ReviewSaveBanner'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

export default function GroupSettingsPage() {
  const { cycleId = '', groupId = '' } = useParams()
  const navigate = useNavigate()
  const snapshot = useReviewsSnapshot()
  const [toastNotice, setToastNotice] = useState<ReviewSaveNotice | null>(null)
  const cyclesHydrated = useReviewCyclesHydrated()
  const cycle = useMemo(
    () =>
      snapshot.cycles.find(
        (item) =>
          item.id === cycleId || item.id === decodeURIComponent(cycleId),
      ) ?? getReviewCycle(cycleId),
    [cycleId, snapshot.cycles],
  )
  const group = useMemo(() => {
    if (!cycle) return null
    const decoded = decodeURIComponent(groupId)
    return (
      (cycle.groups ?? []).find(
        (item) => item.id === groupId || item.id === decoded,
      ) ?? null
    )
  }, [cycle, groupId])

  if (!cycle) {
    if (!cyclesHydrated) {
      return (
        <PageStatus
          variant="loading"
          pageClassName="pd-reviews"
          aria-label="Loading cycle group"
          description="Loading cycle group…"
        />
      )
    }
    return <Navigate to={cyclesListPath()} replace />
  }

  if (!group) {
    return <Navigate to={cycleDetailPath(cycle.id)} replace />
  }

  return (
    <div className="pd-page pd-reviews pd-reviews--cycle" aria-label={group.name}>
      <ReviewSaveBanner
        notice={toastNotice}
        onDismiss={() => setToastNotice(null)}
      />
      {snapshot.mutationError?.cycleId === cycle.id ? (
        <p className="pd-reviews-modal__error pd-reviews-save-error" role="alert">
          <span>{snapshot.mutationError.message}</span>
          <button
            type="button"
            className="pd-reviews-save-error__dismiss"
            onClick={clearReviewsMutationError}
          >
            Dismiss
          </button>
        </p>
      ) : null}

      <GroupSettingsView
        cycle={cycle}
        group={group}
        variant="page"
        onClose={() => navigate(cycleDetailPath(cycle.id))}
        onSuccess={(message) => setToastNotice(successNotice(message))}
      />
    </div>
  )
}
