import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button, Card, ConfirmDialog } from '@/components/ui'
import { groupDiffersFromCycle } from '@/lib/reviews/cycleGroups'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { useState } from 'react'
import { CreateCycleGroupForm } from './GroupMembersEditor'

type CycleGroupsSectionProps = {
  cycle: ReviewCycle
  onCreate: (input: { name: string; memberIds: number[] }) => void
  onDelete: (groupId: string) => void
  onOpenGroup: (groupId: string) => void
}

export function CycleGroupsSection({
  cycle,
  onCreate,
  onDelete,
  onOpenGroup,
}: CycleGroupsSectionProps) {
  const groups = cycle.groups ?? []
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const claimedIds = groups.flatMap((group) => group.memberIds)
  const pendingDelete = groups.find((group) => group.id === deleteId)

  return (
    <section
      className="pd-reviews-settings__section"
      aria-labelledby="cycle-groups-heading"
    >
      <div className="pd-reviews-settings__section-head">
        <div>
          <h3 className="pd-reviews-settings__section-title" id="cycle-groups-heading">
            Groups
          </h3>
          <p className="pd-reviews-settings__section-lede">
            Give a set of people their own goal, review, and calibration rules.
            Everyone else keeps the cycle defaults.
          </p>
        </div>
        {!creating ? (
          <Button
            variant="secondary"
            size="sm"
            pill
            onClick={() => setCreating(true)}
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
            Add group
          </Button>
        ) : null}
      </div>

      {creating ? (
        <CreateCycleGroupForm
          claimedIds={claimedIds}
          onCancel={() => setCreating(false)}
          onCreate={(input) => {
            onCreate(input)
            setCreating(false)
          }}
        />
      ) : null}

      {groups.length === 0 && !creating ? (
        <p className="pd-cycle-extensions__empty">
          No groups yet. Create one to set different rules for a population.
        </p>
      ) : (
        <ul className="pd-cycle-groups__list">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              cycle={cycle}
              group={group}
              onOpen={() => onOpenGroup(group.id)}
              onDelete={() => setDeleteId(group.id)}
            />
          ))}
        </ul>
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
            ? `Delete “${pendingDelete.name}”? Those people will fall back to the cycle defaults.`
            : ''
        }
        confirmLabel="Delete group"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
    </section>
  )
}

function GroupCard({
  cycle,
  group,
  onOpen,
  onDelete,
}: {
  cycle: ReviewCycle
  group: CycleGroup
  onOpen: () => void
  onDelete: () => void
}) {
  const differs = groupDiffersFromCycle(cycle, group)
  return (
    <li>
      <Card
        className="pd-reviews-settings__card"
        title={
          <span className="pd-reviews-card-title">
            <Users size={16} strokeWidth={1.75} aria-hidden />
            {group.name}
          </span>
        }
        description={
          differs
            ? 'Custom settings for this group'
            : 'Same settings as the cycle default'
        }
        actions={
          <div className="pd-cycle-groups__card-actions">
            <Button variant="secondary" size="sm" pill onClick={onDelete}>
              <Trash2 size={13} strokeWidth={2} aria-hidden />
              Delete
            </Button>
            <Button variant="primary" size="sm" pill onClick={onOpen}>
              <Pencil size={13} strokeWidth={2} aria-hidden />
              Edit
            </Button>
          </div>
        }
      >
        <p className="pd-cycle-groups__count">
          {group.memberIds.length === 1
            ? '1 person'
            : `${group.memberIds.length} people`}
        </p>
      </Card>
    </li>
  )
}
