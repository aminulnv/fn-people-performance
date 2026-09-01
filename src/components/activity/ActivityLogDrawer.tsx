import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { History, X } from 'lucide-react'
import type { ActivityListFilters } from '@/lib/activity/types'
import { ActivityLog } from './ActivityLog'
import { isActivityFeedScoped } from './activityLogDisplay'
import { useActivityFeed } from './useActivityFeed'

function ActivityLogDrawerPanel({
  onClose,
  title,
  description,
  filters,
}: {
  onClose: () => void
  title: string
  description?: string
  filters: ActivityListFilters
}) {
  const panelRef = useRef<HTMLElement>(null)
  const queryFilters = useMemo(() => ({ ...filters, limit: 50 }), [filters])
  const {
    events,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useActivityFeed(queryFilters)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div className="pd-activity-drawer">
      <button
        type="button"
        className="pd-activity-drawer__scrim"
        aria-label="Close Activity"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="pd-activity-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="pd-activity-drawer__head">
          <div>
            <p className="pd-activity-drawer__eyebrow">Activity Log</p>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button
            type="button"
            className="pd-activity-drawer__close"
            aria-label="Close Activity"
            onClick={onClose}
          >
            <X size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </header>
        <div className="pd-activity-drawer__body">
          {isLoading ? <p className="pd-activity-log__empty">Loading…</p> : null}
          {error ? (
            <div className="pd-activity-log__status" role="alert">
              <p className="pd-activity-log__empty">Could not load activity.</p>
              <button
                type="button"
                className="pd-activity-link"
                onClick={() => void refetch()}
              >
                Try again
              </button>
            </div>
          ) : null}
          {!isLoading && !error ? (
            <>
              <ActivityLog events={events} scoped={isActivityFeedScoped(filters)} />
              {hasNextPage ? (
                <div className="pd-activity-log__more">
                  <button
                    type="button"
                    className="pd-activity-link"
                    disabled={isFetchingNextPage}
                    onClick={() => void fetchNextPage()}
                  >
                    {isFetchingNextPage ? 'Loading…' : 'Load older activity'}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>
    </div>,
    document.body,
  )
}

export function ActivityLogDrawer({
  open,
  onClose,
  title = 'Activity',
  description,
  filters,
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  filters: ActivityListFilters
}) {
  // Mount only while open so callers (and tests) do not need QueryClient until used.
  if (!open) return null
  return (
    <ActivityLogDrawerPanel
      onClose={onClose}
      title={title}
      description={description}
      filters={filters}
    />
  )
}

/** Quiet text/link trigger — never styled like a primary CTA. */
export function ActivityLogTrigger({
  label = 'View Activity',
  onClick,
  className = 'pd-activity-link',
}: {
  label?: string
  onClick: () => void
  className?: string
}) {
  return (
    <button type="button" className={className} onClick={onClick}>
      <History size={14} strokeWidth={2} aria-hidden />
      {label}
    </button>
  )
}

export function useActivityDrawer(filters: ActivityListFilters): {
  open: boolean
  openActivity: () => void
  closeActivity: () => void
  activityDrawer: ReactNode
} {
  const [open, setOpen] = useState(false)
  return {
    open,
    openActivity: () => setOpen(true),
    closeActivity: () => setOpen(false),
    activityDrawer: (
      <ActivityLogDrawer
        open={open}
        onClose={() => setOpen(false)}
        filters={filters}
      />
    ),
  }
}
