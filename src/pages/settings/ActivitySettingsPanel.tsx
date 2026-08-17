import { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { ActivityLog } from '@/components/activity/ActivityLog'
import { ActivityLogFilters } from '@/components/activity/ActivityLogFilters'
import { useActivityFeed } from '@/components/activity/useActivityFeed'
import type { ActivityListFilters } from '@/lib/activity/types'
import '@/styles/layout-activity.css'

/** Global Activity search for users with activity.read_all / platform.read_all. */
export function ActivitySettingsPanel() {
  const [filters, setFilters] = useState<ActivityListFilters>({ limit: 50 })
  const queryFilters = useMemo(() => ({ ...filters, limit: 50 }), [filters])
  const {
    events,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useActivityFeed(queryFilters)

  return (
    <section
      className="pd-settings-section"
      aria-labelledby="activity-heading"
    >
      <div className="pd-settings-section__header">
        <div className="pd-access__heading">
          <span className="pd-access__heading-icon" aria-hidden>
            <History size={17} strokeWidth={2.25} />
          </span>
          <div>
            <h2 id="activity-heading" className="pd-settings-section__title">
              Activity log
            </h2>
            <p className="pd-settings-section__hint">
              Organisation-wide history for tracing changes. This is reference
              material, not a workflow action.
            </p>
          </div>
        </div>
      </div>

      <ActivityLogFilters value={filters} onChange={setFilters} />

      <div style={{ marginTop: '1rem' }}>
        {isLoading ? <p className="pd-activity-log__empty">Loading…</p> : null}
        {error ? (
          <p className="pd-activity-log__empty">Could not load activity.</p>
        ) : null}
        {!isLoading && !error ? (
          <>
            <ActivityLog events={events} />
            {hasNextPage ? (
              <button
                type="button"
                className="pd-activity-link"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load older activity'}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
