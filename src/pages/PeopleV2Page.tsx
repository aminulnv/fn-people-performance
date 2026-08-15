import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Copy,
  Download,
  Plus,
  RotateCw,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useBreakpoint } from '@/layout/useBreakpoint'
import { useAuth } from '@/lib/auth'
import { cx } from '@/lib/cx'
import { useEmployees } from '@/lib/employees/useEmployees'
import { copyText, downloadTextFile, timestampedFilename } from './people-v2/actions'
import { buildCsv, orderedColumns } from './people-v2/columns'
import { DirectoryControls } from './people-v2/DirectoryControls'
import { DirectorySkeleton, DirectoryTable } from './people-v2/DirectoryTable'
import { FacetRail } from './people-v2/FacetRail'
import { PersonPanel } from './people-v2/PersonPanel'
import {
  DATA_GAPS,
  buildDirectory,
  buildFacetOptions,
  filterPeople,
  groupPeople,
  sortPeople,
  summarise,
  type DirectoryPerson,
} from './people-v2/directory'
import { useDirectoryView, type Scope } from './people-v2/useDirectoryView'
import { readFiltersOpen, writeFiltersOpen } from './people-v2/prefs'
import '@/styles/layout-people-v2.css'

/** Rows added per reveal — keeps the DOM small on a directory of thousands. */
const RENDER_STEP = 60
/** Beside-the-table panel; below this the panel and rail become overlays. */
const WIDE_LAYOUT = '(min-width: 1280px)'
const RAIL_LAYOUT = '(min-width: 1024px)'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])
  return matches
}

type StatProps = {
  value: string
  label: string
  hint?: string
  isActive?: boolean
  onClick?: () => void
}

function Stat({ value, label, hint, isActive, onClick }: StatProps) {
  const content = (
    <>
      <span className="pd-pv2-stat__value">
        {value}
        {hint ? <span className="pd-pv2-stat__hint">{hint}</span> : null}
      </span>
      <span className="pd-pv2-stat__label">{label}</span>
    </>
  )

  if (!onClick) {
    return <div className="pd-pv2-stat">{content}</div>
  }

  return (
    <button
      type="button"
      className={cx('pd-pv2-stat', 'pd-pv2-stat--action', isActive && 'is-active')}
      aria-pressed={isActive}
      onClick={onClick}
    >
      {content}
    </button>
  )
}

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'reports', label: 'My Reports' },
  { id: 'department', label: 'My Department' },
]

export default function PeopleV2Page() {
  const { user } = useAuth()
  const { employees, loadState, loadError, reload } = useEmployees()
  const view = useDirectoryView()
  const { isMobile } = useBreakpoint()
  const isWide = useMediaQuery(WIDE_LAYOUT)
  const hasRailSpace = useMediaQuery(RAIL_LAYOUT)

  const searchRef = useRef<HTMLInputElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [renderLimit, setRenderLimit] = useState(RENDER_STEP)
  const [railOpen, setRailOpen] = useState(readFiltersOpen)
  const [filtersOverlayOpen, setFiltersOverlayOpen] = useState(false)
  const [copiedEmails, setCopiedEmails] = useState(false)

  const setRailOpenPersisted = useCallback((open: boolean) => {
    setRailOpen(open)
    writeFiltersOpen(open)
  }, [])

  const filtersVisible = hasRailSpace ? railOpen : filtersOverlayOpen

  const toggleFilters = useCallback(() => {
    if (hasRailSpace) setRailOpenPersisted(!railOpen)
    else setFiltersOverlayOpen((open) => !open)
  }, [hasRailSpace, railOpen, setRailOpenPersisted])

  const directory = useMemo(() => buildDirectory(employees), [employees])

  const me = useMemo(() => {
    const email = user?.email?.trim().toLowerCase()
    if (!email) return null
    return (
      directory.find((person) => person.email.trim().toLowerCase() === email) ??
      null
    )
  }, [directory, user?.email])

  const scoped = useMemo(() => {
    if (!me || view.scope === 'all') return directory
    if (view.scope === 'reports') {
      return directory.filter((person) => person.managerId === me.id)
    }
    return directory.filter(
      (person) => person.department === me.department && me.department !== '',
    )
  }, [directory, me, view.scope])

  const stats = useMemo(() => summarise(scoped), [scoped])
  const facets = useMemo(
    () => buildFacetOptions(scoped, view.query, view.selections),
    [scoped, view.query, view.selections],
  )
  const matched = useMemo(
    () => filterPeople(scoped, view.query, view.selections),
    [scoped, view.query, view.selections],
  )
  const sorted = useMemo(() => sortPeople(matched, view.sort), [matched, view.sort])
  const groups = useMemo(
    () => groupPeople(sorted, view.groupBy),
    [sorted, view.groupBy],
  )
  const columns = useMemo(() => orderedColumns(view.columns), [view.columns])

  const peekPerson: DirectoryPerson | null = useMemo(() => {
    if (view.peekId == null) return null
    return directory.find((person) => person.id === view.peekId) ?? null
  }, [directory, view.peekId])

  // A new result set always starts from the top of the list.
  useEffect(() => {
    setRenderLimit(RENDER_STEP)
  }, [view.query, view.selections, view.sort, view.groupBy, view.scope])

  useEffect(() => {
    if (!copiedEmails) return
    const timer = window.setTimeout(() => setCopiedEmails(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copiedEmails])

  const isTypingTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null
    if (!element) return false
    return (
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.isContentEditable
    )
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }
      if (event.key === 'Escape') {
        if (view.peekId != null) view.setPeekId(null)
        else if (filtersOverlayOpen) setFiltersOverlayOpen(false)
        else if (view.query) view.setQuery('')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [filtersOverlayOpen, view])

  const selectedPeople = useMemo(
    () => sorted.filter((person) => selectedIds.has(person.id)),
    [selectedIds, sorted],
  )
  const allSelected =
    sorted.length > 0 && selectedPeople.length === sorted.length
  const someSelected = selectedPeople.length > 0

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((current) => {
      const everyVisibleSelected =
        sorted.length > 0 && sorted.every((person) => current.has(person.id))
      if (everyVisibleSelected) return new Set()
      return new Set(sorted.map((person) => person.id))
    })
  }, [sorted])

  const exportPeople = useCallback(
    (people: DirectoryPerson[]) => {
      downloadTextFile(
        timestampedFilename('people'),
        buildCsv(people, view.columns),
      )
    },
    [view.columns],
  )

  const isFirstLoad = loadState === 'loading' && employees.length === 0
  const hasLoadError = loadState === 'error' && employees.length === 0
  const isEmptyDirectory =
    !isFirstLoad && !hasLoadError && directory.length === 0
  const showPanelBeside = isWide && peekPerson != null
  const showPanelOverlay = !isWide && peekPerson != null
  const showRail = hasRailSpace && railOpen

  return (
    <div
      className={cx(
        'pd-page pd-pv2',
        showPanelBeside && 'pd-pv2--panel',
        showRail && 'pd-pv2--rail',
        // Keeps the sticky column header aligned to the taller control bar.
        view.selectionCount > 0 && 'pd-pv2--chips',
      )}
    >
      <h1 className="pd-pv2-sr">People directory</h1>

      <header className="pd-pv2-header">
        <div className="pd-pv2-stats">
          <Stat
            value={matched.length.toLocaleString()}
            hint={
              matched.length !== stats.total
                ? `of ${stats.total.toLocaleString()}`
                : undefined
            }
            label={view.hasFilters ? 'In View' : 'People'}
          />
          <Stat
            value={stats.active.toLocaleString()}
            label="Active"
            isActive={view.selections.status.includes('active')}
            onClick={() => view.toggleFacet('status', 'active')}
          />
          <Stat
            value={stats.inactive.toLocaleString()}
            label="Inactive"
            isActive={view.selections.status.includes('inactive')}
            onClick={() => view.toggleFacet('status', 'inactive')}
          />
          <Stat
            value={stats.joinedLast90Days.toLocaleString()}
            label="Joined in 90 Days"
            isActive={view.selections.tenure.includes('lt3m')}
            onClick={() => view.toggleFacet('tenure', 'lt3m')}
          />
          <Stat
            value={stats.withGaps.toLocaleString()}
            label="Incomplete Records"
            isActive={view.selections.gap.length > 0}
            onClick={() =>
              view.setFacet(
                'gap',
                view.selections.gap.length > 0
                  ? []
                  : DATA_GAPS.map((gap) => gap.id),
              )
            }
          />
        </div>

        <div className="pd-pv2-header__actions">
          {me ? (
            <div className="pd-pv2-scope" role="group" aria-label="Directory scope">
              {SCOPES.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  className={cx(
                    'pd-pv2-scope__btn',
                    view.scope === scope.id && 'is-active',
                  )}
                  aria-pressed={view.scope === scope.id}
                  onClick={() => view.setScope(scope.id)}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            className="pd-pv2-btn"
            onClick={() => exportPeople(sorted)}
            disabled={sorted.length === 0}
          >
            <Download size={14} strokeWidth={2} aria-hidden />
            Export
          </button>
          <Link to="/people/new" className="pd-pv2-btn pd-pv2-btn--primary">
            <Plus size={15} strokeWidth={2.25} aria-hidden />
            Add Employee
          </Link>
        </div>
      </header>

      <div className="pd-pv2-body">
        {showRail ? (
          <FacetRail
            facets={facets}
            activeCount={view.selectionCount}
            onToggle={view.toggleFacet}
            onClearFacet={(facet) => view.setFacet(facet, [])}
            onClearAll={view.clearFilters}
            onClose={() => setRailOpenPersisted(false)}
          />
        ) : null}

        <div className="pd-pv2-main">
          <div className="pd-pv2-sticky">
            <DirectoryControls
              query={view.query}
              onQueryChange={view.setQuery}
              searchRef={searchRef}
              selections={view.selections}
              activeFilterCount={view.selectionCount}
              onRemoveFacetValue={view.toggleFacet}
              onClearFilters={view.clearFilters}
              filtersOpen={filtersVisible}
              onToggleFilters={toggleFilters}
              sort={view.sort}
              onSortChange={view.setSort}
              groupBy={view.groupBy}
              onGroupChange={view.setGroupBy}
              columns={view.columns}
              onToggleColumn={view.toggleColumn}
              onResetColumns={view.resetColumns}
              density={view.density}
              onDensityChange={view.setDensity}
            />
          </div>

          {isFirstLoad ? (
            <DirectorySkeleton />
          ) : hasLoadError ? (
            <div className="pd-pv2-state">
              <p className="pd-pv2-state__title">This directory did not load</p>
              <p className="pd-pv2-state__body">
                {loadError ?? 'The employee service did not respond.'}
              </p>
              <button
                type="button"
                className="pd-pv2-btn"
                onClick={() => void reload()}
              >
                <RotateCw size={14} strokeWidth={2} aria-hidden />
                Try Again
              </button>
            </div>
          ) : isEmptyDirectory ? (
            <div className="pd-pv2-state">
              <span className="pd-pv2-state__icon" aria-hidden>
                <Users size={20} strokeWidth={1.75} />
              </span>
              <p className="pd-pv2-state__title">No people yet</p>
              <p className="pd-pv2-state__body">
                Add your first employee and the directory, org chart and reviews
                will follow from it.
              </p>
              <Link to="/people/new" className="pd-pv2-btn pd-pv2-btn--primary">
                <UserPlus size={14} strokeWidth={2} aria-hidden />
                Add Employee
              </Link>
            </div>
          ) : sorted.length === 0 ? (
            <div className="pd-pv2-state">
              <p className="pd-pv2-state__title">
                Nothing matches this view
              </p>
              <p className="pd-pv2-state__body">
                {view.query ? (
                  <>
                    No one in {stats.total.toLocaleString()} records matches{' '}
                    <strong>“{view.query}”</strong>
                    {view.selectionCount > 0
                      ? ' with the filters you have applied.'
                      : '.'}
                  </>
                ) : (
                  'These filters exclude everyone. Try removing one.'
                )}
              </p>
              <button
                type="button"
                className="pd-pv2-btn"
                onClick={view.clearFilters}
              >
                <X size={14} strokeWidth={2} aria-hidden />
                Clear Filters
              </button>
            </div>
          ) : (
            <DirectoryTable
              groups={groups}
              isGrouped={view.groupBy !== 'none'}
              columns={columns}
              sort={view.sort}
              onSortChange={view.setSort}
              density={view.density}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              allSelected={allSelected}
              someSelected={someSelected}
              activeId={view.peekId}
              onOpen={(id) => view.setPeekId(id === view.peekId ? null : id)}
              renderLimit={renderLimit}
              onRenderMore={() =>
                setRenderLimit((limit) => limit + RENDER_STEP)
              }
              totalRows={sorted.length}
            />
          )}
        </div>

        {showPanelBeside && peekPerson ? (
          <PersonPanel
            person={peekPerson}
            people={directory}
            onSelectPerson={view.setPeekId}
            onClose={() => view.setPeekId(null)}
          />
        ) : null}
      </div>

      {showPanelOverlay && peekPerson ? (
        <div className="pd-pv2-overlay">
          <button
            type="button"
            className="pd-pv2-overlay__scrim"
            aria-label="Close details"
            onClick={() => view.setPeekId(null)}
          />
          <PersonPanel
            person={peekPerson}
            people={directory}
            onSelectPerson={view.setPeekId}
            onClose={() => view.setPeekId(null)}
            isOverlay
          />
        </div>
      ) : null}

      {filtersOverlayOpen && !hasRailSpace ? (
        <div className="pd-pv2-overlay pd-pv2-overlay--start">
          <button
            type="button"
            className="pd-pv2-overlay__scrim"
            aria-label="Close filters"
            onClick={() => setFiltersOverlayOpen(false)}
          />
          <FacetRail
            facets={facets}
            activeCount={view.selectionCount}
            onToggle={view.toggleFacet}
            onClearFacet={(facet) => view.setFacet(facet, [])}
            onClearAll={view.clearFilters}
            isOverlay
            onClose={() => setFiltersOverlayOpen(false)}
          />
        </div>
      ) : null}

      {someSelected ? (
        <div className={cx('pd-pv2-selection', isMobile && 'is-mobile')} role="status">
          <span className="pd-pv2-selection__count">
            {selectedPeople.length.toLocaleString()} selected
          </span>
          <button
            type="button"
            className="pd-pv2-selection__btn"
            onClick={() => {
              void copyText(
                selectedPeople
                  .map((person) => person.email)
                  .filter(Boolean)
                  .join(', '),
              ).then(setCopiedEmails)
            }}
          >
            {copiedEmails ? (
              <Check size={14} strokeWidth={2.25} aria-hidden />
            ) : (
              <Copy size={14} strokeWidth={2} aria-hidden />
            )}
            {copiedEmails ? 'Copied' : 'Copy Emails'}
          </button>
          <button
            type="button"
            className="pd-pv2-selection__btn"
            onClick={() => exportPeople(selectedPeople)}
          >
            <Download size={14} strokeWidth={2} aria-hidden />
            Export
          </button>
          <button
            type="button"
            className="pd-pv2-selection__btn pd-pv2-selection__btn--quiet"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  )
}
