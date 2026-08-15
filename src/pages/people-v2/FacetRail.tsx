import { useMemo, useState } from 'react'
import { ChevronRight, PanelLeftClose, Search, X } from 'lucide-react'
import { cx } from '@/lib/cx'
import {
  FACET_LABELS,
  FACET_ORDER,
  type FacetId,
  type FacetOption,
} from './directory'

/** Department is the filter people actually use; keep it open. */
const DEFAULT_OPEN: FacetId[] = ['department']
const COLLAPSED_LIMIT = 6
const SEARCHABLE_FROM = 10

type FacetSectionProps = {
  facet: FacetId
  options: FacetOption[]
  defaultOpen: boolean
  onToggle: (facet: FacetId, value: string) => void
  onClear: (facet: FacetId) => void
}

function FacetSection({
  facet,
  options,
  defaultOpen,
  onToggle,
  onClear,
}: FacetSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [showAll, setShowAll] = useState(false)
  const [optionQuery, setOptionQuery] = useState('')

  const selectedCount = options.filter((option) => option.selected).length
  const searchable = options.length >= SEARCHABLE_FROM

  const matching = useMemo(() => {
    const needle = optionQuery.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(needle),
    )
  }, [optionQuery, options])

  const shown =
    showAll || matching.length <= COLLAPSED_LIMIT
      ? matching
      : matching.slice(0, COLLAPSED_LIMIT)
  const hiddenCount = matching.length - shown.length

  if (options.length === 0) return null

  return (
    <section className="pd-pv2-facet">
      <h3 className="pd-pv2-facet__heading">
        <button
          type="button"
          className="pd-pv2-facet__toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronRight
            size={13}
            strokeWidth={2.25}
            className="pd-pv2-facet__chevron"
            aria-hidden
          />
          {FACET_LABELS[facet]}
          {selectedCount > 0 ? (
            <span className="pd-pv2-facet__count">{selectedCount}</span>
          ) : null}
        </button>
        {selectedCount > 0 ? (
          <button
            type="button"
            className="pd-pv2-facet__clear"
            onClick={() => onClear(facet)}
          >
            Clear
          </button>
        ) : null}
      </h3>

      {open ? (
        <div className="pd-pv2-facet__body">
          {searchable ? (
            <label className="pd-pv2-facet__search">
              <Search size={13} strokeWidth={2} aria-hidden />
              <input
                type="text"
                value={optionQuery}
                onChange={(event) => setOptionQuery(event.target.value)}
                placeholder={`Find ${FACET_LABELS[facet].toLowerCase()}`}
                aria-label={`Find ${FACET_LABELS[facet].toLowerCase()}`}
              />
            </label>
          ) : null}

          <ul className="pd-pv2-facet__list">
            {shown.map((option) => (
              <li key={option.value}>
                <label
                  className={cx(
                    'pd-pv2-option',
                    option.selected && 'is-selected',
                    option.count === 0 && !option.selected && 'is-empty',
                  )}
                >
                  <input
                    type="checkbox"
                    className="pd-pv2-check"
                    checked={option.selected}
                    onChange={() => onToggle(facet, option.value)}
                  />
                  <span className="pd-pv2-option__label">{option.label}</span>
                  <span className="pd-pv2-option__count">
                    {option.count.toLocaleString()}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {matching.length === 0 ? (
            <p className="pd-pv2-facet__none">No matches</p>
          ) : null}

          {hiddenCount > 0 ? (
            <button
              type="button"
              className="pd-pv2-facet__more"
              onClick={() => setShowAll(true)}
            >
              Show {hiddenCount.toLocaleString()} more
            </button>
          ) : null}
          {showAll && matching.length > COLLAPSED_LIMIT ? (
            <button
              type="button"
              className="pd-pv2-facet__more"
              onClick={() => setShowAll(false)}
            >
              Show Less
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export type FacetRailProps = {
  facets: Record<FacetId, FacetOption[]>
  activeCount: number
  onToggle: (facet: FacetId, value: string) => void
  onClearFacet: (facet: FacetId) => void
  onClearAll: () => void
  /** Rendered as an overlay sheet on narrow viewports. */
  isOverlay?: boolean
  onClose?: () => void
}

export function FacetRail({
  facets,
  activeCount,
  onToggle,
  onClearFacet,
  onClearAll,
  isOverlay,
  onClose,
}: FacetRailProps) {
  return (
    <aside
      className={cx('pd-pv2-rail', isOverlay && 'pd-pv2-rail--overlay')}
      aria-label="Filter people"
    >
      <div className="pd-pv2-rail__head">
        <span className="pd-pv2-rail__title">Filters</span>
        {activeCount > 0 ? (
          <button type="button" className="pd-pv2-rail__reset" onClick={onClearAll}>
            Reset
          </button>
        ) : null}
        {onClose ? (
          <button
            type="button"
            className="pd-pv2-icon-btn"
            aria-label={isOverlay ? 'Close filters' : 'Hide filters'}
            onClick={onClose}
          >
            {isOverlay ? (
              <X size={15} strokeWidth={2} aria-hidden />
            ) : (
              <PanelLeftClose size={15} strokeWidth={2} aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <div className="pd-pv2-rail__body">
        {FACET_ORDER.every((facet) => facets[facet].length === 0) ? (
          <p className="pd-pv2-rail__empty">
            Nothing in the current search to filter by.
          </p>
        ) : (
          FACET_ORDER.map((facet) => (
            <FacetSection
              key={facet}
              facet={facet}
              options={facets[facet]}
              defaultOpen={DEFAULT_OPEN.includes(facet)}
              onToggle={onToggle}
              onClear={onClearFacet}
            />
          ))
        )}
      </div>
    </aside>
  )
}
