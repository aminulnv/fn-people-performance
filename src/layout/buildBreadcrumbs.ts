import { matchPath } from 'react-router-dom'
import type { BreadcrumbItem } from '@/components/ui'
import { profileNavItem, settingsNavItem } from '@/config/layout'
import { cycleDetailPath } from '@/lib/reviews/paths'
import type { NavItem } from './types'

export type BreadcrumbContext = {
  pathname: string
  navItems: NavItem[]
  employeeName?: string | null
  departmentName?: string | null
  teamName?: string | null
  cycleName?: string | null
  cycleGroupName?: string | null
  scorecardCycleLabel?: string | null
  goalsCycleLabel?: string | null
  goalsGoalTitle?: string | null
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

function peopleRoot(): BreadcrumbItem {
  return { label: 'People', href: '/people' }
}

function goalsRoot(_pathname: string): BreadcrumbItem {
  return { label: 'Goals', href: '/goals' }
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
  cycleGroupName,
  scorecardCycleLabel,
  goalsCycleLabel,
  goalsGoalTitle,
}: BreadcrumbContext): BreadcrumbItem[] {
  if (pathname === '/people/new' || pathname.startsWith('/people/new/')) {
    return [peopleRoot(), { label: 'Add Employee' }]
  }

  const employeeEdit = matchPath(
    { path: '/people/:employeeId/edit', end: true },
    pathname,
  )
  if (employeeEdit?.params.employeeId) {
    const id = employeeEdit.params.employeeId
    const name = employeeName?.trim() || 'Employee'
    return [
      peopleRoot(),
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
      peopleRoot(),
      { label: employeeName?.trim() || 'Employee' },
    ]
  }

  if (pathname === '/organisation/departments/new') {
    return [
      { label: 'Organisation', href: '/organisation' },
      { label: 'Add Department' },
    ]
  }

  if (pathname === '/organisation/chart') {
    return [
      { label: 'Organisation', href: '/organisation' },
      { label: 'Org Chart' },
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

  const cycleGroup = matchPath(
    { path: '/cycles/:cycleId/groups/:groupId', end: true },
    pathname,
  )
  if (cycleGroup?.params.cycleId && cycleGroup.params.groupId) {
    const cycleId = decodeURIComponent(cycleGroup.params.cycleId)
    return [
      { label: 'Cycles', href: '/cycles' },
      {
        label: cycleName?.trim() || cycleId,
        href: cycleDetailPath(cycleId),
      },
      {
        label:
          cycleGroupName?.trim() ||
          decodeURIComponent(cycleGroup.params.groupId),
      },
    ]
  }

  const cycleDetail =
    matchPath(
      { path: '/cycles/:cycleId/:section', end: true },
      pathname,
    ) ?? matchPath({ path: '/cycles/:cycleId', end: true }, pathname)
  if (cycleDetail?.params.cycleId) {
    return [
      { label: 'Cycles', href: '/cycles' },
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

  const goalsDetail =
    matchPath(
      { path: '/goals/:cycleId/:personId/:goalId', end: true },
      pathname,
    ) ??
    matchPath(
      { path: '/goals/:cycleId/:personId', end: true },
      pathname,
    )
  if (goalsDetail?.params.personId) {
    const cycleId = goalsDetail.params.cycleId
      ? decodeURIComponent(goalsDetail.params.cycleId)
      : ''
    const personId = decodeURIComponent(goalsDetail.params.personId)
    const root = goalsRoot(pathname)
    const personLabel = employeeName?.trim() || 'Goals'
    const personHref = `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(personId)}`
    const goalTitle = goalsGoalTitle?.trim()
    return [
      root,
      { label: goalsCycleLabel?.trim() || cycleId || 'Cycle', href: root.href },
      goalTitle
        ? { label: personLabel, href: personHref }
        : { label: personLabel },
      ...(goalTitle ? [{ label: goalTitle }] : []),
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

/** Section icon for the top bar - first matching nav / account item. */
export function resolveTopBarIcon(
  pathname: string,
  navItems: NavItem[],
): NavItem['icon'] | undefined {
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
