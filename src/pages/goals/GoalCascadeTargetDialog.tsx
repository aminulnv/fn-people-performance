import { useEffect, useState } from 'react'
import { Button, Checkbox, Modal } from '@/components/ui'

export type CascadeTarget = {
  id: string
  name: string
  title?: string
  avatarUrl?: string
}

type GoalCascadeTargetDialogProps = {
  open: boolean
  targets: CascadeTarget[]
  onClose: () => void
  onConfirm: (reportIds: string[]) => void
}

export function GoalCascadeTargetDialog({
  open,
  targets,
  onClose,
  onConfirm,
}: GoalCascadeTargetDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (open) setSelectedIds([])
  }, [open])

  const toggle = (id: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cascade this goal"
      description="Choose who should get a child goal under this one. Their title is left blank so they can write a relevant goal. This is not sent to every report unless you select them."
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={selectedIds.length === 0}
            onClick={() => {
              onConfirm(selectedIds)
              onClose()
            }}
          >
            {selectedIds.length <= 1
              ? 'Cascade'
              : `Cascade to ${selectedIds.length} people`}
          </Button>
        </>
      }
    >
      <div className="pd-goal-cascade-targets" role="group" aria-label="Reports">
        {targets.map((person) => (
          <Checkbox
            key={person.id}
            label={person.title ? `${person.name} · ${person.title}` : person.name}
            checked={selectedIds.includes(person.id)}
            onChange={(event) => toggle(person.id, event.target.checked)}
          />
        ))}
      </div>
    </Modal>
  )
}
