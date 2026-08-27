import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cx } from '@/lib/cx'
import {
  attributeFilterCount,
  toggleAttributeFilter,
  type AttributeFilterMap,
  type AttributeValue,
} from '@/lib/filters/attributeFilters'

export type AttributeFilterOption = {
  id: string
  label: string
  icon: LucideIcon
}

export type AttributeFiltersProps = {
  attributes: readonly AttributeFilterOption[]
  valuesFor: (id: string) => AttributeValue[]
  selected: AttributeFilterMap
  onChange: (next: AttributeFilterMap) => void
  sectionLabel: string
  /** Overrides the trigger badge when a page counts extra filters itself. */
  count?: number
}

export function AttributeFilters({
  attributes,
  valuesFor,
  selected,
  onChange,
  sectionLabel,
  count,
}: AttributeFiltersProps) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [openAttribute, setOpenAttribute] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filterCount = count ?? attributeFilterCount(selected)

  useEffect(() => {
    if (
      openAttribute &&
      !attributes.some((attribute) => attribute.id === openAttribute)
    ) {
      setOpenAttribute(null)
      setQuery('')
    }
  }, [attributes, openAttribute])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closePanel()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (openAttribute) {
        setOpenAttribute(null)
        setQuery('')
        return
      }
      closePanel()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, openAttribute])

  function closePanel() {
    setOpen(false)
    setOpenAttribute(null)
    setQuery('')
  }

  function openValues(attribute: string) {
    setOpenAttribute(attribute)
    setQuery('')
  }

  const visibleAttributes = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (openAttribute || !needle) return attributes
    return attributes.filter((attribute) =>
      attribute.label.toLowerCase().includes(needle),
    )
  }, [attributes, openAttribute, query])

  const activeAttribute = openAttribute
    ? attributes.find((attribute) => attribute.id === openAttribute)
    : null

  const valueOptions = useMemo(() => {
    if (!openAttribute) return []
    return valuesFor(openAttribute)
  }, [openAttribute, valuesFor])

  const visibleValues = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return valueOptions
    return valueOptions.filter((option) =>
      option.label.toLowerCase().includes(needle),
    )
  }, [query, valueOptions])

  function selectedValuesFor(attribute: string): string[] {
    return selected[attribute] ?? []
  }

  function toggleValue(option: AttributeValue) {
    if (!openAttribute) return
    onChange(toggleAttributeFilter(selected, openAttribute, option.value))
  }

  const heading = activeAttribute?.label ?? 'Filters'
  const searchPlaceholder = openAttribute
    ? 'Search values…'
    : 'Search attributes...'

  return (
    <div ref={containerRef} className="pd-people-filters">
      <button
        type="button"
        className={cx(
          'pd-people__ghost-btn',
          'pd-people-filters__trigger',
          (open || filterCount > 0) && 'is-active',
        )}
        aria-label={
          filterCount > 0 ? `Filters, ${filterCount} selected` : 'Filters'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (open) closePanel()
          else setOpen(true)
        }}
      >
        <ListFilter size={16} strokeWidth={1.75} aria-hidden />
        Filters
        {filterCount > 0 ? (
          <span className="pd-people-filters__trigger-count">{filterCount}</span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          className="pd-people-filters__panel"
          role="dialog"
          aria-label="Filters"
        >
          <header className="pd-people-filters__header">
            {openAttribute ? (
              <button
                type="button"
                className="pd-people-filters__icon-btn"
                onClick={() => {
                  setOpenAttribute(null)
                  setQuery('')
                }}
                aria-label="Back to attributes"
              >
                <ChevronLeft size={18} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
            <h3 className="pd-people-filters__title">{heading}</h3>
            <button
              type="button"
              className="pd-people-filters__icon-btn"
              onClick={closePanel}
              aria-label="Close filters"
            >
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          </header>

          <label className="pd-people-filters__search">
            <span className="pd-sr-only">{searchPlaceholder}</span>
            <input
              key={openAttribute ?? 'attributes'}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
            />
            <Search size={16} strokeWidth={1.75} aria-hidden />
          </label>

          {openAttribute ? (
            <div
              className="pd-people-filters__list"
              role="listbox"
              aria-label={heading}
              aria-multiselectable
            >
              {visibleValues.length === 0 ? (
                <p className="pd-people-filters__empty">No values match</p>
              ) : (
                visibleValues.map((option) => {
                  const isSelected = selectedValuesFor(openAttribute).includes(
                    option.value,
                  )
                  return (
                    <button
                      key={option.value || 'empty'}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cx(
                        'pd-people-filters__value',
                        isSelected && 'is-selected',
                      )}
                      onClick={() => toggleValue(option)}
                    >
                      <span className="pd-people-filters__check" aria-hidden>
                        <input
                          type="checkbox"
                          className="pd-check__input"
                          checked={isSelected}
                          readOnly
                          tabIndex={-1}
                        />
                        <span className="pd-check__box" />
                      </span>
                      <span className="pd-people-filters__value-label">
                        {option.label}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          ) : (
            <nav className="pd-people-filters__list" aria-label={sectionLabel}>
              <p className="pd-people-filters__section">{sectionLabel}</p>
              {visibleAttributes.length === 0 ? (
                <p className="pd-people-filters__empty">No attributes match</p>
              ) : (
                visibleAttributes.map((attribute) => {
                  const Icon = attribute.icon
                  const selectedCount = selectedValuesFor(attribute.id).length
                  return (
                    <button
                      key={attribute.id}
                      type="button"
                      className="pd-people-filters__item"
                      aria-label={
                        selectedCount > 0
                          ? `${attribute.label}, ${selectedCount} selected`
                          : attribute.label
                      }
                      onClick={() => openValues(attribute.id)}
                    >
                      <Icon
                        className="pd-people-filters__item-icon"
                        size={16}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="pd-people-filters__item-label">
                        {attribute.label}
                      </span>
                      {selectedCount > 0 ? (
                        <span className="pd-people-filters__count">
                          {selectedCount}
                        </span>
                      ) : null}
                      <ChevronRight
                        className="pd-people-filters__chevron"
                        size={16}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </button>
                  )
                })
              )}
            </nav>
          )}

          {filterCount > 0 ? (
            <footer className="pd-people-filters__footer">
              <button
                type="button"
                className="pd-people-filters__clear"
                onClick={() => onChange({})}
              >
                Clear filters
              </button>
            </footer>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
