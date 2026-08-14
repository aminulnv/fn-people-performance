import { matchPath } from 'react-router-dom'
import type { BreadcrumbItem } from '@/components/ui'
import { profileNavItem, settingsNavItem } from '@/config/layout'
import type { NavItem } from './types'

export type BreadcrumbContext = {
  pathname: string
  navItems: NavItem[]
  employeeName?: string | null
  departmentName?: string | null
  teamName?: string | null
  cycleName?: string | null
  scorecardCycleLabel?: string | null
}

function matchNavItem(
  pathname: string,
  navItems: NavItem[],
): NavItem | undefined {
  return navItems.find((item) => {
    const exact = item.end ?? item.path === '/'
    return exact
      ? pathname === item.path
      : pathname === item.path || pathname.startsWith(`${item.path}/`)
  })
}

function peopleRoot(pathname: string): BreadcrumbItem {
  if (pathname === '/people-v2' || pathname.startsWith('/people-v2/')) {
    return { label: 'People', href: '/people-v2' }
  }
  return { label: 'People', href: '/people' }
}

/**
 * Builds the top-bar breadcrumb trail for the current route.
 * Top-level pages return a single current crumb; nested routes include parents.
 */
export function buildBreadcrumbs({
  pathname,
  navItems,
  employeeName,
  departmentName,
  teamName,
  cycleName,
  scorecardCycleLabel,
}: BreadcrumbContext): BreadcrumbItem[] {
  if (pathname === '/people-v2') {
    return [{ label: 'People' }]
  }

  const peopleV2Profile = matchPath(
    { path: '/people-v2/:employeeId', end: true },
    pathname,
  )
  if (peopleV2Profile) {
    return [
      peopleRoot(pathname),
      { label: employeeName?.trim() || 'Employee' },
    ]
  }

  if (pathname === '/people/new' || pathname.startsWith('/people/new/')) {
    return [peopleRoot(pathname), { label: 'Add employee' }]
  }

  const employeeEdit = matchPath(
    { path: '/people/:employeeId/edit', end: true },
    pathname,
  )
  if (employeeEdit?.params.employeeId) {
    const id = employeeEdit.params.employeeId
    const name = employeeName?.trim() || 'Employee'
    return [
      peopleRoot(pathname),
      { label: name, href: `/people/${id}` },
      { label: 'Edit' },
    ]
  }

  const employeeProfile = matchPath(
    { path: '/people/:employeeId', end: true },
    pathname,
  )
  if (
    employeeProfile?.params.employeeId &&
    employeeProfile.params.employeeId !== 'new'
  ) {
    return [
      peopleRoot(pathname),
      { label: employeeName?.trim() || 'Employee' },
    ]
  }

  if (pathname === '/organisation/departments/new') {
    return [
      { label: 'Organisation', href: '/organisation' },
      { label: 'Add department' },
    ]
  }

  if (pathname === '/organisation/chart') {
    return [
      { label: 'Organisation', href: '/organisation' },
      { label: 'Org chart' },
    ]
  }

  const department = matchPath(
    { path: '/organisation/departments/:departmentId', end: true },
    pathname,
  )
  if (
    department?.params.departmentId &&
    department.params.departmentId !== 'new'
  ) {
    return [
      { label: 'Organisation', href: '/organisation' },
      {
        label:
          departmentName?.trim() ||
          decodeURIComponent(department.params.departmentId),
      },
    ]
  }

  const team = matchPath(
    { path: '/organisation/teams/:teamId', end: true },
    pathname,
  )
  if (team?.params.teamId) {
    return [
      { label: 'Organisation', href: '/organisation' },
      {
        label: teamName?.trim() || decodeURIComponent(team.params.teamId),
      },
    ]
  }

  const cycleDetail =
    matchPath(
      { path: '/reviews/cycles/:cycleId/:section', end: true },
      pathname,
    ) ?? matchPath({ path: '/reviews/cycles/:cycleId', end: true }, pathname)
  if (cycleDetail?.params.cycleId) {
    return [
      { label: 'Reviews', href: '/reviews/cycles' },
      {
        label:
          cycleName?.trim() ||
          decodeURIComponent(cycleDetail.params.cycleId),
      },
    ]
  }

  const scorecardDetail = matchPath(
    { path: '/reviews/scorecards/:cycleKey/:employeeId', end: true },
    pathname,
  )
  if (scorecardDetail?.params.employeeId) {
    const cycleKey = scorecardDetail.params.cycleKey
      ? decodeURIComponent(scorecardDetail.params.cycleKey)
      : ''
    const cycleLabel =
      scorecardCycleLabel?.trim() || cycleKey || 'Cycle'
    return [
      { label: 'Reviews', href: '/reviews/scorecards' },
      { label: 'Scorecards', href: '/reviews/scorecards' },
      { label: cycleLabel, href: '/reviews/scorecards' },
      { label: employeeName?.trim() || 'Scorecard' },
    ]
  }

  if (
    pathname === profileNavItem.path ||
    pathname.startsWith(`${profileNavItem.path}/`)
  ) {
    return [{ label: profileNavItem.label }]
  }

  if (
    pathname === settingsNavItem.path ||
    pathname.startsWith(`${settingsNavItem.path}/`)
  ) {
    return [{ label: settingsNavItem.label }]
  }

  const navItem = matchNavItem(pathname, navItems)
  if (navItem) {
    return [{ label: navItem.label }]
  }

  return [{ label: 'App' }]
}

/** Section icon for the top bar — first matching nav / account item. */
export function resolveTopBarIcon(
  pathname: string,
  navItems: NavItem[],
): NavItem['icon'] | undefined {
  if (pathname === '/people-v2' || pathname.startsWith('/people-v2/')) {
    return navItems.find((item) => item.path === '/people')?.icon
  }
  if (
    pathname === profileNavItem.path ||
    pathname.startsWith(`${profileNavItem.path}/`)
  ) {
    return profileNavItem.icon
  }
  if (
    pathname === settingsNavItem.path ||
    pathname.startsWith(`${settingsNavItem.path}/`)
  ) {
    return settingsNavItem.icon
  }
  return matchNavItem(pathname, navItems)?.icon
}
