import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Columns3, X } from 'lucide-react'
import { cx } from '@/lib/cx'

export type ColumnVisibilityOption = {
  id: string
  label: string
  /** Locked on - still listed so people understand why it stays. */
  required?: boolean
}

export type ColumnVisibilityProps = {
  columns: readonly ColumnVisibilityOption[]
  visibleIds: readonly string[]
  onChange: (next: string[]) => void
  /** Shown when the selection differs from this set. Defaults to every column. */
  defaultVisibleIds?: readonly string[]
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

/**
 * Toolbar control for choosing which table columns stay visible.
 * Matches the Filters popover chrome so the pair reads as one family.
 */
export function ColumnVisibility({
  columns,
  visibleIds,
  onChange,
  defaultVisibleIds,
}: ColumnVisibilityProps) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const defaults = defaultVisibleIds ?? columns.map((column) => column.id)
  const requiredIds = useMemo(
    () => columns.filter((column) => column.required).map((column) => column.id),
    [columns],
  )
  const visibleSet = useMemo(() => new Set(visibleIds), [visibleIds])
  const hiddenCount = columns.filter(
    (column) => !column.required && !visibleSet.has(column.id),
  ).length
  const isCustomized = !sameIds(visibleIds, defaults)

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

  function toggleColumn(id: string) {
    if (requiredIds.includes(id)) return
    if (visibleSet.has(id)) {
      onChange(visibleIds.filter((visibleId) => visibleId !== id))
      return
    }
    const next = new Set(visibleIds)
    next.add(id)
    onChange(columns.map((column) => column.id).filter((columnId) => next.has(columnId)))
  }

  function resetColumns() {
    onChange([...defaults])
  }

  return (
    <div ref={containerRef} className="pd-people-filters">
      <button
        type="button"
        className={cx(
          'pd-people__ghost-btn',
          'pd-people-filters__trigger',
          (open || isCustomized) && 'is-active',
        )}
        aria-label={
          hiddenCount > 0
            ? `Columns, ${hiddenCount} hidden`
            : 'Columns'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <Columns3 size={16} strokeWidth={1.75} aria-hidden />
        Columns
        {hiddenCount > 0 ? (
          <span className="pd-people-filters__trigger-count">{hiddenCount}</span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          className="pd-people-filters__panel"
          role="dialog"
          aria-label="Columns"
        >
          <header className="pd-people-filters__header">
            <h3 className="pd-people-filters__title">Columns</h3>
            <button
              type="button"
              className="pd-people-filters__icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Close Columns"
            >
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          </header>

          <div
            className="pd-people-filters__list"
            role="listbox"
            aria-label="Visible columns"
            aria-multiselectable
          >
            <p className="pd-people-filters__section">Show in table</p>
            {columns.map((column) => {
              const isVisible = visibleSet.has(column.id)
              const isRequired = Boolean(column.required)
              return (
                <button
                  key={column.id}
                  type="button"
                  role="option"
                  aria-selected={isVisible}
                  aria-disabled={isRequired || undefined}
                  disabled={isRequired}
                  title={isRequired ? 'Always shown' : undefined}
                  className={cx(
                    'pd-people-filters__value',
                    isVisible && 'is-selected',
                    isRequired && 'is-required',
                  )}
                  onClick={() => toggleColumn(column.id)}
                >
                  <span className="pd-people-filters__check" aria-hidden>
                    <input
                      type="checkbox"
                      className="pd-check__input"
                      checked={isVisible}
                      disabled={isRequired}
                      readOnly
                      tabIndex={-1}
                    />
                    <span className="pd-check__box" />
                  </span>
                  <span className="pd-people-filters__value-label">
                    {column.label}
                  </span>
                  {isRequired ? (
                    <span className="pd-people-filters__count" aria-hidden>
                      Fixed
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {isCustomized ? (
            <footer className="pd-people-filters__footer">
              <button
                type="button"
                className="pd-people-filters__clear"
                onClick={resetColumns}
              >
                Reset Columns
              </button>
            </footer>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
