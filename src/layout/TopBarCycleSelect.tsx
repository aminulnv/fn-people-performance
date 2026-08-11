import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  CURRENT_CYCLE_ID,
  DEMO_CYCLES,
} from '@/lib/goals/demoData'
import {
  getGoalsSnapshot,
  setActiveCycle,
  subscribeGoalsStore,
} from '@/lib/goals/store'
import { useHoverMenu } from './useHoverMenu'

export function TopBarCycleSelect({ isMobile }: { isMobile?: boolean }) {
  const [tick, setTick] = useState(0)
  const { open, setOpen, containerRef, hoverHandlers, toggle } = useHoverMenu({
    isMobile,
    closeOnEscape: true,
  })

  useEffect(() => subscribeGoalsStore(() => setTick((n) => n + 1)), [])

  const snapshot = getGoalsSnapshot()
  void tick
  const activeId = snapshot.cycle.id
  const activeLabel = snapshot.cycle.label

  const selectCycle = useCallback(
    (cycleId: string) => {
      setActiveCycle(cycleId)
      setOpen(false)
    },
    [setOpen],
  )

  return (
    <div
      ref={containerRef}
      className="pd-topbar__cycle"
      {...hoverHandlers}
    >
      <button
        type="button"
        className="pd-topbar__cycle-trigger"
        aria-label={`Review cycle: ${activeLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="pd-topbar__cycle-label">{activeLabel}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.25}
          className={`pd-topbar__cycle-chevron${open ? ' is-open' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--cycle"
          role="listbox"
          aria-label="Review cycle"
        >
          <div className="pd-topbar__dropdown-section-label">Quarter</div>
          {DEMO_CYCLES.map((cycle) => {
            const isActive = cycle.id === activeId
            const isCurrent = cycle.id === CURRENT_CYCLE_ID
            return (
              <button
                key={cycle.id}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`pd-topbar__dropdown-item pd-topbar__cycle-option${
                  isActive ? ' is-active' : ''
                }`}
                onClick={() => selectCycle(cycle.id)}
              >
                <span className="pd-topbar__cycle-option-text">
                  <span className="pd-topbar__cycle-option-label">
                    {cycle.label}
                  </span>
                  {isCurrent ? (
                    <span className="pd-topbar__cycle-option-badge">
                      Current
                    </span>
                  ) : null}
                </span>
                {isActive ? (
                  <Check size={14} strokeWidth={2.25} aria-hidden />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
