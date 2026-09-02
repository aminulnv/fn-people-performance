import { useEffect, useState } from 'react'
import { Button, Modal, Select } from '@/components/ui'

export type DuplicateCycleOption = {
  id: string
  label: string
  /** e.g. Current / Previous - shown beside the cycle name. */
  statusLabel?: string
}

type GoalDuplicateCycleDialogProps = {
  open: boolean
  cycles: DuplicateCycleOption[]
  defaultCycleId: string
  onClose: () => void
  onConfirm: (cycleId: string) => void
}

export function GoalDuplicateCycleDialog({
  open,
  cycles,
  defaultCycleId,
  onClose,
  onConfirm,
}: GoalDuplicateCycleDialogProps) {
  const [selectedId, setSelectedId] = useState(defaultCycleId)

  useEffect(() => {
    if (!open) return
    const fallback = cycles[0]?.id ?? defaultCycleId
    setSelectedId(
      cycles.some((cycle) => cycle.id === defaultCycleId)
        ? defaultCycleId
        : fallback,
    )
  }, [open, defaultCycleId, cycles])

  const options = cycles.map((cycle) => ({
    value: cycle.id,
    label: cycle.statusLabel
      ? `${cycle.label} · ${cycle.statusLabel}`
      : cycle.label,
  }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Duplicate Goal"
      description="Choose which cycle should get the copy. Progress and comments are not copied."
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selectedId || cycles.length === 0}
            onClick={() => {
              if (!selectedId) return
              onConfirm(selectedId)
              onClose()
            }}
          >
            Duplicate
          </Button>
        </>
      }
    >
      <Select
        label="Cycle"
        options={options}
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
      />
    </Modal>
  )
}
