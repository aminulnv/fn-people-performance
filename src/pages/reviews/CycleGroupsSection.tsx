import { Plus, Trash2, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmDialog } from '@/components/ui'
import { peopleCountLabel } from '@/lib/reviews/groupSummary'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'

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
      <header className="pd-reviews-settings__section-head">
        <div>
          <div className="pd-reviews-settings__section-title-row">
            <h3
              className="pd-reviews-settings__section-title"
              id="cycle-groups-heading"
            >
              People In This Cycle
            </h3>
            {groups.length > 0 ? (
              <span className="pd-reviews-settings__section-count">
                {groups.length === 1 ? '1 group' : `${groups.length} groups`}
              </span>
            ) : null}
          </div>
          <p className="pd-reviews-settings__section-lede">
            A group is a set of people who follow the same rules. One group is
            enough unless some people need different dates or forms.
          </p>
        </div>
        {groups.length > 0 ? (
          <Button variant="primary" size="sm" pill onClick={onAddGroup}>
            <Plus size={14} strokeWidth={2} aria-hidden />
            Add Group
          </Button>
        ) : null}
      </header>

      <ul className="pd-cycle-setup__groups">
        {groups.map((group) => (
          <li key={group.id}>
            <GroupCard
              group={group}
              onOpen={() => onOpenGroup(group.id)}
              onDelete={() => setDeleteId(group.id)}
            />
          </li>
        ))}
        <li>
          <button
            type="button"
            className="pd-cycle-setup__group-create"
            onClick={onAddGroup}
          >
            <span className="pd-cycle-setup__group-create-icon" aria-hidden>
              <Plus size={18} strokeWidth={2.25} />
            </span>
            <span className="pd-cycle-setup__group-create-label">
              Create New Group
            </span>
          </button>
        </li>
      </ul>

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
        confirmLabel="Delete Group"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
    </section>
  )
}

function GroupCard({
  group,
  onOpen,
  onDelete,
}: {
  group: CycleGroup
  onOpen: () => void
  onDelete: () => void
}) {
  const people = peopleCountLabel(group.memberIds.length)
  const countId = `${group.id}-people-count`

  return (
    <article className="pd-cycle-setup__group">
      <button
        type="button"
        className="pd-cycle-setup__group-main"
        aria-label={group.name}
        aria-describedby={countId}
        onClick={onOpen}
      >
        <span className="pd-cycle-setup__group-icon" aria-hidden>
          <UsersRound size={28} strokeWidth={1.75} />
        </span>
        <span className="pd-cycle-setup__group-name">{group.name}</span>
        <span className="pd-cycle-setup__group-count" id={countId}>
          {people}
        </span>
      </button>
      <button
        type="button"
        className="pd-cycle-setup__group-delete"
        aria-label={`Delete ${group.name}`}
        onClick={onDelete}
      >
        <Trash2 size={14} strokeWidth={2} aria-hidden />
      </button>
    </article>
  )
}
