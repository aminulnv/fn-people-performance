import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { settingsNavItem, profileNavItem } from '@/config/layout'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useBreakpoint } from './useBreakpoint'
import type { AppLayoutConfig } from './types'

interface AppLayoutProps extends AppLayoutConfig {
  profileSubtext?: string
  onSignOut?: () => void
  userName?: string
}

function matchNavItem(
  pathname: string,
  navItems: AppLayoutConfig['navItems'],
) {
  return (
    navItems.find((item) => {
      const exact = item.end ?? item.path === '/'
      return exact
        ? pathname === item.path
        : pathname === item.path || pathname.startsWith(`${item.path}/`)
    }) ?? navItems[0]
  )
}

export function AppLayout({
  navItems,
  brand,
  profileSubtext,
  onSignOut,
  userName,
}: AppLayoutProps) {
  const { pathname } = useLocation()
  const { isMobile } = useBreakpoint()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    if (!isMobile) setIsMobileOpen(false)
  }, [isMobile])

  // Pause shell glow while the tab is hidden — keeps compositor idle in background
  useEffect(() => {
    const syncMotionPause = () => {
      document.documentElement.classList.toggle(
        'pd-motion-paused',
        document.hidden,
      )
    }
    syncMotionPause()
    document.addEventListener('visibilitychange', syncMotionPause)
    return () => {
      document.removeEventListener('visibilitychange', syncMotionPause)
      document.documentElement.classList.remove('pd-motion-paused')
    }
  }, [])

  const currentNavItem =
    pathname === profileNavItem.path ||
    pathname.startsWith(`${profileNavItem.path}/`)
      ? profileNavItem
      : pathname === settingsNavItem.path ||
          pathname.startsWith(`${settingsNavItem.path}/`)
        ? settingsNavItem
        : matchNavItem(pathname, navItems)

  return (
    <div
      className={[
        'pd-app-shell',
        isMobile && isMobileOpen ? 'pd-app-shell--mobile-nav-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="pd-app-shell__main"
        style={{
          paddingRight: isMobile ? 0 : '0.5rem',
          paddingBottom: isMobile ? 0 : '0.5rem',
        }}
      >
        <Sidebar
          navItems={navItems}
          brand={brand}
          isMobile={isMobile}
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />
        <div
          className="pd-app-content"
          style={{
            paddingTop: isMobile ? 0 : '0.5rem',
          }}
        >
          <div
            className="pd-app-content-card"
            style={{
              borderRadius: isMobile ? 0 : '0.75rem',
            }}
          >
            <TopBar
              title={currentNavItem?.label ?? 'App'}
              titleIcon={currentNavItem?.icon}
              userName={userName}
              profileSubtext={profileSubtext}
              onSignOut={onSignOut}
              onMobileMenuOpen={() => setIsMobileOpen(true)}
              isMobile={isMobile}
            />
            <main
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: isMobile ? '1rem' : '1.5rem',
              }}
            >
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
