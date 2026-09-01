import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, GitFork, History, Maximize2, MoreHorizontal, Trash2 } from 'lucide-react'
import { ConfirmDialog, DropdownMenu, type DropdownMenuItem } from '@/components/ui'
import {
  GoalCascadeTargetDialog,
  type CascadeTarget,
} from './GoalCascadeTargetDialog'
import {
  GoalDuplicateCycleDialog,
  type DuplicateCycleOption,
} from './GoalDuplicateCycleDialog'
import { ActivityLogDrawer } from '@/components/activity/ActivityLogDrawer'
import '@/styles/layout-activity.css'

export type { DuplicateCycleOption }

export function hasGoalActions({
  onDuplicate,
  onCascade,
  onRemove,
  canRemove = false,
  onViewActivity,
  fullViewHref,
  extraItems,
}: {
  onDuplicate?: unknown
  onCascade?: unknown
  onRemove?: unknown
  canRemove?: boolean
  onViewActivity?: unknown
  fullViewHref?: string
  extraItems?: { length?: number }
}) {
  return Boolean(
    extraItems?.length ||
      fullViewHref ||
      onDuplicate ||
      onCascade ||
      (canRemove && onRemove) ||
      onViewActivity,
  )
}

function ToolbarButton({
  label,
  ariaLabel,
  danger = false,
  disabled,
  onClick,
  children,
}: {
  label: string
  ariaLabel?: string
  danger?: boolean
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`pd-people__ghost-btn${
        danger ? ' pd-people__ghost-btn--danger' : ''
      }`}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {label}
    </button>
  )
}

export function GoalActionsMenu({
  variant = 'toolbar',
  label = 'More Actions',
  canCascade = false,
  canRemove = false,
  cascadeTargets = [],
  duplicateCycles = [],
  defaultDuplicateCycleId,
  activityFilters,
  fullViewHref,
  extraItems = [],
  onDuplicate,
  onCascade,
  onRemove,
}: {
  variant?: 'toolbar' | 'menu'
  label?: string
  canCascade?: boolean
  canRemove?: boolean
  cascadeTargets?: CascadeTarget[]
  /** Cycles the duplicated goal can be placed into. */
  duplicateCycles?: DuplicateCycleOption[]
  defaultDuplicateCycleId?: string
  activityFilters?: {
    goalId?: string
    cycleId?: string
    subjectEmployeeId?: number
  }
  /** Opens the unified goal detail page in the main window. */
  fullViewHref?: string
  extraItems?: DropdownMenuItem[]
  onDuplicate?: (cycleId: string) => void
  onCascade?: (reportIds: string[]) => void
  onRemove?: () => void
}) {
  const navigate = useNavigate()
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [cascadeOpen, setCascadeOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const canViewActivity = Boolean(activityFilters)
  const defaultCycleId =
    defaultDuplicateCycleId ??
    duplicateCycles[0]?.id ??
    activityFilters?.cycleId ??
    ''

  if (
    !hasGoalActions({
      onDuplicate,
      onCascade,
      onRemove,
      canRemove,
      onViewActivity: canViewActivity,
      fullViewHref,
      extraItems,
    })
  ) {
    return null
  }

  const openDuplicate = () => {
    if (!onDuplicate) return
    if (duplicateCycles.length === 0) {
      if (defaultCycleId) onDuplicate(defaultCycleId)
      return
    }
    setDuplicateOpen(true)
  }

  const dialogs = (
    <>
      {onDuplicate && duplicateCycles.length > 0 ? (
        <GoalDuplicateCycleDialog
          open={duplicateOpen}
          cycles={duplicateCycles}
          defaultCycleId={defaultCycleId}
          onClose={() => setDuplicateOpen(false)}
          onConfirm={onDuplicate}
        />
      ) : null}
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
      {canRemove && onRemove ? (
        <ConfirmDialog
          open={removeOpen}
          onClose={() => setRemoveOpen(false)}
          onConfirm={() => {
            setRemoveOpen(false)
            onRemove()
          }}
          title="Remove this goal?"
          description="This goal will be removed from the current cycle. This cannot be undone."
          confirmLabel="Remove Goal"
          cancelLabel="Keep Goal"
          confirmVariant="danger"
        />
      ) : null}
    </>
  )

  if (variant === 'menu') {
    const items = [
      ...extraItems,
      onDuplicate
        ? {
            id: 'duplicate',
            label: 'Duplicate',
            icon: <Copy size={16} strokeWidth={1.75} />,
            onSelect: openDuplicate,
          }
        : null,
      onCascade
        ? {
            id: 'cascade',
            label: 'Cascade',
            icon: <GitFork size={16} strokeWidth={1.75} />,
            disabled: !canCascade,
            onSelect: () => setCascadeOpen(true),
          }
        : null,
      fullViewHref
        ? {
            id: 'full-view',
            label: 'Full View',
            icon: <Maximize2 size={16} strokeWidth={1.75} />,
            onSelect: () => {
              navigate(fullViewHref)
            },
          }
        : null,
      canViewActivity
        ? {
            id: 'activity',
            label: 'Activity',
            icon: <History size={16} strokeWidth={1.75} />,
            onSelect: () => setActivityOpen(true),
          }
        : null,
      canRemove && onRemove
        ? {
            id: 'remove',
            label: 'Remove',
            danger: true,
            icon: <Trash2 size={16} strokeWidth={1.75} />,
            onSelect: () => setRemoveOpen(true),
          }
        : null,
    ].filter((item) => item != null)

    return (
      <>
        <DropdownMenu
          label={label}
          align="end"
          trigger={
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
          }
          triggerProps={{
            className: 'pd-people__icon-btn',
            'aria-label': label,
            title: 'More Actions',
          }}
          items={items}
        />
        {dialogs}
      </>
    )
  }

  return (
    <>
      {onDuplicate ? (
        <ToolbarButton label="Duplicate" onClick={openDuplicate}>
          <Copy size={16} strokeWidth={1.75} aria-hidden />
        </ToolbarButton>
      ) : null}
      {onCascade ? (
        <ToolbarButton
          label="Cascade"
          ariaLabel="Cascade This Goal"
          disabled={!canCascade}
          onClick={() => {
            if (!canCascade) return
            setCascadeOpen(true)
          }}
        >
          <GitFork size={16} strokeWidth={1.75} aria-hidden />
        </ToolbarButton>
      ) : null}
      {fullViewHref ? (
        <Link className="pd-people__ghost-btn" to={fullViewHref}>
          <Maximize2 size={16} strokeWidth={1.75} aria-hidden />
          Full View
        </Link>
      ) : null}
      {canViewActivity ? (
        <ToolbarButton
          label="Activity"
          onClick={() => setActivityOpen(true)}
        >
          <History size={16} strokeWidth={1.75} aria-hidden />
        </ToolbarButton>
      ) : null}
      {canRemove && onRemove ? (
        <ToolbarButton
          label="Remove"
          danger
          onClick={() => setRemoveOpen(true)}
        >
          <Trash2 size={16} strokeWidth={1.75} aria-hidden />
        </ToolbarButton>
      ) : null}
      {dialogs}
    </>
  )
}
