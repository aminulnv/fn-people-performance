import { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui'
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
      className="pd-settings-section pd-activity-settings"
      aria-labelledby="activity-heading"
    >
      <div className="pd-settings-section__header">
        <div className="pd-activity-settings__heading">
          <span className="pd-activity-settings__heading-icon" aria-hidden>
            <History size={17} strokeWidth={2.25} />
          </span>
          <div>
            <h2 id="activity-heading" className="pd-settings-section__title">
              Activity Log
            </h2>
            <p className="pd-settings-section__hint">
              Organisation-wide history of goals, reviews, people, and access
              changes. This is a record, not a workflow action.
            </p>
          </div>
        </div>
      </div>

      <ActivityLogFilters value={filters} onChange={setFilters} />

      <div className="pd-activity-settings__feed">
        {isLoading ? <p className="pd-activity-log__empty">Loading…</p> : null}
        {error ? (
          <p className="pd-activity-log__empty">Could not load activity.</p>
        ) : null}
        {!isLoading && !error ? (
          <>
            <ActivityLog events={events} />
            {hasNextPage ? (
              <div className="pd-activity-log__more">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  Load Older Activity
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
