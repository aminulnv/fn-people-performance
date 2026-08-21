import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog } from '@/components/ui'
import { formatDateRange } from '@/lib/reviews/periods'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { useState } from 'react'

function peopleCountLabel(count: number): string {
  return count === 1 ? '1 person' : `${count} people`
}

type CycleGroupsSectionProps = {
  cycle: ReviewCycle
  onAddGroup: () => void
  onDelete: (groupId: string) => void
  onOpenGroup: (groupId: string) => void
}

export function CycleGroupsSection({
  cycle,
  onAddGroup,
  onDelete,
  onOpenGroup,
}: CycleGroupsSectionProps) {
  const groups = cycle.groups ?? []
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const pendingDelete = groups.find((group) => group.id === deleteId)

  return (
    <section
      className="pd-reviews-settings__section"
      aria-labelledby="cycle-groups-heading"
    >
      <div className="pd-reviews-settings__section-head">
        <div className="pd-reviews-settings__section-title-row">
          <h3
            className="pd-reviews-settings__section-title"
            id="cycle-groups-heading"
          >
            Groups
          </h3>
          {groups.length > 0 ? (
            <span className="pd-reviews-settings__section-count">
              {groups.length === 1 ? '1 group' : `${groups.length} groups`}
            </span>
          ) : null}
        </div>
        {groups.length > 0 ? (
          <Button variant="primary" size="sm" pill onClick={onAddGroup}>
            <Plus size={14} strokeWidth={2} aria-hidden />
            Add group
          </Button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <div className="pd-cycle-groups__empty">
          <p className="pd-cycle-groups__empty-title">No groups yet</p>
          <Button variant="primary" pill onClick={onAddGroup}>
            <Plus size={14} strokeWidth={2} aria-hidden />
            Create first group
          </Button>
        </div>
      ) : (
        <div className="pd-cycle-groups__table-wrap">
          <table className="pd-cycle-groups__table">
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">People</th>
                <th scope="col">Goals</th>
                <th scope="col">Reviews</th>
                <th scope="col">Calibration</th>
                <th scope="col">
                  <span className="pd-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  onOpen={() => onOpenGroup(group.id)}
                  onDelete={() => setDeleteId(group.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id)
          setDeleteId(null)
        }}
        title="Delete group?"
        description={
          pendingDelete
            ? `Delete “${pendingDelete.name}”? Those people will not be in this cycle until you add them to another group.`
            : ''
        }
        confirmLabel="Delete group"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
    </section>
  )
}

function GroupRow({
  group,
  onOpen,
  onDelete,
}: {
  group: CycleGroup
  onOpen: () => void
  onDelete: () => void
}) {
  const goalWindow = group.stagesConfig.goals.employee
  const reviewWindow = group.stagesConfig.performance

  return (
    <tr
      className="pd-cycle-groups__row"
      tabIndex={0}
      onClick={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('button')) return
        onOpen()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        if ((event.target as HTMLElement).closest('button')) return
        event.preventDefault()
        onOpen()
      }}
    >
      <th scope="row">
        <button
          type="button"
          className="pd-cycle-groups__name"
          onClick={onOpen}
        >
          {group.name}
        </button>
      </th>
      <td className="pd-cycle-groups__people-count">
        {peopleCountLabel(group.memberIds.length)}
      </td>
      <td className="pd-cycle-groups__date">
        {formatDateRange(goalWindow.startDate, goalWindow.endDate)}
      </td>
      <td className="pd-cycle-groups__date">
        {formatDateRange(
          reviewWindow.managerStart.date,
          reviewWindow.managerEnd.date,
        )}
      </td>
      <td className="pd-cycle-groups__date">
        {group.stagesConfig.calibration.enabled
          ? formatDateRange(
              group.stagesConfig.calibration.start.date,
              group.stagesConfig.calibration.end.date,
            )
          : '—'}
      </td>
      <td>
        <div className="pd-cycle-groups__row-actions">
          <Button
            variant="ghost"
            size="sm"
            pill
            aria-label={`Delete ${group.name}`}
            onClick={onDelete}
          >
            <Trash2 size={14} strokeWidth={2} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            pill
            aria-label={`Edit ${group.name}`}
            onClick={onOpen}
          >
            <Pencil size={14} strokeWidth={2} aria-hidden />
          </Button>
        </div>
      </td>
    </tr>
  )
}
