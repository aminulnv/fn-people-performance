import { Copy, Plus } from 'lucide-react'
import { Button } from '@/components/ui'

export function GoalEmptyActions({
  busy,
  previousCycleLabel,
  onAdd,
  onCopyPrevious,
  showAdd = true,
}: {
  busy: boolean
  previousCycleLabel?: string
  onAdd: () => void
  onCopyPrevious: () => void
  /** Hide when Add Goal already sits in the person card header. */
  showAdd?: boolean
}) {
  if (!previousCycleLabel && !showAdd) return null

  return (
    <div className="pd-goals__empty-actions">
      {previousCycleLabel ? (
        <Button
          variant="secondary"
          pill
          disabled={busy}
          title={`Copy goals from ${previousCycleLabel} as editable drafts`}
          onClick={onCopyPrevious}
        >
          <Copy size={16} strokeWidth={1.8} aria-hidden />
          Copy Last Cycle
        </Button>
      ) : null}
      {showAdd ? (
        <Button variant="primary" pill disabled={busy} onClick={onAdd}>
          <Plus size={16} strokeWidth={2} aria-hidden />
          Add Goal
        </Button>
      ) : null}
    </div>
  )
}
