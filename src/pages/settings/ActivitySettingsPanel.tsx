import { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ActivityLog } from '@/components/activity/ActivityLog'
import { ActivityLogFilters } from '@/components/activity/ActivityLogFilters'
import { fetchActivity } from '@/lib/activity/api'
import type { ActivityListFilters } from '@/lib/activity/types'
import { queryKeys } from '@/lib/queryClient'
import '@/styles/layout-activity.css'

/** Global Activity search for users with activity.read_all / platform.read_all. */
export function ActivitySettingsPanel() {
  const [filters, setFilters] = useState<ActivityListFilters>({ limit: 50 })
  const queryFilters = useMemo(() => ({ ...filters, limit: 50 }), [filters])
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.activity(queryFilters),
    queryFn: () => fetchActivity(queryFilters),
  })

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
          <ActivityLog events={data?.items ?? []} />
        ) : null}
      </div>
    </section>
  )
}
