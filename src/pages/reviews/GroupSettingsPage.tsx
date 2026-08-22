import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { cycleDetailPath, cyclesListPath } from '@/lib/reviews/paths'
import { clearReviewsMutationError, getReviewCycle } from '@/lib/reviews/store'
import { useReviewsSnapshot } from '@/lib/reviews/useReviews'
import { GroupSettingsView } from './GroupSettingsView'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

export default function GroupSettingsPage() {
  const { cycleId = '', groupId = '' } = useParams()
  const navigate = useNavigate()
  const snapshot = useReviewsSnapshot()
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
    return <Navigate to={cyclesListPath()} replace />
  }

  if (!group) {
    return <Navigate to={cycleDetailPath(cycle.id)} replace />
  }

  return (
    <div className="pd-page pd-reviews pd-reviews--cycle" aria-label={group.name}>
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
      />
    </div>
  )
}
