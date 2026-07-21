import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import type { NavItem, BrandConfig } from './types'
import { applySidebarExpanded } from '@/lib/sidebarPrefs'
import { useSidebarPrefs } from './useSidebarPrefs'
declare const __APP_VERSION__: string
const APP_VERSION = __APP_VERSION__

const NAV_ICON_SIZE = 17
const NAV_ICON_STROKE = 1.75
const SIDEBAR_WIDTH_COLLAPSED = '4.875rem'
const SIDEBAR_WIDTH_EXPANDED = '15.5rem'
const HOVER_CLOSE_DELAY_MS = 140

interface SidebarProps {
  navItems: NavItem[]
  brand: BrandConfig
  isMobile?: boolean
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

function navLinkClass(collapsed: boolean, isActive: boolean) {
  return [
    'pd-sidebar-nav__link',
    collapsed && 'pd-sidebar-nav__link--collapsed',
    isActive && 'is-active',
  ]
    .filter(Boolean)
    .join(' ')
}

function NavItemLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate: () => void
}) {
  const { icon: Icon, label, path, end } = item
  const linkRef = useRef<HTMLAnchorElement>(null)
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(
    null,
  )

  const hideTip = () => setTipPos(null)

  const showTip = () => {
    if (!collapsed || !linkRef.current) return
    const linkRect = linkRef.current.getBoundingClientRect()
    const sidebar = linkRef.current.closest('.pd-app-sidebar')
    const sidebarRight =
      sidebar?.getBoundingClientRect().right ?? linkRect.right
    setTipPos({
      top: linkRect.top + linkRect.height / 2,
      left: sidebarRight + 6,
    })
  }

  useEffect(() => {
    if (!collapsed) hideTip()
  }, [collapsed])

  return (
    <>
      <NavLink
        ref={linkRef}
        to={path}
        end={end ?? path === '/'}
        className={({ isActive }) => navLinkClass(collapsed, isActive)}
        aria-label={collapsed ? label : undefined}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        onClick={(e) => {
          e.stopPropagation()
          hideTip()
          onNavigate()
        }}
      >
        <span className="pd-sidebar-nav__icon">
          <Icon size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE} />
        </span>
        <span className="pd-sidebar-nav__label">{label}</span>
      </NavLink>
      {tipPos &&
        collapsed &&
        createPortal(
          <div
            className="pd-sidebar-nav__tip"
            style={{ top: tipPos.top, left: tipPos.left }}
            role="tooltip"
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  )
}

export function Sidebar({
  navItems,
  brand,
  isMobile = false,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const navigate = useNavigate()
  const { mode, expanded } = useSidebarPrefs()
  const [hovered, setHovered] = useState(false)
  const hoverCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isManual = mode === 'manual'
  const collapsed = isMobile
    ? false
    : isManual
      ? !expanded
      : !hovered
  const { name, subtitle, icon: BrandIcon, logoUrl } = brand
  const spaceIndex = name.indexOf(' ')
  const nameFirst = spaceIndex === -1 ? name : name.slice(0, spaceIndex)
  const nameRest = spaceIndex === -1 ? '' : name.slice(spaceIndex + 1)
  const versionLabel = `v${APP_VERSION}`

  const clearHoverClose = () => {
    if (hoverCloseRef.current) {
      clearTimeout(hoverCloseRef.current)
      hoverCloseRef.current = null
    }
  }

  useEffect(() => () => clearHoverClose(), [])

  useEffect(() => {
    if (isManual) {
      clearHoverClose()
      setHovered(false)
    }
  }, [isManual])

  const closeMobile = () => {
    if (isMobile) onMobileClose?.()
  }

  const toggleExpanded = () => {
    applySidebarExpanded(collapsed)
  }

  const inner = (
    <>
      <div
        className={[
          'pd-sidebar-brand',
          !isMobile && isManual && collapsed && 'pd-sidebar-brand--toggle-collapsed',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => {
          e.stopPropagation()
          navigate('/')
          closeMobile()
        }}
      >
        <div className="pd-app-logo pd-app-logo--sm">
          {logoUrl ? (
            <img src={logoUrl} alt="" />
          ) : (
            <BrandIcon size={18} strokeWidth={2.5} />
          )}
        </div>
        <div
          className={`pd-sidebar-brand__text${collapsed ? ' is-collapsed' : ''}`}
          aria-hidden={collapsed}
        >
          <div className="pd-sidebar-brand__name">
            {nameFirst}
            {nameRest ? (
              <>
                <br />
                {nameRest}
              </>
            ) : null}
          </div>
          {subtitle && (
            <div className="pd-sidebar-brand__subtitle">{subtitle}</div>
          )}
        </div>
        {isMobile && (
          <button
            type="button"
            className="pd-sidebar-btn pd-sidebar-brand__close"
            aria-label="Close menu"
            onClick={(e) => {
              e.stopPropagation()
              closeMobile()
            }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
        {!isMobile && isManual && (
          <button
            type="button"
            className="pd-sidebar-btn pd-sidebar-brand__toggle"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={(e) => {
              e.stopPropagation()
              toggleExpanded()
            }}
          >
            {collapsed ? (
              <PanelLeftOpen size={14} strokeWidth={2} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={14} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <div className="pd-sidebar-body">
        <div className="pd-sidebar-divider" />
        <nav className="pd-sidebar-nav">
          {navItems.map((item) => (
            <NavItemLink
              key={item.path}
              item={item}
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          ))}
        </nav>

        <div
          className={`pd-sidebar-version${collapsed ? ' pd-sidebar-version--collapsed' : ''}`}
          title={collapsed ? undefined : versionLabel}
          aria-hidden={collapsed}
        >
          {versionLabel}
        </div>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        <div
          className={`pd-app-sidebar__backdrop${isMobileOpen ? ' is-open' : ''}`}
          onClick={onMobileClose}
        />
        <aside
          className={`pd-app-sidebar pd-app-sidebar--mobile${isMobileOpen ? ' is-open' : ''}`}
          style={{ width: SIDEBAR_WIDTH_EXPANDED }}
        >
          <div className="pd-app-sidebar__inner">{inner}</div>
        </aside>
      </>
    )
  }

  return (
    <aside
      className="pd-app-sidebar"
      style={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
      }}
      onMouseEnter={
        isManual
          ? undefined
          : () => {
              clearHoverClose()
              setHovered(true)
            }
      }
      onMouseLeave={
        isManual
          ? undefined
          : () => {
              clearHoverClose()
              hoverCloseRef.current = setTimeout(
                () => setHovered(false),
                HOVER_CLOSE_DELAY_MS,
              )
            }
      }
    >
      <div className="pd-app-sidebar__inner">{inner}</div>
    </aside>
  )
}
