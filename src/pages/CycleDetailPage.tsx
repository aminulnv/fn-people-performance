import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  History,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  ConfirmDialog,
  DropdownMenu,
  PageStatus,
} from '@/components/ui'
import { ActivityLogDrawer } from '@/components/activity/ActivityLogDrawer'
import { isCycleSection } from '@/lib/reviews/cycleSections'
import { cycleDetailPath, cyclesListPath } from '@/lib/reviews/paths'
import {
  clearReviewsMutationError,
  createTestCycle,
  deleteReviewCycle,
  getReviewCycle,
} from '@/lib/reviews/store'
import {
  cycleStatusLabel,
  resolveCycleStatus,
} from '@/lib/reviews/status'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
} from '@/lib/reviews/useReviews'
import { CycleSettingsView } from './reviews/CycleSettingsView'
import {
  ReviewSaveBanner,
  successNotice,
  useLocationSaveNotice,
} from './reviews/ReviewSaveBanner'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'
import '@/styles/layout-activity.css'

export default function CycleDetailPage() {
  const { cycleId = '', section } = useParams()
  const navigate = useNavigate()
  const snapshot = useReviewsSnapshot()
  const cyclesHydrated = useReviewCyclesHydrated()
  const cycle = useMemo(
    () =>
      snapshot.cycles.find(
        (item) =>
          item.id === cycleId || item.id === decodeURIComponent(cycleId),
      ) ?? getReviewCycle(cycleId),
    [cycleId, snapshot.cycles],
  )

  const [menuError, setMenuError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [toastNotice, setToastNotice] = useLocationSaveNotice()

  useEffect(() => {
    setMenuError(null)
    setDeleteOpen(false)
    setActivityOpen(false)
  }, [cycleId])

  if (!cycle) {
    if (!cyclesHydrated) {
      return (
        <PageStatus
          variant="loading"
          pageClassName="pd-reviews"
          aria-label="Loading cycle"
          description="Loading cycle…"
        />
      )
    }
    return <Navigate to={cyclesListPath()} replace />
  }

  if (!isCycleSection(section)) {
    return <Navigate to={cycleDetailPath(cycle.id, 'settings')} replace />
  }

  const status = resolveCycleStatus(cycle)

  const handleCreateTest = async () => {
    try {
      setMenuError(null)
      const test = await createTestCycle(cycle.id)
      navigate(cycleDetailPath(test.id, 'settings'), {
        state: { saveNotice: successNotice('Test cycle created.') },
      })
    } catch (err) {
      setMenuError(
        err instanceof Error ? err.message : 'Could not create test cycle.',
      )
    }
  }

  const handleDelete = async () => {
    try {
      setMenuError(null)
      await deleteReviewCycle(cycle.id)
      setDeleteOpen(false)
      navigate(cyclesListPath(), {
        replace: true,
        state: { saveNotice: successNotice('Cycle deleted.') },
      })
    } catch (err) {
      setDeleteOpen(false)
      setMenuError(
        err instanceof Error ? err.message : 'Could not delete cycle.',
      )
    }
  }

  return (
    <div className="pd-page pd-reviews pd-reviews--cycle" aria-label={cycle.name}>
      <header className="pd-reviews-cycle-header">
        <div className="pd-reviews-cycle-header__title">
          <h1>{cycle.name}</h1>
          <span className={`pd-reviews-status pd-reviews-status--${status}`}>
            {cycleStatusLabel(status)}
          </span>
        </div>
        <div className="pd-reviews-cycle-header__actions">
          <DropdownMenu
            label="More cycle actions"
            align="end"
            className="pd-reviews-cycle-menu"
            trigger={
              <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
            }
            triggerProps={{
              className: 'pd-people__icon-btn',
              'aria-label': 'More cycle actions',
              title: 'More Actions',
            }}
            items={[
              {
                id: 'activity',
                label: 'View Activity',
                icon: <History size={16} strokeWidth={1.75} />,
                onSelect: () => setActivityOpen(true),
              },
              {
                id: 'create-test',
                label: 'Create Test Cycle',
                icon: <Plus size={16} strokeWidth={1.75} />,
                onSelect: () => {
                  void handleCreateTest()
                },
              },
              {
                id: 'delete',
                label: 'Delete Cycle',
                danger: true,
                icon: <Trash2 size={16} strokeWidth={1.75} />,
                onSelect: () => setDeleteOpen(true),
              },
            ]}
          />
        </div>
      </header>

      <ReviewSaveBanner
        notice={toastNotice}
        onDismiss={() => setToastNotice(null)}
      />

      {menuError ? (
        <p className="pd-reviews-modal__error" role="alert">
          {menuError}
        </p>
      ) : null}

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

      <CycleSettingsView key={cycle.id} cycle={cycle} />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete cycle?"
        description={`Delete “${cycle.name}”? This removes the cycle and its settings from this workspace.`}
        confirmLabel="Delete Cycle"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
      <ActivityLogDrawer
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        title={`${cycle.name} activity`}
        filters={{
          cycleId: cycle.id,
        }}
      />
    </div>
  )
}
