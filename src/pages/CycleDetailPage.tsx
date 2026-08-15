import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Hourglass,
  Lock,
  MoreHorizontal,
  Plus,
  Target,
  Trash2,
} from 'lucide-react'
import {
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
} from '@/components/ui'
import { setActiveCycle } from '@/lib/goals/store'
import { isCycleSection } from '@/lib/reviews/cycleSections'
import { cycleDetailPath, reviewsTabPath } from '@/lib/reviews/paths'
import {
  createTestCycle,
  deleteReviewCycle,
  getReviewCycle,
} from '@/lib/reviews/store'
import {
  cycleStatusLabel,
  resolveCycleStatus,
} from '@/lib/reviews/status'
import type { CycleSectionId } from '@/lib/reviews/types'
import { useReviewsSnapshot } from '@/lib/reviews/useReviews'
import { CycleSettingsView } from './reviews/CycleSettingsView'
import '@/styles/layout-reviews.css'
import '@/styles/layout-people.css'

const SECTION_EMPTY: Record<
  Exclude<CycleSectionId, 'settings' | 'goals'>,
  { title: string; description: string }
> = {
  performance: {
    title: 'Performance review',
    description:
      'Scorecard progress, submissions, and manager reviews will live here.',
  },
  calibration: {
    title: 'Calibration',
    description:
      'Calibration sessions and grade distribution tools will appear here.',
  },
  results: {
    title: 'Results',
    description:
      'Published grades and outcomes for this cycle will show here once unlocked.',
  },
}

export default function CycleDetailPage() {
  const { cycleId = '', section } = useParams()
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

  const [menuError, setMenuError] = useState<string | null>(null)
  const [settingsEditing, setSettingsEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    setSettingsEditing(false)
    setMenuError(null)
    setDeleteOpen(false)
  }, [cycleId])

  if (!cycle) {
    return <Navigate to={reviewsTabPath('cycles')} replace />
  }

  if (!isCycleSection(section)) {
    return <Navigate to={cycleDetailPath(cycle.id, 'settings')} replace />
  }

  const status = resolveCycleStatus(cycle)
  const showCycleChrome = section !== 'settings' || !settingsEditing

  const handleCreateTest = () => {
    try {
      setMenuError(null)
      const test = createTestCycle(cycle.id)
      navigate(cycleDetailPath(test.id, 'settings'))
    } catch (err) {
      setMenuError(
        err instanceof Error ? err.message : 'Could not create test cycle.',
      )
    }
  }

  const handleDelete = () => {
    try {
      setMenuError(null)
      deleteReviewCycle(cycle.id)
      setDeleteOpen(false)
      navigate(reviewsTabPath('cycles'), { replace: true })
    } catch (err) {
      setDeleteOpen(false)
      setMenuError(
        err instanceof Error ? err.message : 'Could not delete cycle.',
      )
    }
  }

  return (
    <div className="pd-page pd-reviews pd-reviews--cycle" aria-label={cycle.name}>
      {showCycleChrome ? (
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
                title: 'More actions',
              }}
              items={[
                {
                  id: 'delete',
                  label: 'Delete Cycle',
                  danger: true,
                  icon: <Trash2 size={16} strokeWidth={1.75} />,
                  onSelect: () => setDeleteOpen(true),
                },
              ]}
            />
            <button
              type="button"
              className="pd-people__create-btn"
              onClick={handleCreateTest}
            >
              <Plus size={18} strokeWidth={2} aria-hidden />
              Create Test Cycle
            </button>
          </div>
        </header>
      ) : null}

      {menuError ? (
        <p className="pd-reviews-modal__error" role="alert">
          {menuError}
        </p>
      ) : null}

      {section === 'settings' ? (
        <CycleSettingsView
          key={cycle.id}
          cycle={cycle}
          onEditingChange={setSettingsEditing}
        />
      ) : section === 'goals' ? (
        <div className="pd-reviews__body">
          <EmptyState
            className="pd-empty--inline"
            icon={Target}
            title={`Goals · ${cycle.name}`}
            description="Goals for this review cycle are managed on the Goals page. Open Goals to select this cycle and add or review goals."
            action={
              <Link
                to="/goals"
                className="pd-people__create-btn"
                onClick={() => setActiveCycle(cycle.id)}
              >
                <Target size={18} strokeWidth={2} aria-hidden />
                Open goals for {cycle.name}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="pd-reviews__body">
          <EmptyState
            className="pd-empty--inline"
            icon={section === 'results' ? Lock : Hourglass}
            title={SECTION_EMPTY[section].title}
            description={SECTION_EMPTY[section].description}
          />
        </div>
      )}

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
    </div>
  )
}
