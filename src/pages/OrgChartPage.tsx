import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronsDown,
  ChevronUp,
  Maximize2,
  Minus,
  Network,
  Plus,
  Scan,
  ScanFace,
  Users,
} from 'lucide-react'
import { Avatar, ListboxSelect } from '@/components/ui'
import { layoutConfig } from '@/config/layout'
import { useAuth } from '@/lib/auth'
import { avatarStyle } from '@/lib/employees/avatar'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { PlatformEmployee } from '@/lib/employees/types'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

const COMPANY_ROOT_ID = '__company__'
const COMPANY_NAME = 'NEXT Ventures'

const ZOOM_MIN = 0.3
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1

type OrgNode = {
  employee: PlatformEmployee
  reports: OrgNode[]
  totalReports: number
}

function empKey(id: number): string {
  return String(id)
}

function titleFor(employee: PlatformEmployee): string {
  return employee.jobTitle.trim() || '—'
}

function metaFor(employee: PlatformEmployee): string {
  const parts = [employee.department, employee.team, employee.division].filter(
    Boolean,
  )
  return parts.join(' · ') || '—'
}

function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100))
}

function escapeAttr(id: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(id)
  }
  return id.replace(/["\\]/g, '\\$&')
}

function resolveManagerId(
  employee: PlatformEmployee,
  byId: Map<number, PlatformEmployee>,
  byName: Map<string, PlatformEmployee>,
): number | null {
  if (
    employee.reportsToId != null &&
    byId.has(employee.reportsToId) &&
    employee.reportsToId !== employee.employeeId
  ) {
    return employee.reportsToId
  }
  const name = employee.reportsToName.trim().toLowerCase()
  if (!name) return null
  const manager = byName.get(name)
  if (!manager || manager.employeeId === employee.employeeId) return null
  return manager.employeeId
}

function buildForest(employees: PlatformEmployee[]): { roots: OrgNode[] } {
  const byId = new Map(employees.map((e) => [e.employeeId, e]))
  const byName = new Map<string, PlatformEmployee>()
  for (const employee of employees) {
    const key = employee.fullName.trim().toLowerCase()
    if (key && !byName.has(key)) byName.set(key, employee)
  }

  const childrenByManager = new Map<number, PlatformEmployee[]>()
  const roots: PlatformEmployee[] = []

  for (const employee of employees) {
    const managerId = resolveManagerId(employee, byId, byName)
    if (managerId != null) {
      const siblings = childrenByManager.get(managerId) ?? []
      siblings.push(employee)
      childrenByManager.set(managerId, siblings)
    } else {
      roots.push(employee)
    }
  }

  const sortByName = (a: PlatformEmployee, b: PlatformEmployee) =>
    a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })

  const visiting = new Set<number>()

  const buildNode = (employee: PlatformEmployee): OrgNode => {
    if (visiting.has(employee.employeeId)) {
      return { employee, reports: [], totalReports: 0 }
    }
    visiting.add(employee.employeeId)

    const directReports = (childrenByManager.get(employee.employeeId) ?? [])
      .slice()
      .sort(sortByName)
      .map(buildNode)

    const totalReports = directReports.reduce(
      (sum, child) => sum + 1 + child.totalReports,
      0,
    )

    visiting.delete(employee.employeeId)
    return { employee, reports: directReports, totalReports }
  }

  const rootNodes = roots.sort(sortByName).map(buildNode)
  rootNodes.sort((a, b) => b.totalReports - a.totalReports)
  return { roots: rootNodes }
}

function collectIds(nodes: OrgNode[], acc: Set<string> = new Set()): Set<string> {
  for (const node of nodes) {
    if (node.reports.length > 0) {
      acc.add(empKey(node.employee.employeeId))
      collectIds(node.reports, acc)
    }
  }
  return acc
}

function defaultExpanded(
  nodes: OrgNode[],
  showCompanyRoot: boolean,
): Set<string> {
  const ids = new Set<string>()
  if (showCompanyRoot) ids.add(COMPANY_ROOT_ID)
  for (const node of nodes) {
    if (node.reports.length > 0) ids.add(empKey(node.employee.employeeId))
  }
  return ids
}

function subtreeIds(
  rootId: number,
  childrenByManager: Map<number, number[]>,
): Set<number> {
  const ids = new Set<number>([rootId])
  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const childId of childrenByManager.get(current) ?? []) {
      if (ids.has(childId)) continue
      ids.add(childId)
      queue.push(childId)
    }
  }
  return ids
}

function ancestorIds(
  startId: number,
  managerById: Map<number, number | null>,
): Set<number> {
  const ids = new Set<number>()
  let current: number | null = startId
  while (current != null && !ids.has(current)) {
    ids.add(current)
    current = managerById.get(current) ?? null
  }
  return ids
}

function OrgChartPill({
  totalReports,
  directReports,
  isOpen,
  onClick,
}: {
  totalReports: number
  directReports: number
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="pd-org-pill"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Collapse reports' : 'Expand reports'}
    >
      <span className="pd-org-pill-stat" title={`${totalReports} total reports`}>
        <Network size={13} strokeWidth={2} aria-hidden />
        {totalReports}
      </span>
      <span
        className="pd-org-pill-stat"
        title={`${directReports} direct reports`}
      >
        <Users size={13} strokeWidth={2} aria-hidden />
        {directReports}
      </span>
      {isOpen ? (
        <ChevronUp size={14} strokeWidth={2} aria-hidden />
      ) : (
        <ChevronDown size={14} strokeWidth={2} aria-hidden />
      )}
    </button>
  )
}

function OrgChartCard({
  name,
  title,
  meta,
  href,
  logoUrl,
  avatarUrl,
  employeeId,
  highlight,
}: {
  name: string
  title?: string
  meta?: string
  href?: string
  logoUrl?: string
  avatarUrl?: string
  employeeId?: string
  highlight?: boolean
}) {
  const className = `pd-org-card${highlight ? ' pd-org-card--highlight' : ''}${
    href ? '' : ' pd-org-card--static'
  }`
  const body = (
    <>
      {logoUrl ? (
        <div className="pd-app-logo pd-app-logo--md pd-org-card-logo-wrap">
          <img src={logoUrl} alt="" />
        </div>
      ) : (
        <Avatar
          name={name}
          src={avatarUrl || undefined}
          size="lg"
          className="pd-org-card-avatar"
          style={avatarStyle(name)}
        />
      )}
      <span className="pd-org-card-name">{name}</span>
      {title ? <span className="pd-org-card-title">{title}</span> : null}
      {meta ? <span className="pd-org-card-meta">{meta}</span> : null}
    </>
  )

  if (href) {
    return (
      <Link to={href} className={className} data-employee-id={employeeId}>
        {body}
      </Link>
    )
  }

  return (
    <div className={className} data-employee-id={employeeId}>
      {body}
    </div>
  )
}

function OrgChartNode({
  node,
  expanded,
  highlightId,
  onToggle,
}: {
  node: OrgNode
  expanded: Set<string>
  highlightId: string | null
  onToggle: (id: string) => void
}) {
  const { employee, reports, totalReports } = node
  const id = empKey(employee.employeeId)
  const hasReports = reports.length > 0
  const isOpen = expanded.has(id)

  return (
    <li className="pd-org-tree-node">
      <div className="pd-org-tree-node-inner">
        <OrgChartCard
          name={employee.fullName}
          title={titleFor(employee)}
          meta={metaFor(employee)}
          href={`/people/${employee.employeeId}`}
          avatarUrl={employee.avatarUrl}
          employeeId={id}
          highlight={highlightId === id}
        />
        {hasReports ? (
          <OrgChartPill
            totalReports={totalReports}
            directReports={reports.length}
            isOpen={isOpen}
            onClick={() => onToggle(id)}
          />
        ) : null}
      </div>

      {hasReports && isOpen ? (
        <>
          <div className="pd-org-vline" aria-hidden />
          <ul className="pd-org-tree-children">
            {reports.map((child) => (
              <OrgChartNode
                key={child.employee.employeeId}
                node={child}
                expanded={expanded}
                highlightId={highlightId}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </>
      ) : null}
    </li>
  )
}

function CompanyRoot({
  roots,
  employeeCount,
  expanded,
  highlightId,
  onToggle,
  logoUrl,
}: {
  roots: OrgNode[]
  employeeCount: number
  expanded: Set<string>
  highlightId: string | null
  onToggle: (id: string) => void
  logoUrl?: string
}) {
  const isOpen = expanded.has(COMPANY_ROOT_ID)

  return (
    <li className="pd-org-tree-node pd-org-tree-node--root">
      <div className="pd-org-tree-node-inner">
        <OrgChartCard name={COMPANY_NAME} logoUrl={logoUrl} />
        {roots.length > 0 ? (
          <OrgChartPill
            totalReports={employeeCount}
            directReports={roots.length}
            isOpen={isOpen}
            onClick={() => onToggle(COMPANY_ROOT_ID)}
          />
        ) : null}
      </div>

      {roots.length > 0 && isOpen ? (
        <>
          <div className="pd-org-vline" aria-hidden />
          <ul className="pd-org-tree-children">
            {roots.map((node) => (
              <OrgChartNode
                key={node.employee.employeeId}
                node={node}
                expanded={expanded}
                highlightId={highlightId}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </>
      ) : null}
    </li>
  )
}

function OrgChartControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFindMe,
  canFindMe,
  onFit,
  onExpandAll,
  isFullscreen,
  onToggleFullscreen,
}: {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onFindMe: () => void
  canFindMe: boolean
  onFit: () => void
  onExpandAll: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}) {
  return (
    <div className="pd-org-controls" role="toolbar" aria-label="Org chart controls">
      <button
        type="button"
        className="pd-org-ctrl-btn"
        onClick={onZoomOut}
        disabled={zoom <= ZOOM_MIN}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <Minus size={16} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className="pd-org-zoom-label"
        onClick={onResetZoom}
        title="Reset zoom to 100%"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        className="pd-org-ctrl-btn"
        onClick={onZoomIn}
        disabled={zoom >= ZOOM_MAX}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <Plus size={16} strokeWidth={2} aria-hidden />
      </button>

      <span className="pd-org-ctrl-divider" aria-hidden />

      <button
        type="button"
        className="pd-org-ctrl-btn"
        onClick={onFindMe}
        disabled={!canFindMe}
        title={canFindMe ? 'Find me' : 'Your profile is not in the directory'}
        aria-label="Find me"
      >
        <ScanFace size={17} strokeWidth={1.9} aria-hidden />
      </button>
      <button
        type="button"
        className="pd-org-ctrl-btn"
        onClick={onFit}
        title="Fit to screen"
        aria-label="Fit to screen"
      >
        <Scan size={17} strokeWidth={1.9} aria-hidden />
      </button>
      <button
        type="button"
        className="pd-org-ctrl-btn"
        onClick={onExpandAll}
        title="Expand all cards"
        aria-label="Expand all cards"
      >
        <ChevronsDown size={17} strokeWidth={1.9} aria-hidden />
      </button>

      <span className="pd-org-ctrl-divider" aria-hidden />

      <button
        type="button"
        className="pd-org-ctrl-btn"
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
      >
        <Maximize2 size={16} strokeWidth={1.9} aria-hidden />
      </button>
    </div>
  )
}

export default function OrgChartPage() {
  const { user } = useAuth()
  const { employees, loadState, loadError, reload } = useEmployees()
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [focusId, setFocusId] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [locateRequest, setLocateRequest] = useState<{
    id: number
    key: number
  } | null>(null)
  const [content, setContent] = useState({ width: 0, height: 0 })

  const stageRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const zoomInnerRef = useRef<HTMLDivElement>(null)

  const departments = useMemo(
    () =>
      [
        ...new Set(
          employees.map((e) => e.department.trim()).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [employees],
  )

  const peopleOptions = useMemo(
    () =>
      employees
        .slice()
        .sort((a, b) =>
          a.fullName.localeCompare(b.fullName, undefined, {
            sensitivity: 'base',
          }),
        ),
    [employees],
  )

  const myEmployeeId = useMemo(() => {
    const email = user?.email?.toLowerCase()
    if (!email) return null
    return (
      employees.find((e) => e.email.toLowerCase() === email)?.employeeId ?? null
    )
  }, [user?.email, employees])

  const visibleEmployees = useMemo(() => {
    let pool = includeInactive
      ? employees
      : employees.filter((e) => e.isActive)

    if (focusId) {
      const focusNum = Number(focusId)
      const byId = new Map(pool.map((e) => [e.employeeId, e]))
      const byName = new Map<string, PlatformEmployee>()
      for (const employee of pool) {
        const key = employee.fullName.trim().toLowerCase()
        if (key && !byName.has(key)) byName.set(key, employee)
      }
      const childrenByManager = new Map<number, number[]>()
      for (const employee of pool) {
        const managerId = resolveManagerId(employee, byId, byName)
        if (managerId == null) continue
        const siblings = childrenByManager.get(managerId) ?? []
        siblings.push(employee.employeeId)
        childrenByManager.set(managerId, siblings)
      }
      const ids = subtreeIds(focusNum, childrenByManager)
      pool = pool.filter((employee) => ids.has(employee.employeeId))
    } else if (departmentFilter) {
      pool = pool.filter((employee) => employee.department === departmentFilter)
    }

    return pool
  }, [employees, includeInactive, focusId, departmentFilter])

  const { roots } = useMemo(
    () => buildForest(visibleEmployees),
    [visibleEmployees],
  )

  const showCompanyRoot = !focusId && !departmentFilter

  const companyRoots = useMemo(
    () =>
      showCompanyRoot ? roots.filter((node) => node.reports.length > 0) : roots,
    [roots, showCompanyRoot],
  )

  const visiblePeopleCount = useMemo(
    () =>
      showCompanyRoot
        ? companyRoots.reduce((sum, node) => sum + 1 + node.totalReports, 0)
        : visibleEmployees.length,
    [showCompanyRoot, companyRoots, visibleEmployees.length],
  )

  useEffect(() => {
    setExpanded(defaultExpanded(companyRoots, showCompanyRoot))
  }, [companyRoots, showCompanyRoot, focusId, departmentFilter])

  useEffect(() => {
    const el = zoomInnerRef.current
    if (!el) return
    const measure = () =>
      setContent({ width: el.offsetWidth, height: el.offsetHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [companyRoots, expanded])

  useEffect(() => {
    if (!locateRequest) return
    const targetId = locateRequest.id
    const byId = new Map(employees.map((e) => [e.employeeId, e]))
    const byName = new Map<string, PlatformEmployee>()
    for (const employee of employees) {
      const key = employee.fullName.trim().toLowerCase()
      if (key && !byName.has(key)) byName.set(key, employee)
    }
    const managerById = new Map<number, number | null>()
    for (const employee of employees) {
      managerById.set(
        employee.employeeId,
        resolveManagerId(employee, byId, byName),
      )
    }
    const reveal = ancestorIds(targetId, managerById)
    setExpanded((current) => {
      const next = new Set(current)
      next.add(COMPANY_ROOT_ID)
      for (const id of reveal) next.add(empKey(id))
      return next
    })

    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = scrollRef.current?.querySelector<HTMLElement>(
          `[data-employee-id="${escapeAttr(empKey(targetId))}"]`,
        )
        if (el) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
          })
          setHighlightId(empKey(targetId))
        }
      })
    })

    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [locateRequest, employees])

  useEffect(() => {
    if (!highlightId) return
    const timer = setTimeout(() => setHighlightId(null), 2600)
    return () => clearTimeout(timer)
  }, [highlightId])

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const DRAG_THRESHOLD_PX = 4
    let isPanning = false
    let moved = false
    let suppressNextClick = false
    let startX = 0
    let startY = 0
    let startLeft = 0
    let startTop = 0

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.pointerType !== 'mouse') return
      isPanning = true
      moved = false
      suppressNextClick = false
      startX = event.clientX
      startY = event.clientY
      startLeft = el.scrollLeft
      startTop = el.scrollTop
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isPanning) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        moved = true
        el.classList.add('pd-org-scroll--grabbing')
        el.setPointerCapture?.(event.pointerId)
      }
      if (moved) {
        el.scrollLeft = startLeft - dx
        el.scrollTop = startTop - dy
      }
    }

    const endPan = () => {
      if (!isPanning) return
      isPanning = false
      suppressNextClick = moved
      moved = false
      el.classList.remove('pd-org-scroll--grabbing')
    }

    const onClickCapture = (event: MouseEvent) => {
      if (!suppressNextClick) return
      suppressNextClick = false
      event.preventDefault()
      event.stopPropagation()
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endPan)
    el.addEventListener('pointercancel', endPan)
    el.addEventListener('click', onClickCapture, true)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endPan)
      el.removeEventListener('pointercancel', endPan)
      el.removeEventListener('click', onClickCapture, true)
    }
  }, [loadState, employees.length, companyRoots.length])

  const toggle = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const ids = collectIds(companyRoots)
    if (showCompanyRoot) ids.add(COMPANY_ROOT_ID)
    setExpanded(ids)
  }, [companyRoots, showCompanyRoot])

  const collapseAll = useCallback(() => setExpanded(new Set()), [])

  const zoomIn = useCallback(
    () => setZoom((z) => clampZoom(z + ZOOM_STEP)),
    [],
  )
  const zoomOut = useCallback(
    () => setZoom((z) => clampZoom(z - ZOOM_STEP)),
    [],
  )
  const resetZoom = useCallback(() => setZoom(1), [])

  const fitToScreen = useCallback(() => {
    const scroll = scrollRef.current
    if (!scroll || content.width === 0 || content.height === 0) return
    const availableWidth = scroll.clientWidth - 48
    const availableHeight = scroll.clientHeight - 48
    if (availableWidth <= 0 || availableHeight <= 0) return
    setZoom(
      clampZoom(
        Math.min(
          availableWidth / content.width,
          availableHeight / content.height,
        ),
      ),
    )
  }, [content])

  const findMe = useCallback(() => {
    if (myEmployeeId == null) return
    setFocusId('')
    setDepartmentFilter('')
    setLocateRequest({ id: myEmployeeId, key: Date.now() })
  }, [myEmployeeId])

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current
    if (!el) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void el.requestFullscreen?.()
    }
  }, [])

  const zoomLayerStyle = {
    width: content.width ? content.width * zoom : undefined,
    height: content.height ? content.height * zoom : undefined,
  }

  const dataPending = loadState === 'loading' && employees.length === 0

  return (
    <div className="pd-page pd-org" aria-label="Org chart">
      <header className="pd-people__header pd-people__header--row">
        <div>
          <h1 className="pd-org-chart-title">Org Chart</h1>
          <p className="pd-people__stat">
            {dataPending
              ? 'Building reporting hierarchy…'
              : `${visiblePeopleCount} of ${employees.length} people · ${companyRoots.length} top-level`}
          </p>
        </div>
        <div className="pd-people__toolbar">
          <Link to="/organisation" className="pd-people__ghost-btn">
            Departments & teams
          </Link>
          <button
            type="button"
            className="pd-people__ghost-btn"
            onClick={() => void reload().catch(() => {})}
          >
            Refresh
          </button>
        </div>
      </header>

      {loadError && employees.length === 0 ? (
        <p className="pd-people__empty">{loadError}</p>
      ) : null}

      {dataPending ? (
        <p className="pd-people__empty">Loading people…</p>
      ) : employees.length === 0 ? (
        <p className="pd-people__empty">No employees in the directory yet.</p>
      ) : (
        <>
          <div className="pd-org-filter-bar">
            <label className="pd-org-filter">
              <span className="pd-org-filter-label">Focus on person</span>
              <ListboxSelect
                aria-label="Focus on person"
                value={focusId}
                onValueChange={(next) => {
                  setFocusId(next)
                  if (next) setDepartmentFilter('')
                }}
                placeholder="Entire organization"
                emptyLabel="Entire organization"
                options={peopleOptions.map((employee) => ({
                  value: empKey(employee.employeeId),
                  label: employee.fullName,
                }))}
              />
            </label>
            <label className="pd-org-filter">
              <span className="pd-org-filter-label">Department</span>
              <ListboxSelect
                aria-label="Department"
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
                placeholder="All departments"
                emptyLabel="All departments"
                disabled={Boolean(focusId)}
                options={departments.map((name) => ({
                  value: name,
                  label: name,
                }))}
              />
            </label>
            <label className="pd-org-switch">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              <span>Include inactive</span>
            </label>
            <div className="pd-org-filter-actions">
              <button
                type="button"
                className="pd-people__ghost-btn"
                onClick={expandAll}
              >
                Expand all
              </button>
              <button
                type="button"
                className="pd-people__ghost-btn"
                onClick={collapseAll}
              >
                Collapse all
              </button>
            </div>
          </div>

          <div className="pd-org-stage" ref={stageRef}>
            {companyRoots.length === 0 ? (
              <div className="pd-org-scroll">
                <p className="pd-people__empty">
                  No people match the current filters.
                </p>
              </div>
            ) : (
              <>
                <div className="pd-org-scroll" ref={scrollRef}>
                  <div className="pd-org-zoom-outer" style={zoomLayerStyle}>
                    <div
                      className="pd-org-zoom-inner"
                      ref={zoomInnerRef}
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                      }}
                    >
                      <div className="pd-org-tree-wrap">
                        <ul className="pd-org-tree">
                          {showCompanyRoot ? (
                            <CompanyRoot
                              roots={companyRoots}
                              employeeCount={visiblePeopleCount}
                              expanded={expanded}
                              highlightId={highlightId}
                              onToggle={toggle}
                              logoUrl={layoutConfig.brand.logoUrl}
                            />
                          ) : focusId && companyRoots.length === 1 ? (
                            <OrgChartNode
                              node={companyRoots[0]!}
                              expanded={expanded}
                              highlightId={highlightId}
                              onToggle={toggle}
                            />
                          ) : (
                            companyRoots.map((node) => (
                              <OrgChartNode
                                key={node.employee.employeeId}
                                node={node}
                                expanded={expanded}
                                highlightId={highlightId}
                                onToggle={toggle}
                              />
                            ))
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <OrgChartControls
                  zoom={zoom}
                  onZoomIn={zoomIn}
                  onZoomOut={zoomOut}
                  onResetZoom={resetZoom}
                  onFindMe={findMe}
                  canFindMe={myEmployeeId != null}
                  onFit={fitToScreen}
                  onExpandAll={expandAll}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={toggleFullscreen}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
