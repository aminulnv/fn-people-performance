import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { settingsNavItem, profileNavItem } from '@/config/layout'
import { APP_VERSION_LABEL } from '@/lib/appVersion'
import { WritingAssistant } from '@/components/assistant/WritingAssistant'
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
        isMobile ? 'pd-app-shell--mobile' : '',
        isMobile && isMobileOpen ? 'pd-app-shell--mobile-nav-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="pd-app-shell__main">
        <Sidebar
          navItems={navItems}
          brand={brand}
          isMobile={isMobile}
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />
        <div className="pd-app-content">
          <div className="pd-app-content-card">
            <TopBar
              title={currentNavItem?.label ?? 'App'}
              titleIcon={currentNavItem?.icon}
              userName={userName}
              profileSubtext={profileSubtext}
              onSignOut={onSignOut}
              onMobileMenuOpen={() => setIsMobileOpen(true)}
              isMobile={isMobile}
            />
            <main className="pd-app-main">
              <Outlet />
            </main>
            <footer
              className="pd-app-footer"
              title={`App version ${APP_VERSION_LABEL}`}
            >
              <span className="pd-app-footer__version">{APP_VERSION_LABEL}</span>
            </footer>
          </div>
        </div>
      </div>
      <WritingAssistant />
    </div>
  )
}
