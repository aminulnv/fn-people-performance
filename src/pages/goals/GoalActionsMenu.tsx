import { useEffect, useRef, useState } from 'react'
import { Copy, GitFork, History, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  GoalCascadeTargetDialog,
  type CascadeTarget,
} from './GoalCascadeTargetDialog'
import { ActivityLogDrawer } from '@/components/activity/ActivityLogDrawer'
import '@/styles/layout-activity.css'

export function hasGoalActions({
  onDuplicate,
  onCascade,
  onRemove,
  canRemove = false,
  onViewActivity,
}: {
  onDuplicate?: unknown
  onCascade?: unknown
  onRemove?: unknown
  canRemove?: boolean
  onViewActivity?: unknown
}) {
  return Boolean(
    onDuplicate || onCascade || (canRemove && onRemove) || onViewActivity,
  )
}

export function GoalActionsMenu({
  label = 'More actions',
  canCascade = false,
  canRemove = false,
  cascadeTargets = [],
  activityFilters,
  onDuplicate,
  onCascade,
  onRemove,
}: {
  label?: string
  canCascade?: boolean
  canRemove?: boolean
  cascadeTargets?: CascadeTarget[]
  activityFilters?: {
    goalId?: string
    cycleId?: string
    subjectEmployeeId?: number
  }
  onDuplicate?: () => void
  onCascade?: (reportIds: string[]) => void
  onRemove?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cascadeOpen, setCascadeOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const canViewActivity = Boolean(activityFilters)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  if (
    !hasGoalActions({
      onDuplicate,
      onCascade,
      onRemove,
      canRemove,
      onViewActivity: canViewActivity,
    })
  ) {
    return null
  }

  return (
    <>
      <div ref={menuRef} className="pd-goal-view__menu">
        <button
          type="button"
          className="pd-people__icon-btn"
          aria-label={label}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
        </button>
        {menuOpen ? (
          <div className="pd-goal-view__menu-panel" role="menu">
            {onDuplicate ? (
              <button
                type="button"
                role="menuitem"
                className="pd-goal-view__menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  onDuplicate()
                }}
              >
                <Copy size={15} strokeWidth={1.75} aria-hidden />
                Duplicate
              </button>
            ) : null}
            {onCascade ? (
              <button
                type="button"
                role="menuitem"
                className="pd-goal-view__menu-item"
                disabled={!canCascade}
                title={
                  canCascade
                    ? 'Create a child goal for selected reports'
                    : 'No direct reports to cascade to'
                }
                onClick={() => {
                  if (!canCascade) return
                  setMenuOpen(false)
                  setCascadeOpen(true)
                }}
              >
                <GitFork size={15} strokeWidth={1.75} aria-hidden />
                Cascade This Goal
              </button>
            ) : null}
            {canViewActivity ? (
              <button
                type="button"
                role="menuitem"
                className="pd-goal-view__menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  setActivityOpen(true)
                }}
              >
                <History size={15} strokeWidth={1.75} aria-hidden />
                View activity
              </button>
            ) : null}
            {canRemove && onRemove ? (
              <button
                type="button"
                role="menuitem"
                className="pd-goal-view__menu-item pd-goal-view__menu-item--danger"
                onClick={() => {
                  setMenuOpen(false)
                  onRemove()
                }}
              >
                <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                Remove Goal
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {onCascade ? (
        <GoalCascadeTargetDialog
          open={cascadeOpen}
          targets={cascadeTargets}
          onClose={() => setCascadeOpen(false)}
          onConfirm={onCascade}
        />
      ) : null}
      {canViewActivity && activityFilters ? (
        <ActivityLogDrawer
          open={activityOpen}
          onClose={() => setActivityOpen(false)}
          title="Goal activity"
          filters={activityFilters}
        />
      ) : null}
    </>
  )
}
