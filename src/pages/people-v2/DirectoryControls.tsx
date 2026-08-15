import type { RefObject } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  Group,
  ListFilter,
  Rows3,
  Rows4,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { cx } from '@/lib/cx'
import { COLUMNS, type ColumnId } from './columns'
import {
  FACET_LABELS,
  GROUP_LABELS,
  SORT_LABELS,
  facetValueLabel,
  type FacetId,
  type FacetSelections,
  type GroupKey,
  type Sort,
  type SortKey,
} from './directory'
import { Popover } from './Popover'
import type { Density } from './prefs'

const GROUP_OPTIONS = Object.keys(GROUP_LABELS) as GroupKey[]

const SORT_OPTIONS: SortKey[] = [
  'name',
  'jobTitle',
  'department',
  'team',
  'managerName',
  'directReportCount',
  'tenure',
  'startDate',
  'grade',
  'id',
]

type Chip = { facet: FacetId; value: string }

function activeChips(selections: FacetSelections): Chip[] {
  return (Object.keys(selections) as FacetId[]).flatMap((facet) =>
    selections[facet].map((value) => ({ facet, value })),
  )
}

export type DirectoryControlsProps = {
  query: string
  onQueryChange: (value: string) => void
  searchRef: RefObject<HTMLInputElement | null>
  selections: FacetSelections
  activeFilterCount: number
  onRemoveFacetValue: (facet: FacetId, value: string) => void
  onClearFilters: () => void
  filtersOpen: boolean
  onToggleFilters: () => void
  sort: Sort
  onSortChange: (key: SortKey) => void
  groupBy: GroupKey
  onGroupChange: (key: GroupKey) => void
  columns: ColumnId[]
  onToggleColumn: (id: ColumnId) => void
  onResetColumns: () => void
  density: Density
  onDensityChange: (density: Density) => void
}

export function DirectoryControls({
  query,
  onQueryChange,
  searchRef,
  selections,
  activeFilterCount,
  onRemoveFacetValue,
  onClearFilters,
  filtersOpen,
  onToggleFilters,
  sort,
  onSortChange,
  groupBy,
  onGroupChange,
  columns,
  onToggleColumn,
  onResetColumns,
  density,
  onDensityChange,
}: DirectoryControlsProps) {
  const chips = activeChips(selections)

  return (
    <div className="pd-pv2-controls">
      <div className="pd-pv2-controls__row">
        <label className="pd-pv2-search">
          <Search size={15} strokeWidth={2} aria-hidden />
          <span className="pd-pv2-sr">Search people</span>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search name, role, team, email…"
            spellCheck={false}
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              className="pd-pv2-search__clear"
              aria-label="Clear search"
              onClick={() => onQueryChange('')}
            >
              <X size={13} strokeWidth={2.25} aria-hidden />
            </button>
          ) : (
            <kbd className="pd-pv2-search__kbd" aria-hidden>
              /
            </kbd>
          )}
        </label>

        <button
          type="button"
          className={cx(
            'pd-pv2-control',
            'pd-pv2-control--filters',
            (filtersOpen || activeFilterCount > 0) && 'is-active',
          )}
          aria-pressed={filtersOpen}
          onClick={onToggleFilters}
        >
          <ListFilter size={14} strokeWidth={2} aria-hidden />
          Filters
          {activeFilterCount > 0 ? (
            <span className="pd-pv2-control__count">{activeFilterCount}</span>
          ) : null}
        </button>

        <Popover
          label={
            <>
              <Group size={14} strokeWidth={2} aria-hidden />
              <span className="pd-pv2-control__text">
                {groupBy === 'none' ? 'Group' : GROUP_LABELS[groupBy]}
              </span>
            </>
          }
          ariaLabel="Group people"
          width="13rem"
          active={groupBy !== 'none'}
        >
          {(close) => (
            <div className="pd-pv2-menu">
              <p className="pd-pv2-menu__label">Group by</p>
              {GROUP_OPTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={cx(
                    'pd-pv2-menu__item',
                    groupBy === key && 'is-selected',
                  )}
                  onClick={() => {
                    onGroupChange(key)
                    close()
                  }}
                >
                  {GROUP_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </Popover>

        <Popover
          label={
            <>
              <SlidersHorizontal size={14} strokeWidth={2} aria-hidden />
              <span className="pd-pv2-control__text">
                {SORT_LABELS[sort.key]}
              </span>
              {sort.direction === 'asc' ? (
                <ArrowUp size={12} strokeWidth={2.25} aria-hidden />
              ) : (
                <ArrowDown size={12} strokeWidth={2.25} aria-hidden />
              )}
            </>
          }
          ariaLabel="Sort people"
          width="14rem"
          active={sort.key !== 'department' || sort.direction !== 'asc'}
        >
          {(close) => (
            <div className="pd-pv2-menu">
              <p className="pd-pv2-menu__label">Sort by</p>
              {SORT_OPTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={cx(
                    'pd-pv2-menu__item',
                    sort.key === key && 'is-selected',
                  )}
                  onClick={() => {
                    onSortChange(key)
                    if (sort.key !== key) close()
                  }}
                >
                  {SORT_LABELS[key]}
                  {sort.key === key ? (
                    <span className="pd-pv2-menu__hint">
                      {sort.direction === 'asc' ? 'A → Z' : 'Z → A'}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </Popover>

        <Popover
          label={<Columns3 size={14} strokeWidth={2} aria-hidden />}
          ariaLabel="Choose columns"
          width="14rem"
          hideChevron
        >
          {() => (
            <div className="pd-pv2-menu">
              <p className="pd-pv2-menu__label">Columns</p>
              {COLUMNS.map((column) => (
                <label
                  key={column.id}
                  className={cx(
                    'pd-pv2-menu__check',
                    column.locked && 'is-locked',
                  )}
                >
                  <input
                    type="checkbox"
                    className="pd-pv2-check"
                    checked={columns.includes(column.id)}
                    disabled={column.locked}
                    onChange={() => onToggleColumn(column.id)}
                  />
                  {column.label}
                </label>
              ))}
              <button
                type="button"
                className="pd-pv2-menu__footer"
                onClick={onResetColumns}
              >
                Reset to Default
              </button>
            </div>
          )}
        </Popover>

        <div
          className="pd-pv2-segment"
          role="group"
          aria-label="Row density"
        >
          <button
            type="button"
            className={cx(
              'pd-pv2-segment__btn',
              density === 'comfortable' && 'is-active',
            )}
            aria-pressed={density === 'comfortable'}
            title="Comfortable rows"
            onClick={() => onDensityChange('comfortable')}
          >
            <Rows3 size={14} strokeWidth={2} aria-hidden />
            <span className="pd-pv2-sr">Comfortable rows</span>
          </button>
          <button
            type="button"
            className={cx(
              'pd-pv2-segment__btn',
              density === 'compact' && 'is-active',
            )}
            aria-pressed={density === 'compact'}
            title="Compact rows"
            onClick={() => onDensityChange('compact')}
          >
            <Rows4 size={14} strokeWidth={2} aria-hidden />
            <span className="pd-pv2-sr">Compact rows</span>
          </button>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="pd-pv2-chips" aria-label="Active filters">
          {chips.map((chip) => (
            <button
              key={`${chip.facet}:${chip.value}`}
              type="button"
              className="pd-pv2-chip"
              onClick={() => onRemoveFacetValue(chip.facet, chip.value)}
            >
              <span className="pd-pv2-chip__facet">
                {FACET_LABELS[chip.facet]}
              </span>
              {facetValueLabel(chip.facet, chip.value)}
              <X size={12} strokeWidth={2.5} aria-hidden />
              <span className="pd-pv2-sr">Remove filter</span>
            </button>
          ))}
          <button
            type="button"
            className="pd-pv2-chips__clear"
            onClick={onClearFilters}
          >
            Clear All
          </button>
        </div>
      ) : null}
    </div>
  )
}
