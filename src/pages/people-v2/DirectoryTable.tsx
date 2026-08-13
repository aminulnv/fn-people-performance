import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronRight, Pencil, SquareArrowOutUpRight } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { cx } from '@/lib/cx'
import { formatStartDate, type ColumnDef, type ColumnId } from './columns'
import type { DirectoryGroup, DirectoryPerson, Sort, SortKey } from './directory'
import type { Density } from './prefs'

const SELECT_TRACK = '2.25rem'
const PERSON_TRACK = 'minmax(0, 1.5fr)'
const ACTIONS_TRACK = '3.75rem'

function gridTemplate(columns: ColumnDef[]): string {
  return [
    SELECT_TRACK,
    PERSON_TRACK,
    ...columns.map((column) => column.width),
    ACTIONS_TRACK,
  ].join(' ')
}

function StatusMark({ isActive }: { isActive: boolean }) {
  return (
    <span className={cx('pd-pv2-status', isActive && 'is-active')}>
      <span className="pd-pv2-status__dot" aria-hidden />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function renderCell(person: DirectoryPerson, id: ColumnId): ReactNode {
  switch (id) {
    case 'jobTitle':
      return person.jobTitle || '—'
    case 'department':
      return person.department || '—'
    case 'team':
      return person.team || '—'
    case 'division':
      return person.division || '—'
    case 'manager':
      return person.managerName || <span className="pd-pv2-gap">Not set</span>
    case 'reports':
      return person.directReportCount > 0 ? (
        <span className="pd-pv2-num">{person.directReportCount}</span>
      ) : (
        '—'
      )
    case 'grade':
      return person.grade || '—'
    case 'tenure':
      return person.tenureMonths == null ? (
        '—'
      ) : (
        <span
          className={cx(
            'pd-pv2-num',
            person.tenureMonths < 3 && 'pd-pv2-num--new',
          )}
        >
          {person.tenureLabel}
        </span>
      )
    case 'startDate':
      return formatStartDate(person.startDate)
    case 'email':
      return person.email || '—'
    case 'employeeId':
      return <span className="pd-pv2-num">{person.id}</span>
    case 'status':
      return <StatusMark isActive={person.isActive} />
  }
}

type RowProps = {
  person: DirectoryPerson
  columns: ColumnDef[]
  isSelected: boolean
  isActive: boolean
  onToggleSelect: (id: number) => void
  onOpen: (id: number) => void
}

function DirectoryRow({
  person,
  columns,
  isSelected,
  isActive,
  onToggleSelect,
  onOpen,
}: RowProps) {
  return (
    <div
      role="row"
      data-row={person.id}
      tabIndex={0}
      aria-selected={isSelected}
      className={cx(
        'pd-pv2-row',
        isSelected && 'is-selected',
        isActive && 'is-active',
        !person.isActive && 'is-inactive',
      )}
      onClick={() => onOpen(person.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(person.id)
        }
      }}
    >
      <div className="pd-pv2-cell pd-pv2-cell--select" role="gridcell">
        <input
          type="checkbox"
          className="pd-pv2-check"
          checked={isSelected}
          aria-label={`Select ${person.name}`}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggleSelect(person.id)}
        />
      </div>

      <div className="pd-pv2-cell pd-pv2-cell--person" role="gridcell">
        <Avatar
          name={person.name}
          size="sm"
          className="pd-pv2-avatar"
          style={avatarStyle(person.email || String(person.id))}
        />
        <span className="pd-pv2-person">
          <span className="pd-pv2-person__name">{person.name}</span>
          <span className="pd-pv2-person__meta pd-pv2-person__meta--email">
            {person.email || 'No email'}
          </span>
          <span className="pd-pv2-person__meta pd-pv2-person__meta--role">
            {person.jobTitle || 'Role not set'}
          </span>
        </span>
      </div>

      {columns.map((column) => (
        <div
          key={column.id}
          role="gridcell"
          data-label={column.label}
          data-column={column.id}
          className={cx(
            'pd-pv2-cell',
            column.align === 'end' && 'pd-pv2-cell--end',
          )}
        >
          <span className="pd-pv2-cell__value">
            {renderCell(person, column.id)}
          </span>
        </div>
      ))}

      <div className="pd-pv2-cell pd-pv2-cell--actions" role="gridcell">
        <Link
          to={`/people-v2/${person.id}`}
          className="pd-pv2-row-action"
          title={`Open ${person.name}'s profile`}
          onClick={(event) => event.stopPropagation()}
        >
          <SquareArrowOutUpRight size={14} strokeWidth={2} aria-hidden />
          <span className="pd-pv2-sr">Open profile</span>
        </Link>
        <Link
          to={`/people/${person.id}/edit`}
          className="pd-pv2-row-action"
          title={`Edit ${person.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Pencil size={14} strokeWidth={2} aria-hidden />
          <span className="pd-pv2-sr">Edit</span>
        </Link>
      </div>
    </div>
  )
}

export type DirectoryTableProps = {
  groups: DirectoryGroup[]
  isGrouped: boolean
  columns: ColumnDef[]
  sort: Sort
  onSortChange: (key: SortKey) => void
  density: Density
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
  onToggleSelectAll: () => void
  allSelected: boolean
  someSelected: boolean
  activeId: number | null
  onOpen: (id: number) => void
  /** Rows rendered so far — the list grows as the reader reaches the end. */
  renderLimit: number
  onRenderMore: () => void
  totalRows: number
}

export function DirectoryTable({
  groups,
  isGrouped,
  columns,
  sort,
  onSortChange,
  density,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  someSelected,
  activeId,
  onOpen,
  renderLimit,
  onRenderMore,
  totalRows,
}: DirectoryTableProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const sentinelRef = useRef<HTMLDivElement>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)
  const template = gridTemplate(columns)
  const hasMore = renderLimit < totalRows

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected
    }
  }, [allSelected, someSelected])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || typeof IntersectionObserver === 'undefined') {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onRenderMore()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, onRenderMore])

  const onGridKeyDown = useCallback((event: ReactKeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const rows = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[data-row]'),
    )
    if (rows.length === 0) return
    const current = (event.target as HTMLElement).closest<HTMLElement>('[data-row]')
    const index = current ? rows.indexOf(current) : -1
    const nextIndex =
      event.key === 'ArrowDown'
        ? Math.min(rows.length - 1, index + 1)
        : Math.max(0, index - 1)
    event.preventDefault()
    rows[nextIndex]?.focus()
  }, [])

  const toggleGroup = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  let budget = renderLimit

  return (
    <div
      className={cx('pd-pv2-table', `pd-pv2-table--${density}`)}
      style={{ '--pv2-template': template } as CSSProperties}
    >
      <div className="pd-pv2-head" role="row">
        <div className="pd-pv2-cell pd-pv2-cell--select">
          <input
            ref={selectAllRef}
            type="checkbox"
            className="pd-pv2-check"
            checked={allSelected}
            aria-label="Select all people in view"
            onChange={onToggleSelectAll}
          />
        </div>
        <SortHeader
          label="Person"
          sortKey="name"
          sort={sort}
          onSortChange={onSortChange}
        />
        {columns.map((column) => (
          <SortHeader
            key={column.id}
            label={column.label}
            sortKey={column.sortKey}
            align={column.align}
            sort={sort}
            onSortChange={onSortChange}
          />
        ))}
        <div className="pd-pv2-cell pd-pv2-cell--actions" role="columnheader">
          <span className="pd-pv2-sr">Actions</span>
        </div>
      </div>

      <div
        className="pd-pv2-rows"
        role="rowgroup"
        onKeyDown={onGridKeyDown}
        aria-rowcount={totalRows}
      >
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.id)
          const slice = isCollapsed
            ? []
            : group.people.slice(0, Math.max(0, budget))
          budget -= slice.length

          return (
            <div className="pd-pv2-group" key={group.id}>
              {isGrouped ? (
                <div className="pd-pv2-group__head">
                  <button
                    type="button"
                    className="pd-pv2-group__toggle"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <ChevronRight
                      size={13}
                      strokeWidth={2.25}
                      className="pd-pv2-group__chevron"
                      aria-hidden
                    />
                    {group.label}
                  </button>
                  <span className="pd-pv2-group__count">
                    {group.people.length.toLocaleString()}
                  </span>
                  <span className="pd-pv2-group__rule" aria-hidden />
                </div>
              ) : null}

              {slice.map((person) => (
                <DirectoryRow
                  key={person.id}
                  person={person}
                  columns={columns}
                  isSelected={selectedIds.has(person.id)}
                  isActive={activeId === person.id}
                  onToggleSelect={onToggleSelect}
                  onOpen={onOpen}
                />
              ))}
            </div>
          )
        })}
      </div>

      {hasMore ? (
        <div className="pd-pv2-more" ref={sentinelRef}>
          <button type="button" className="pd-pv2-more__btn" onClick={onRenderMore}>
            Show more
          </button>
          <span className="pd-pv2-more__hint">
            {renderLimit.toLocaleString()} of {totalRows.toLocaleString()} shown
          </span>
        </div>
      ) : null}
    </div>
  )
}

type SortHeaderProps = {
  label: string
  sortKey: SortKey
  align?: 'end'
  sort: Sort
  onSortChange: (key: SortKey) => void
}

function SortHeader({
  label,
  sortKey,
  align,
  sort,
  onSortChange,
}: SortHeaderProps) {
  const isSorted = sort.key === sortKey
  return (
    <div
      role="columnheader"
      aria-sort={
        isSorted
          ? sort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
      className={cx(
        'pd-pv2-cell',
        'pd-pv2-cell--head',
        align === 'end' && 'pd-pv2-cell--end',
      )}
    >
      <button
        type="button"
        className={cx('pd-pv2-sort', isSorted && 'is-sorted')}
        onClick={() => onSortChange(sortKey)}
      >
        {label}
        {isSorted ? (
          sort.direction === 'asc' ? (
            <ArrowUp size={11} strokeWidth={2.5} aria-hidden />
          ) : (
            <ArrowDown size={11} strokeWidth={2.5} aria-hidden />
          )
        ) : null}
      </button>
    </div>
  )
}

export function DirectorySkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="pd-pv2-skeleton" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div className="pd-pv2-skeleton__row" key={index}>
          <span className="pd-pv2-skeleton__avatar" />
          <span className="pd-pv2-skeleton__line pd-pv2-skeleton__line--name" />
          <span className="pd-pv2-skeleton__line" />
          <span className="pd-pv2-skeleton__line pd-pv2-skeleton__line--short" />
        </div>
      ))}
    </div>
  )
}
