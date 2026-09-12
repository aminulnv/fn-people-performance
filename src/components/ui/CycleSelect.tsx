import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useFloatingPanel } from './useFloatingPanel'

export type CycleSelectStatus = 'future' | 'current' | 'previous'

export type CycleSelectOption = {
  id: string
  label: string
  status?: CycleSelectStatus
  /** Human-readable status shown under the label. */
  statusLabel?: string
  /** Short date range shown in brackets next to the title. */
  dateLabel?: string
}

export const CYCLE_SELECT_CLEAR_ID = ''

type CycleSelectBaseProps = {
  options: CycleSelectOption[]
  /** Names the picker for assistive tech, e.g. "Goal cycle". */
  label: string
  className?: string
  /** Put a Clear choice first so the page can drop its cycle. */
  allowEmpty?: boolean
  emptyLabel?: string
  searchPlaceholder?: string
  noResultsText?: string
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

/** Toggle a cycle. By default the last remaining selection cannot be cleared. */
export function toggleCycleSelection(
  selected: string[],
  cycleId: string,
  options: { requireSelection?: boolean } = {},
): string[] {
  const requireSelection = options.requireSelection !== false
  if (selected.includes(cycleId)) {
    if (requireSelection && selected.length === 1) return selected
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
  const {
    options,
    label,
    className,
    allowEmpty = false,
    emptyLabel = 'Clear',
    searchPlaceholder = 'Search cycles',
    noResultsText = 'No cycles match',
  } = props
  const multiple = props.multiple === true
  const canClear = allowEmpty && !multiple
  const emptyMulti = allowEmpty && multiple
  const listOptions = canClear
    ? [{ id: CYCLE_SELECT_CLEAR_ID, label: emptyLabel }, ...options]
    : options
  const selectedIds = multiple
    ? props.value
    : [props.value]

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelStyle = useFloatingPanel({
    open,
    anchorRef: containerRef,
    panelRef,
    fitContent: true,
  })

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
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

  const selected = selectedOptions(listOptions, selectedIds)
  const primary =
    selected[0] ??
    (canClear || emptyMulti
      ? { id: CYCLE_SELECT_CLEAR_ID, label: emptyLabel }
      : options[0])

  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? listOptions.filter((option) => {
        const haystack = [option.label, option.dateLabel, option.statusLabel]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(needle)
      })
    : listOptions

  if (!primary) return null

  const extraCount = selected.length > 1 ? selected.length - 1 : 0
  const triggerLabel =
    extraCount > 0
      ? `${label}: ${primary.label} and ${extraCount} more`
      : `${label}: ${primary.label}`

  const selectCycle = (cycleId: string) => {
    if (props.multiple) {
      props.onChange(
        toggleCycleSelection(selectedIds, cycleId, {
          requireSelection: !allowEmpty,
        }),
      )
      return
    }
    props.onChange(cycleId)
    setOpen(false)
    setQuery('')
  }

  const allOptionsSelected =
    multiple &&
    options.length > 0 &&
    options.every((option) => selectedIds.includes(option.id))

  const toggleAllOptions = () => {
    if (!props.multiple) return
    props.onChange(
      allOptionsSelected
        ? []
        : options.map((option) => option.id),
    )
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

      {open
        ? createPortal(
        <div
          ref={panelRef}
          className="pd-cycle-select__panel pd-cycle-select__panel--floating"
          role="listbox"
          aria-label={`Select ${label.toLowerCase()}`}
          aria-multiselectable={multiple || undefined}
          style={{
            ...panelStyle,
            visibility: panelStyle ? 'visible' : 'hidden',
          }}
        >
          <div className="pd-cycle-select__search">
            <Search size={14} strokeWidth={2} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoFocus
            />
          </div>
          <div className="pd-cycle-select__list">
            {multiple && options.length > 0 ? (
              <button
                type="button"
                role="option"
                aria-selected={allOptionsSelected}
                className={[
                  'pd-cycle-select__option',
                  'pd-cycle-select__option--multi',
                  allOptionsSelected ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={toggleAllOptions}
              >
                <span className="pd-cycle-select__check" aria-hidden>
                  <input
                    type="checkbox"
                    className="pd-check__input"
                    checked={allOptionsSelected}
                    readOnly
                    tabIndex={-1}
                  />
                  <span className="pd-check__box" />
                </span>
                <span className="pd-cycle-select__option-main">
                  <span className="pd-cycle-select__option-label">
                    {allOptionsSelected ? 'Deselect All' : 'Select All'}
                  </span>
                </span>
              </button>
            ) : null}
            {filtered.length === 0 ? (
              <p className="pd-cycle-select__empty">{noResultsText}</p>
            ) : (
              filtered.map((option) => {
                const isActive = selectedIds.includes(option.id)
                return (
                  <button
                    key={option.id || 'clear'}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={[
                      'pd-cycle-select__option',
                      multiple ? 'pd-cycle-select__option--multi' : '',
                      option.id === CYCLE_SELECT_CLEAR_ID
                        ? 'pd-cycle-select__option--empty'
                        : '',
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
                      <span className="pd-cycle-select__option-title">
                        <span className="pd-cycle-select__option-label">
                          {option.label}
                        </span>
                        {option.dateLabel ? (
                          <span className="pd-cycle-select__date">
                            ({option.dateLabel})
                          </span>
                        ) : null}
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
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
