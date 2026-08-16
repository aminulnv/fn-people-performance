import { Copy, Plus } from 'lucide-react'

export function GoalEmptyActions({
  busy,
  previousCycleLabel,
  onAdd,
  onCopyPrevious,
}: {
  busy: boolean
  previousCycleLabel?: string
  onAdd: () => void
  onCopyPrevious: () => void
}) {
  return (
    <div className="pd-goals__empty-actions">
      {previousCycleLabel ? (
        <button
          type="button"
          className="pd-people__ghost-btn"
          disabled={busy}
          title={`Copy goals from ${previousCycleLabel} as editable drafts`}
          onClick={onCopyPrevious}
        >
          <Copy size={17} strokeWidth={1.8} aria-hidden />
          Copy Last Cycle
        </button>
      ) : null}
      <button
        type="button"
        className="pd-people__create-btn"
        disabled={busy}
        onClick={onAdd}
      >
        <Plus size={18} strokeWidth={2} aria-hidden />
        Add Goal
      </button>
    </div>
  )
}
