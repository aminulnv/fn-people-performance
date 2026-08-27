import type { MouseEvent, ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Tooltip } from '@/components/ui'

export function HintIcon({ content, label }: { content: ReactNode; label: string }) {
  return (
    <Tooltip content={content} side="top" portal delayMs={80}>
      <button
        type="button"
        className="pd-help-icon"
        aria-label={label}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation()
          event.preventDefault()
        }}
      >
        <Info size={14} strokeWidth={2} aria-hidden />
      </button>
    </Tooltip>
  )
}
