import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export type CycleSelectStatus = 'future' | 'current' | 'previous' | 'manual'

export type CycleSelectOption = {
  id: string
  label: string
  status?: CycleSelectStatus
  /** Human-readable status shown next to the label. */
  statusLabel?: string
}

export type CycleSelectProps = {
  options: CycleSelectOption[]
  value: string
  onChange: (cycleId: string) => void
  /** Names the picker for assistive tech, e.g. "Goal cycle". */
  label: string
  className?: string
}

/**
 * On-page cycle picker: pick the review/goal cycle the page is scoped to.
 * Shared by Goals and Reviews so both toolbars read the same.
 */
export function CycleSelect({
  options,
  value,
  onChange,
  label,
  className,
}: CycleSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const active = options.find((option) => option.id === value) ?? options[0]

  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options

  if (!active) return null

  const selectCycle = (cycleId: string) => {
    onChange(cycleId)
    setOpen(false)
    setQuery('')
  }

  return (
    <div
      ref={containerRef}
      className={['pd-cycle-select', className].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className="pd-cycle-select__trigger"
        aria-label={`${label}: ${active.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span className="pd-cycle-select__label">{active.label}</span>
        {active.statusLabel ? (
          <span
            className={`pd-cycle-select__badge pd-cycle-select__badge--${active.status}`}
          >
            ({active.statusLabel})
          </span>
        ) : null}
        <ChevronDown
          size={16}
          strokeWidth={2.25}
          className={`pd-cycle-select__chevron${open ? ' is-open' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="pd-cycle-select__panel"
          role="listbox"
          aria-label={`Select ${label.toLowerCase()}`}
        >
          <div className="pd-cycle-select__search">
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
          <div className="pd-cycle-select__list">
            {filtered.length === 0 ? (
              <p className="pd-cycle-select__empty">No cycles match</p>
            ) : (
              filtered.map((option) => {
                const isActive = option.id === active.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`pd-cycle-select__option${
                      isActive ? ' is-active' : ''
                    }`}
                    onClick={() => selectCycle(option.id)}
                  >
                    <span className="pd-cycle-select__option-main">
                      <span className="pd-cycle-select__option-label">
                        {option.label}
                      </span>
                      {option.statusLabel ? (
                        <span
                          className={`pd-cycle-select__badge pd-cycle-select__badge--${option.status}`}
                        >
                          {option.statusLabel}
                        </span>
                      ) : null}
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
