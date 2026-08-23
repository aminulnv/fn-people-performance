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

type CycleSelectBaseProps = {
  options: CycleSelectOption[]
  /** Names the picker for assistive tech, e.g. "Goal cycle". */
  label: string
  className?: string
}

export type CycleSelectSingleProps = CycleSelectBaseProps & {
  multiple?: false
  value: string
  onChange: (cycleId: string) => void
}

export type CycleSelectMultiProps = CycleSelectBaseProps & {
  multiple: true
  value: string[]
  onChange: (cycleIds: string[]) => void
}

export type CycleSelectProps = CycleSelectSingleProps | CycleSelectMultiProps

/** Drop unknown ids and keep at least one available cycle selected. */
export function sanitizeCycleSelection(
  selected: string[],
  availableIds: string[],
  fallback: string,
): string[] {
  const allowed = new Set(availableIds)
  const next = selected.filter((id) => allowed.has(id))
  if (next.length > 0) return next
  if (fallback && allowed.has(fallback)) return [fallback]
  return availableIds[0] ? [availableIds[0]] : []
}

/** Toggle a cycle; the last remaining selection cannot be cleared. */
export function toggleCycleSelection(
  selected: string[],
  cycleId: string,
): string[] {
  if (selected.includes(cycleId)) {
    if (selected.length === 1) return selected
    return selected.filter((id) => id !== cycleId)
  }
  return [...selected, cycleId]
}

function selectedOptions(
  options: CycleSelectOption[],
  selectedIds: string[],
): CycleSelectOption[] {
  return selectedIds
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is CycleSelectOption => option != null)
}

/**
 * On-page cycle picker: pick the review/goal cycle the page is scoped to.
 * Shared by Goals and Reviews so both toolbars read the same.
 */
export function CycleSelect(props: CycleSelectProps) {
  const { options, label, className } = props
  const multiple = props.multiple === true
  const selectedIds = multiple
    ? props.value
    : [props.value]

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

  const selected = selectedOptions(options, selectedIds)
  const primary = selected[0] ?? options[0]

  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options

  if (!primary) return null

  const extraCount = selected.length > 1 ? selected.length - 1 : 0
  const triggerLabel =
    extraCount > 0
      ? `${label}: ${primary.label} and ${extraCount} more`
      : `${label}: ${primary.label}`

  const selectCycle = (cycleId: string) => {
    if (props.multiple) {
      props.onChange(toggleCycleSelection(selectedIds, cycleId))
      return
    }
    props.onChange(cycleId)
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
        aria-label={triggerLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span className="pd-cycle-select__label">{primary.label}</span>
        {extraCount > 0 ? (
          <span className="pd-cycle-select__count">+ {extraCount} more</span>
        ) : primary.statusLabel ? (
          <span
            className={`pd-cycle-select__badge pd-cycle-select__badge--${primary.status}`}
          >
            ({primary.statusLabel})
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
          aria-multiselectable={multiple || undefined}
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
                const isActive = selectedIds.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={[
                      'pd-cycle-select__option',
                      multiple ? 'pd-cycle-select__option--multi' : '',
                      isActive ? 'is-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => selectCycle(option.id)}
                  >
                    {multiple ? (
                      <span className="pd-cycle-select__check" aria-hidden>
                        <input
                          type="checkbox"
                          className="pd-check__input"
                          checked={isActive}
                          readOnly
                          tabIndex={-1}
                        />
                        <span className="pd-check__box" />
                      </span>
                    ) : null}
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
                    {!multiple && isActive ? (
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
