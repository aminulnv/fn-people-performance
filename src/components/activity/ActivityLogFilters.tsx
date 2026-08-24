import { Input, Select } from '@/components/ui'
import type { ActivityListFilters } from '@/lib/activity/types'

const ENTITY_OPTIONS = [
  { value: '', label: 'All areas' },
  { value: 'goal', label: 'Goals' },
  { value: 'goal_submission', label: 'Goal submissions' },
  { value: 'review_packet', label: 'Reviews' },
  { value: 'review_cycle', label: 'Cycles' },
  { value: 'employee', label: 'People' },
  { value: 'department', label: 'Organisation' },
  { value: 'manager_delegation', label: 'Delegations' },
  { value: 'access', label: 'Access' },
]

/**
 * Filter bar for the organisation-wide Activity log.
 * Kept visible — this page is a search surface, not a workflow CTA.
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
  return (
    <div className="pd-activity-filters">
      <div className="pd-activity-filters__grid">
        {showEntity ? (
          <Select
            label="Area"
            value={value.entityType ?? ''}
            options={ENTITY_OPTIONS}
            onChange={(event) =>
              onChange({
                ...value,
                entityType: event.target.value || undefined,
              })
            }
          />
        ) : null}
        {showDates ? (
          <>
            <Input
              type="date"
              label="From"
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
            <Input
              type="date"
              label="To"
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
          </>
        ) : null}
      </div>
    </div>
  )
}
