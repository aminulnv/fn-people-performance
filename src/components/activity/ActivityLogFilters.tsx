import { useState } from 'react'
import type { ActivityListFilters } from '@/lib/activity/types'

const ENTITY_OPTIONS = [
  { value: '', label: 'All areas' },
  { value: 'goal', label: 'Goals' },
  { value: 'goal_submission', label: 'Goal submissions' },
  { value: 'review_cycle', label: 'Cycles' },
  { value: 'employee', label: 'Employees' },
  { value: 'department', label: 'Departments' },
  { value: 'access', label: 'Access' },
] as const

/**
 * Collapsed-by-default filters for Activity Log.
 * Only expand when the viewer needs to narrow a large feed.
 */
export function ActivityLogFilters({
  value,
  onChange,
  showEntity = true,
  showDates = true,
}: {
  value: ActivityListFilters
  onChange: (next: ActivityListFilters) => void
  showEntity?: boolean
  showDates?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="pd-activity-filters">
      <button
        type="button"
        className="pd-activity-link"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? 'Hide filters' : 'Show filters'}
      </button>
      {open ? (
        <div className="pd-activity-filters__grid">
          {showEntity ? (
            <label>
              Area
              <select
                value={value.entityType ?? ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    entityType: event.target.value || undefined,
                  })
                }
              >
                {ENTITY_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {showDates ? (
            <>
              <label>
                From
                <input
                  type="date"
                  value={(value.from ?? '').slice(0, 10)}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      from: event.target.value
                        ? `${event.target.value}T00:00:00.000Z`
                        : undefined,
                    })
                  }
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={(value.to ?? '').slice(0, 10)}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      to: event.target.value
                        ? `${event.target.value}T23:59:59.999Z`
                        : undefined,
                    })
                  }
                />
              </label>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
