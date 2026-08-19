import { Suspense, useState, useEffect, useMemo } from 'react'
import { useLocation, matchPath } from 'react-router-dom'
import { APP_VERSION_LABEL } from '@/lib/appVersion'
import { installTableScrollbarReveal } from '@/lib/tableScrollbarReveal'
import { SuspenseRouteContent } from '@/components/ui/NavigationProgress'
import { getEmployee } from '@/lib/employees/store'
import { useEmployees } from '@/lib/employees/useEmployees'
import { buildOrganisationFromEmployees } from '@/lib/organisation/fromEmployees'
import { WritingAssistant } from '@/components/assistant/WritingAssistant'
import {
  buildBreadcrumbs,
  resolveTopBarIcon,
} from './buildBreadcrumbs'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { getReviewCycle } from '@/lib/reviews/store'
import { cycleLabelFromKey } from '@/lib/reviews/scorecards'
import { TopBarCycleNav } from './TopBarCycleNav'
import { useAssistantPrefs } from './useAssistantPrefs'
import { useBreakpoint } from './useBreakpoint'
import type { AppLayoutConfig } from './types'
import { navItemsForPermissions } from '@/config/layout'
import { useAuth } from '@/lib/useAuth'

interface AppLayoutProps extends AppLayoutConfig {
  onSignOut?: () => void
}

export function AppLayout({
  navItems,
  brand,
  onSignOut,
}: AppLayoutProps) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { isMobile } = useBreakpoint()
  const { enabled: assistantEnabled } = useAssistantPrefs()
  const { employees } = useEmployees({ load: false })
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const visibleNavItems = useMemo(
    () => navItemsForPermissions(navItems, user?.permissions),
    [navItems, user?.permissions],
  )

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

  useEffect(() => installTableScrollbarReveal(), [])

  const employeeEditMatch = matchPath(
    { path: '/people/:employeeId/edit', end: true },
    pathname,
  )
  const employeeProfileMatch = matchPath(
    { path: '/people/:employeeId', end: true },
    pathname,
  )
  const scorecardDetailMatch = matchPath(
    { path: '/reviews/scorecards/:cycleKey/:employeeId', end: true },
    pathname,
  )
  const goalItemMatch =
    matchPath(
      { path: '/goals-v2/:cycleId/:personId/:goalId', end: true },
      pathname,
    ) ??
    matchPath(
      { path: '/goals/:cycleId/:personId/:goalId', end: true },
      pathname,
    )
  const goalsDetailMatch =
    matchPath(
      { path: '/goals-v2/:cycleId/:personId', end: true },
      pathname,
    ) ??
    matchPath(
      { path: '/goals/:cycleId/:personId', end: true },
      pathname,
    ) ??
    goalItemMatch
  const profileEmployeeId = Number(
    employeeEditMatch?.params.employeeId ??
    employeeProfileMatch?.params.employeeId ??
    scorecardDetailMatch?.params.employeeId ??
    goalsDetailMatch?.params.personId,
  )
  const profileEmployee =
    Number.isInteger(profileEmployeeId) && profileEmployeeId > 0
      ? getEmployee(profileEmployeeId)
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

  const cycleDetailMatch =
    matchPath(
      { path: '/cycles/:cycleId/:section', end: true },
      pathname,
    ) ??
    matchPath({ path: '/cycles/:cycleId', end: true }, pathname)
  const cycleIdParam = cycleDetailMatch?.params.cycleId
  const cycleName = cycleIdParam
    ? getReviewCycle(cycleIdParam)?.name
    : undefined
  const isCycleDetail = Boolean(cycleIdParam)
  const scorecardCycleKey = scorecardDetailMatch?.params.cycleKey
    ? decodeURIComponent(scorecardDetailMatch.params.cycleKey)
    : undefined
  const scorecardCycleLabel = scorecardCycleKey
    ? cycleLabelFromKey(scorecardCycleKey)
    : undefined
  const goalsCycleId = goalsDetailMatch?.params.cycleId
    ? decodeURIComponent(goalsDetailMatch.params.cycleId)
    : undefined
  const goalsCycleLabel = goalsCycleId
    ? (getReviewCycle(goalsCycleId)?.name ?? cycleLabelFromKey(goalsCycleId))
    : undefined

  const breadcrumbs = useMemo(
    () =>
      buildBreadcrumbs({
        pathname,
        navItems,
        employeeName: profileEmployee?.fullName,
        departmentName: departmentIdParam
          ? orgSnapshot?.departments.find(
            (d) => d.id === decodeURIComponent(departmentIdParam),
          )?.name
          : undefined,
        teamName: teamIdParam
          ? orgSnapshot?.teams.find(
            (t) => t.id === decodeURIComponent(teamIdParam),
          )?.name
          : undefined,
        cycleName,
        scorecardCycleLabel,
        goalsCycleLabel,
      }),
    [
      cycleName,
      departmentIdParam,
      goalsCycleLabel,
      navItems,
      orgSnapshot,
      pathname,
      profileEmployee?.fullName,
      scorecardCycleLabel,
      teamIdParam,
    ],
  )

  const titleIcon = resolveTopBarIcon(pathname, visibleNavItems)

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
          navItems={visibleNavItems}
          brand={brand}
          isMobile={isMobile}
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />
        <div className="pd-app-content">
          <div className="pd-app-content-card">
            <TopBar
              breadcrumbs={breadcrumbs}
              titleIcon={titleIcon}
              centerSlot={isCycleDetail ? <TopBarCycleNav /> : null}
              onSignOut={onSignOut}
              onMobileMenuOpen={() => setIsMobileOpen(true)}
              isMobile={isMobile}
            />
            {/*
             * The only scroll container for page content. It sits below the top
             * bar, so page-level `position: sticky` chrome pins to this box and
             * can never paint over the top bar, whatever z-index a page uses.
             */}
            <div className="pd-app-scroll">
              <main className="pd-app-main">
                <Suspense fallback={null}>
                  <SuspenseRouteContent />
                </Suspense>
              </main>
            </div>
            {/* Outside the scroller: the version label floats so it costs no page height. */}
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
