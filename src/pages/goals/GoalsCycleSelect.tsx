import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import {
  cycleStatusLabel,
} from '@/lib/goals/cyclesFromReviews'
import type { GoalsCycleOption, GoalsCycleStatus } from '@/lib/goals/types'
import {
  getGoalsSnapshot,
  setActiveCycle,
  subscribeGoalsStore,
} from '@/lib/goals/store'

type GoalsCycleSelectProps = {
  /** Controlled cycles list; defaults to live store snapshot. */
  cycles?: GoalsCycleOption[]
  activeCycleId?: string
  onSelect?: (cycleId: string) => void
  className?: string
}

function statusTone(status: GoalsCycleStatus): string {
  return `pd-goals-cycle-select__badge--${status}`
}

/**
 * On-page cycle picker (Revolut-style): select the review/goal cycle
 * before viewing or adding goals under it.
 */
export function GoalsCycleSelect({
  cycles: cyclesProp,
  activeCycleId: activeProp,
  onSelect,
  className,
}: GoalsCycleSelectProps) {
  const [tick, setTick] = useState(0)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => subscribeGoalsStore(() => setTick((n) => n + 1)), [])

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  void tick
  const snapshot = getGoalsSnapshot()
  const cycles = cyclesProp ?? snapshot.availableCycles
  const activeId = activeProp ?? snapshot.cycle.id
  const active = cycles.find((c) => c.id === activeId) ?? cycles[0]

  const filtered = query.trim()
    ? cycles.filter((c) =>
        c.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : cycles

  const selectCycle = useCallback(
    (cycleId: string) => {
      if (onSelect) onSelect(cycleId)
      else setActiveCycle(cycleId)
      setOpen(false)
      setQuery('')
    },
    [onSelect],
  )

  if (!active) return null

  return (
    <div
      ref={containerRef}
      className={['pd-goals-cycle-select', className].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className="pd-goals-cycle-select__trigger"
        aria-label={`Goal cycle: ${active.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="pd-goals-cycle-select__label">{active.label}</span>
        <span
          className={`pd-goals-cycle-select__badge ${statusTone(active.status)}`}
        >
          ({cycleStatusLabel(active.status)})
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2.25}
          className={`pd-goals-cycle-select__chevron${open ? ' is-open' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="pd-goals-cycle-select__panel"
          role="listbox"
          aria-label="Select goal cycle"
        >
          <div className="pd-goals-cycle-select__search">
            <Search size={14} strokeWidth={2} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cycles"
              aria-label="Search cycles"
              autoFocus
            />
          </div>
          <div className="pd-goals-cycle-select__list">
            {filtered.length === 0 ? (
              <p className="pd-goals-cycle-select__empty">No cycles match</p>
            ) : (
              filtered.map((cycle) => {
                const isActive = cycle.id === activeId
                return (
                  <button
                    key={cycle.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`pd-goals-cycle-select__option${
                      isActive ? ' is-active' : ''
                    }`}
                    onClick={() => selectCycle(cycle.id)}
                  >
                    <span className="pd-goals-cycle-select__option-main">
                      <span className="pd-goals-cycle-select__option-label">
                        {cycle.label}
                      </span>
                      <span
                        className={`pd-goals-cycle-select__badge ${statusTone(cycle.status)}`}
                      >
                        {cycleStatusLabel(cycle.status)}
                      </span>
                    </span>
                    {isActive ? (
                      <Check size={14} strokeWidth={2.25} aria-hidden />
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
