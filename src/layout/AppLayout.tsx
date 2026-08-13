import { useState, useEffect, useMemo } from 'react'
import { Outlet, useLocation, matchPath } from 'react-router-dom'
import {
  Building2,
  Pencil,
  Plus,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import { settingsNavItem, profileNavItem } from '@/config/layout'
import { APP_VERSION_LABEL } from '@/lib/appVersion'
import { getEmployee } from '@/lib/employees/store'
import { useEmployees } from '@/lib/employees/useEmployees'
import { buildOrganisationFromEmployees } from '@/lib/organisation/fromEmployees'
import { WritingAssistant } from '@/components/assistant/WritingAssistant'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { TopBarCycleSelect } from './TopBarCycleSelect'
import { useAssistantPrefs } from './useAssistantPrefs'
import { useBreakpoint } from './useBreakpoint'
import type { AppLayoutConfig, NavItem } from './types'

interface AppLayoutProps extends AppLayoutConfig {
  onSignOut?: () => void
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
  onSignOut,
}: AppLayoutProps) {
  const { pathname } = useLocation()
  const { isMobile } = useBreakpoint()
  const { enabled: assistantEnabled } = useAssistantPrefs()
  const { employees } = useEmployees({ load: false })
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

  const addEmployeeNavItem: NavItem = {
    path: '/people/new',
    label: 'Add employee',
    icon: UserPlus,
  }
  const addDepartmentNavItem: NavItem = {
    path: '/organisation/departments/new',
    label: 'Add department',
    icon: Plus,
  }
  /** Directory redesign under review — titled like People, not linked in nav. */
  const peopleV2NavItem: NavItem = {
    path: '/people-v2',
    label: 'People',
    icon: Users,
  }

  const employeeEditMatch = matchPath(
    { path: '/people/:employeeId/edit', end: true },
    pathname,
  )
  const employeeProfileMatch = matchPath(
    { path: '/people/:employeeId', end: true },
    pathname,
  )
  const employeeProfileV2Match = matchPath(
    { path: '/people-v2/:employeeId', end: true },
    pathname,
  )
  const profileEmployeeId = Number(
    employeeEditMatch?.params.employeeId ??
      employeeProfileMatch?.params.employeeId ??
      employeeProfileV2Match?.params.employeeId,
  )
  const profileEmployee =
    Number.isInteger(profileEmployeeId) && profileEmployeeId > 0
      ? getEmployee(profileEmployeeId)
      : null

  const editEmployeeNavItem: NavItem | null = employeeEditMatch
    ? {
      path: pathname,
      label: profileEmployee
        ? `Edit ${profileEmployee.fullName}`
        : 'Edit employee',
      icon: Pencil,
    }
    : null

  const employeeProfileNavItem: NavItem | null =
    !employeeEditMatch &&
      employeeProfileMatch &&
      employeeProfileMatch.params.employeeId !== 'new'
      ? {
        path: pathname,
        label: profileEmployee?.fullName ?? 'Employee',
        icon: Users,
      }
      : null

  const employeeProfileV2NavItem: NavItem | null = employeeProfileV2Match
    ? {
        path: pathname,
        label: profileEmployee?.fullName ?? 'Employee',
        icon: Users,
      }
    : null

  const departmentMatch = matchPath(
    { path: '/organisation/departments/:departmentId', end: true },
    pathname,
  )
  const teamMatch = matchPath(
    { path: '/organisation/teams/:teamId', end: true },
    pathname,
  )
  const departmentIdParam =
    departmentMatch?.params.departmentId &&
      departmentMatch.params.departmentId !== 'new'
      ? departmentMatch.params.departmentId
      : undefined
  const teamIdParam = teamMatch?.params.teamId
  const orgSnapshot = useMemo(() => {
    if (!departmentIdParam && !teamIdParam) return null
    return buildOrganisationFromEmployees(employees)
  }, [departmentIdParam, employees, teamIdParam])
  const departmentNavItem: NavItem | null = departmentIdParam
    ? {
      path: pathname,
      label:
        orgSnapshot?.departments.find(
          (d) => d.id === decodeURIComponent(departmentIdParam),
        )?.name ?? 'Department',
      icon: Building2,
    }
    : null
  const teamNavItem: NavItem | null = teamIdParam
    ? {
      path: pathname,
      label:
        orgSnapshot?.teams.find(
          (t) => t.id === decodeURIComponent(teamIdParam),
        )?.name ?? 'Team',
      icon: UsersRound,
    }
    : null

  const currentNavItem =
    pathname === '/people-v2'
      ? peopleV2NavItem
      : employeeProfileV2NavItem
        ? employeeProfileV2NavItem
        : pathname === '/people/new' || pathname.startsWith('/people/new/')
          ? addEmployeeNavItem
          : pathname === '/organisation/departments/new'
            ? addDepartmentNavItem
            : editEmployeeNavItem
              ? editEmployeeNavItem
              : employeeProfileNavItem
                ? employeeProfileNavItem
                : departmentNavItem
                  ? departmentNavItem
                  : teamNavItem
                    ? teamNavItem
                    : pathname === profileNavItem.path ||
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
              titleAccessory={
                pathname === '/goals' || pathname.startsWith('/goals/') ? (
                  <TopBarCycleSelect isMobile={isMobile} />
                ) : null
              }
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
      {assistantEnabled ? <WritingAssistant /> : null}
    </div>
  )
}
