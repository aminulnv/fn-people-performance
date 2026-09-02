import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Maximize2,
  Minus,
  Network,
  Plus,
  Scan,
  ScanFace,
  Users,
} from 'lucide-react'
import { Avatar, SearchField } from '@/components/ui'
import { layoutConfig } from '@/config/layout'
import { useAuth } from '@/lib/auth'
import { avatarStyle } from '@/lib/employees/avatar'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { PlatformEmployee } from '@/lib/employees/types'
import { toIntegerId } from '@/lib/integerId'
import {
  clampCameraPan,
  fitCamera,
  panCameraToCenterRects,
  zoomCameraAroundPoint,
  type CameraPoint,
} from '@/lib/organisation/camera'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'

const COMPANY_ROOT_ID = '__company__'
const COMPANY_NAME = 'NEXT Ventures'

const ZOOM_MIN = 0.3
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1
const HIGHLIGHT_MS = 1000

type OrgNode = {
  employee: PlatformEmployee
  reports: OrgNode[]
  totalReports: number
}

function empKey(id: number): string {
  return String(id)
}

function titleFor(employee: PlatformEmployee): string {
  return employee.jobTitle.trim() || '-'
}

function metaFor(employee: PlatformEmployee): string {
  const parts = [employee.department, employee.team, employee.division].filter(
    Boolean,
  )
  return parts.join(' · ') || '-'
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

function openingExpanded(
  nodes: OrgNode[],
  showCompanyRoot: boolean,
  focusId: number | null,
  managerById: Map<number, number | null>,
): Set<string> {
  const ids = defaultExpanded(nodes, showCompanyRoot)
  if (focusId == null) return ids
  ids.add(COMPANY_ROOT_ID)
  for (const id of ancestorIds(focusId, managerById)) {
    if (id !== focusId) ids.add(empKey(id))
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
          <img src={logoUrl} alt="" draggable={false} />
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
      <Link
        to={href}
        className={className}
        data-employee-id={employeeId}
        draggable={false}
      >
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
  onCollapseAll,
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
  onCollapseAll: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}) {
  return (
    <div
      className="pd-org-panel pd-org-controls"
      role="toolbar"
      aria-label="Org chart controls"
    >
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
      <button
        type="button"
        className="pd-org-ctrl-btn"
        onClick={onCollapseAll}
        title="Collapse all cards"
        aria-label="Collapse all cards"
      >
        <ChevronsUp size={17} strokeWidth={1.9} aria-hidden />
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
  const [searchParams] = useSearchParams()
  const { employees, loadState, loadError, reload } = useEmployees()
  const [searchQuery, setSearchQuery] = useState('')
  const [userExpanded, setUserExpanded] = useState<Set<string> | null>(null)
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
  const panRef = useRef<CameraPoint>({ x: 0, y: 0 })
  const zoomRef = useRef(zoom)
  const contentRef = useRef(content)
  const seededCameraRef = useRef(false)
  zoomRef.current = zoom
  contentRef.current = content

  const myEmployeeId = useMemo(() => {
    const email = user?.email?.toLowerCase()
    if (!email) return null
    return (
      employees.find((e) => e.email.toLowerCase() === email)?.employeeId ?? null
    )
  }, [user?.email, employees])

  const focusPersonId = useMemo(() => {
    const id = toIntegerId(searchParams.get('person'))
    return id != null && id > 0 ? id : null
  }, [searchParams])

  const managerById = useMemo(() => {
    const byId = new Map(employees.map((employee) => [employee.employeeId, employee]))
    const byName = new Map<string, PlatformEmployee>()
    for (const employee of employees) {
      const key = employee.fullName.trim().toLowerCase()
      if (key && !byName.has(key)) byName.set(key, employee)
    }
    const map = new Map<number, number | null>()
    for (const employee of employees) {
      map.set(employee.employeeId, resolveManagerId(employee, byId, byName))
    }
    return map
  }, [employees])

  const visibleEmployees = useMemo(() => {
    const activeEmployees = employees.filter((employee) => employee.isActive)
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
    if (!normalizedQuery) return activeEmployees

    return activeEmployees.filter(
      (employee) =>
        employee.fullName.toLocaleLowerCase().includes(normalizedQuery) ||
        employee.department.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [employees, searchQuery])

  const { roots } = useMemo(
    () => buildForest(visibleEmployees),
    [visibleEmployees],
  )

  const showCompanyRoot = searchQuery.trim().length === 0

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

  const baselineExpanded = useMemo(
    () =>
      openingExpanded(
        companyRoots,
        showCompanyRoot,
        focusPersonId,
        managerById,
      ),
    [companyRoots, focusPersonId, managerById, showCompanyRoot],
  )
  const expanded = userExpanded ?? baselineExpanded

  const viewportSize = useCallback(() => {
    const el = scrollRef.current
    if (!el) return { width: 0, height: 0 }
    return { width: el.clientWidth, height: el.clientHeight }
  }, [])

  const applyCameraTransform = useCallback(() => {
    const el = zoomInnerRef.current
    if (!el) return
    const { x, y } = panRef.current
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoomRef.current})`
    el.style.transformOrigin = '0 0'
  }, [])

  const commitPan = useCallback(
    (next: CameraPoint) => {
      const viewport = viewportSize()
      panRef.current =
        viewport.width === 0 || viewport.height === 0
          ? next
          : clampCameraPan(next, contentRef.current, viewport, zoomRef.current)
      applyCameraTransform()
    },
    [applyCameraTransform, viewportSize],
  )

  const zoomAround = useCallback(
    (nextZoom: number, origin: CameraPoint) => {
      const current = zoomRef.current
      const clamped = clampZoom(nextZoom)
      if (clamped === current) return
      const nextPan = zoomCameraAroundPoint(
        panRef.current,
        current,
        clamped,
        origin,
      )
      zoomRef.current = clamped
      commitPan(nextPan)
      setZoom(clamped)
    },
    [commitPan],
  )

  const viewportCenter = useCallback((): CameraPoint => {
    const viewport = viewportSize()
    return { x: viewport.width / 2, y: viewport.height / 2 }
  }, [viewportSize])

  const applyFit = useCallback(
    (size = contentRef.current) => {
      const viewport = viewportSize()
      if (
        size.width === 0 ||
        size.height === 0 ||
        viewport.width === 0 ||
        viewport.height === 0
      ) {
        return false
      }
      const next = fitCamera(size, viewport, clampZoom)
      zoomRef.current = next.zoom
      commitPan(next.pan)
      setZoom(next.zoom)
      return true
    },
    [commitPan, viewportSize],
  )

  const openingKey = `${searchQuery}::${focusPersonId ?? ''}`
  const [appliedOpeningKey, setAppliedOpeningKey] = useState(openingKey)
  if (appliedOpeningKey !== openingKey) {
    setAppliedOpeningKey(openingKey)
    setUserExpanded(null)
    seededCameraRef.current = false
  }

  useLayoutEffect(() => {
    const el = zoomInnerRef.current
    if (!el) return
    const measure = () => {
      const next = { width: el.offsetWidth, height: el.offsetHeight }
      const sizeChanged =
        next.width !== contentRef.current.width ||
        next.height !== contentRef.current.height
      contentRef.current = next
      if (sizeChanged) setContent(next)
      if (next.width === 0 || next.height === 0) return
      if (!seededCameraRef.current) {
        if (!applyFit(next)) return
        seededCameraRef.current = true
        return
      }
      commitPan(panRef.current)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [applyFit, commitPan, companyRoots, expanded])

  useLayoutEffect(() => {
    if (focusPersonId == null) return
    setHighlightId(empKey(focusPersonId))
  }, [focusPersonId])

  useEffect(() => {
    if (!locateRequest) return
    const targetId = locateRequest.id
    const reveal = ancestorIds(targetId, managerById)
    setUserExpanded((current) => {
      const next = new Set(current ?? baselineExpanded)
      next.add(COMPANY_ROOT_ID)
      for (const id of reveal) next.add(empKey(id))
      return next
    })

    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const scroll = scrollRef.current
        const target = scroll?.querySelector<HTMLElement>(
          `[data-employee-id="${escapeAttr(empKey(targetId))}"]`,
        )
        if (scroll && target) {
          commitPan(
            panCameraToCenterRects(
              panRef.current,
              scroll.getBoundingClientRect(),
              target.getBoundingClientRect(),
            ),
          )
          setHighlightId(empKey(targetId))
        }
      })
    })

    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [baselineExpanded, commitPan, locateRequest, managerById])

  useEffect(() => {
    if (!highlightId) return
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [highlightId])

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current)
      commitPan(panRef.current)
    }
    const onResize = () => commitPan(panRef.current)
    document.addEventListener('fullscreenchange', onChange)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      window.removeEventListener('resize', onResize)
    }
  }, [commitPan])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const DRAG_THRESHOLD_PX = 4
    let isPanning = false
    let moved = false
    let suppressNextClick = false
    let startX = 0
    let startY = 0
    let startPan = { x: 0, y: 0 }

    const ignoreTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(target.closest('button, input, textarea, select'))

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return
      if (ignoreTarget(event.target)) return
      isPanning = true
      moved = false
      suppressNextClick = false
      startX = event.clientX
      startY = event.clientY
      startPan = { ...panRef.current }
      el.setPointerCapture?.(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isPanning || !event.isPrimary) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        moved = true
        el.classList.add('pd-org-scroll--grabbing')
      }
      if (!moved) return
      event.preventDefault()
      commitPan({ x: startPan.x + dx, y: startPan.y + dy })
    }

    const endPan = (event: PointerEvent) => {
      if (!isPanning) return
      isPanning = false
      suppressNextClick = moved
      moved = false
      el.classList.remove('pd-org-scroll--grabbing')
      if (
        typeof el.hasPointerCapture === 'function' &&
        el.hasPointerCapture(event.pointerId)
      ) {
        el.releasePointerCapture(event.pointerId)
      }
    }

    const onClickCapture = (event: MouseEvent) => {
      if (!suppressNextClick) return
      suppressNextClick = false
      event.preventDefault()
      event.stopPropagation()
    }

    const onDragStart = (event: DragEvent) => {
      event.preventDefault()
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (event.ctrlKey || event.metaKey) {
        const rect = el.getBoundingClientRect()
        zoomAround(zoomRef.current - Math.sign(event.deltaY) * ZOOM_STEP, {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        })
        return
      }
      commitPan({
        x: panRef.current.x - event.deltaX,
        y: panRef.current.y - event.deltaY,
      })
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endPan)
    el.addEventListener('pointercancel', endPan)
    el.addEventListener('click', onClickCapture, true)
    el.addEventListener('dragstart', onDragStart)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endPan)
      el.removeEventListener('pointercancel', endPan)
      el.removeEventListener('click', onClickCapture, true)
      el.removeEventListener('dragstart', onDragStart)
      el.removeEventListener('wheel', onWheel)
    }
  }, [commitPan, loadState, employees.length, companyRoots.length, zoomAround])

  const toggle = useCallback(
    (id: string) => {
      setUserExpanded((current) => {
        const next = new Set(current ?? baselineExpanded)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [baselineExpanded],
  )

  const expandAll = useCallback(() => {
    const ids = collectIds(companyRoots)
    if (showCompanyRoot) ids.add(COMPANY_ROOT_ID)
    setUserExpanded(ids)
  }, [companyRoots, showCompanyRoot])

  const collapseAll = useCallback(() => setUserExpanded(new Set()), [])

  const zoomIn = useCallback(
    () => zoomAround(zoomRef.current + ZOOM_STEP, viewportCenter()),
    [viewportCenter, zoomAround],
  )
  const zoomOut = useCallback(
    () => zoomAround(zoomRef.current - ZOOM_STEP, viewportCenter()),
    [viewportCenter, zoomAround],
  )
  const resetZoom = useCallback(
    () => zoomAround(1, viewportCenter()),
    [viewportCenter, zoomAround],
  )

  const fitToScreen = useCallback(() => {
    applyFit(content)
  }, [applyFit, content])

  const findMe = useCallback(() => {
    if (myEmployeeId == null) return
    setSearchQuery('')
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

  const dataPending = loadState === 'loading' && employees.length === 0

  const statusMessage = dataPending
    ? 'Loading people…'
    : loadError && employees.length === 0
      ? loadError
      : employees.length === 0
        ? 'No employees in the directory yet.'
        : null

  return (
    <div className="pd-page pd-org pd-org--canvas" aria-label="Org chart">
      <div className="pd-org-stage" ref={stageRef}>
        {statusMessage ? (
          <p className="pd-people__empty pd-org-status">{statusMessage}</p>
        ) : (
          <>
            {companyRoots.length === 0 ? (
              <p className="pd-people__empty pd-org-status">
                No people match the current filters.
              </p>
            ) : (
              <div className="pd-org-scroll" ref={scrollRef}>
                <div className="pd-org-zoom-inner" ref={zoomInnerRef}>
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
            )}

            <div className="pd-org-overlay">
              <SearchField
                className="pd-org-search"
                label="Search people and departments"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search people or departments…"
                autoComplete="off"
              />

              <OrgChartControls
                zoom={zoom}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onResetZoom={resetZoom}
                onFindMe={findMe}
                canFindMe={myEmployeeId != null}
                onFit={fitToScreen}
                onExpandAll={expandAll}
                onCollapseAll={collapseAll}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
              />
            </div>

            <div className="pd-org-panel pd-org-footnote">
              <span className="pd-org-footnote-text">
                {visiblePeopleCount} of {employees.length} people ·{' '}
                {companyRoots.length} top-level
              </span>
              <Link to="/organisation" className="pd-org-footnote-link">
                Departments & Teams
              </Link>
              <button
                type="button"
                className="pd-org-footnote-link"
                onClick={() => void reload().catch(() => {})}
              >
                Refresh
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
