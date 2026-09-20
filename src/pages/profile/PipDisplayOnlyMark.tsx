import { CircleAlert } from 'lucide-react'
import { Tooltip } from '@/components/ui'

/** PIP status is visible, but start and end are not wired yet. */
export function PipDisplayOnlyMark() {
  return (
    <Tooltip
      side="top"
      portal
      content="Shown for reference only. Starting and ending a PIP is not connected yet."
    >
      <span className="pd-pip-mark" tabIndex={0}>
        <CircleAlert size={12} strokeWidth={2.25} aria-hidden />
        <span>Display</span>
        <span>only</span>
      </span>
    </Tooltip>
  )
}
