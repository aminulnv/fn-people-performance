import {
  Bell,
  Building2,
  CalendarCog,
  Network,
  Star,
  Target,
  UserPlus,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react'
import { searchablePages, navItemsForPermissions } from '@/config/layout'
import type { SystemPermission } from '@/lib/accessControl/types'
import { hasSystemPermission } from '@/lib/accessControl/types'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { GoalsSnapshot, PersonGoals, SubmissionStatus } from '@/lib/goals/types'
import { displayGoalTitle } from '@/lib/goals/weightage'
import type { NotificationRecord } from '@/lib/notifications/types'
import {
  departmentDetailPath,
  teamDetailPath,
} from '@/lib/organisation/paths'
import type { OrganisationSnapshot } from '@/lib/organisation/types'
import { cycleDetailPath } from '@/lib/reviews/paths'
import { PURPOSE_SHORT_LABEL, cyclePurposeOf } from '@/lib/reviews/purpose'
import {
  SCORECARD_STATUS_LIST_LABEL,
  scorecardDetailPath,
  type ScorecardRow,
} from '@/lib/reviews/scorecards'
import { cycleStatusLabel, resolveCycleStatus } from '@/lib/reviews/status'
import type { ReviewCycle } from '@/lib/reviews/types'
import type { SearchItem } from './types'

const GOAL_STATUS_LABEL: Record<SubmissionStatus, string> = {
  not_eligible: 'Not eligible',
  draft: 'Draft',
  submitted: 'Pending approval',
  sent_back: 'Sent back',
  approved: 'Approved',
  incomplete: 'Incomplete',
}

export type SearchCatalogUser = {
  personId: string
  email: string
  name: string
  employeeId?: number | null
  permissions?: readonly SystemPermission[]
}

export type ExtraCycleGoals = {
  cycleId: string
  cycleLabel: string
  people: GoalsSnapshot['people']
  byPerson: Record<string, PersonGoals>
}

export type SearchCatalogInput = {
  user: SearchCatalogUser | null
  employees: PlatformEmployee[]
  organisation: OrganisationSnapshot
  goals: GoalsSnapshot
  extraCycleGoals?: ExtraCycleGoals[]
  cycles: ReviewCycle[]
  scorecards: ScorecardRow[]
  notifications: NotificationRecord[]
}

function uniqueKeywords(values: Array<string | number | undefined | null>): string[] {
  const seen = new Set<string>()
  const keywords: string[] = []
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    keywords.push(text)
  }
  return keywords
}

function canWrite(user: SearchCatalogUser | null): boolean {
  return hasSystemPermission(user?.permissions, 'platform.write_all')
}

function goalsDetailPath(cycleId: string, personId: string): string {
  return `/goals/${encodeURIComponent(cycleId)}/${encodeURIComponent(personId)}`
}

function goalsGoalPath(
  cycleId: string,
  personId: string,
  goalId: string,
): string {
  return `${goalsDetailPath(cycleId, personId)}/${encodeURIComponent(goalId)}`
}

function personGoalsItems(
  cycleId: string,
  cycleLabel: string,
  people: GoalsSnapshot['people'],
  byPerson: Record<string, PersonGoals>,
): SearchItem[] {
  const items: SearchItem[] = []
  const peopleById = new Map(people.map((person) => [person.id, person]))

  for (const [personId, row] of Object.entries(byPerson)) {
    const owner = peopleById.get(personId)
    const ownerName = owner?.name ?? 'Someone'
    row.goals.forEach((goal, index) => {
      const title = displayGoalTitle(goal, index)
      items.push({
        id: `goal:${cycleId}:${personId}:${goal.id}`,
        kind: 'goal',
        scope: 'goals',
        label: title,
        description: `${ownerName} · ${cycleLabel}`,
        keywords: uniqueKeywords([
          ownerName,
          cycleLabel,
          goal.details,
          goal.linkedGoalLabel,
          ...goal.measurements.map((measure) => measure.title),
        ]),
        path: goalsGoalPath(cycleId, personId, goal.id),
        icon: Target,
        status: GOAL_STATUS_LABEL[row.status],
        statusVariant:
          row.status === 'approved'
            ? 'completed'
            : row.status === 'submitted'
              ? 'pending'
              : row.status === 'sent_back'
                ? 'pending'
                : row.status === 'incomplete' || row.status === 'not_eligible'
                  ? 'danger'
                  : 'neutral',
      })
    })
  }
  return items
}

function actionItems(
  user: SearchCatalogUser | null,
  goals: GoalsSnapshot,
): SearchItem[] {
  const write = canWrite(user)
  const personId = user?.employeeId
    ? String(user.employeeId)
    : user?.personId && user.personId !== 'local'
      ? user.personId
      : null
  const myGoalsPath = personId
    ? goalsDetailPath(goals.cycle.id, personId)
    : '/goals'

  const actions: SearchItem[] = [
    {
      id: 'action:my-goals',
      kind: 'action',
      scope: 'actions',
      label: 'Go To My Goals',
      description: goals.cycle.label,
      keywords: uniqueKeywords(['goals', 'mine', 'my goals', goals.cycle.label]),
      path: myGoalsPath,
      icon: Target,
    },
    {
      id: 'action:my-profile',
      kind: 'action',
      scope: 'actions',
      label: 'Go To My Profile',
      description: user?.name,
      keywords: uniqueKeywords(['profile', 'account', 'me']),
      path: '/profile',
      icon: UserRound,
    },
    {
      id: 'action:my-reviews',
      kind: 'action',
      scope: 'actions',
      label: 'Open My Reviews',
      description: 'Scorecards',
      keywords: uniqueKeywords(['reviews', 'scorecards', 'mine']),
      path: '/reviews/scorecards',
      icon: Star,
    },
    {
      id: 'action:org-chart',
      kind: 'action',
      scope: 'actions',
      label: 'Open Organisation Chart',
      keywords: uniqueKeywords(['org chart', 'tree', 'reporting']),
      path: '/organisation/chart',
      icon: Network,
    },
    {
      id: 'action:settings',
      kind: 'action',
      scope: 'actions',
      label: 'Open Settings',
      keywords: uniqueKeywords(['preferences', 'account']),
      path: '/settings',
      icon: Zap,
    },
  ]

  if (write) {
    actions.unshift({
      id: 'action:create-person',
      kind: 'action',
      scope: 'actions',
      label: 'Create A Person',
      description: 'Add someone to the directory',
      keywords: uniqueKeywords(['new employee', 'add person', 'hire']),
      path: '/people/new',
      icon: UserPlus,
    })
  }

  return actions
}

export function buildSearchCatalog(input: SearchCatalogInput): SearchItem[] {
  const {
    user,
    employees,
    organisation,
    goals,
    extraCycleGoals = [],
    cycles,
    scorecards,
    notifications,
  } = input
  const write = canWrite(user)
  const items: SearchItem[] = []

  items.push(...actionItems(user, goals))

  const pages = navItemsForPermissions(searchablePages, user?.permissions)
  for (const page of pages) {
    items.push({
      id: `page:${page.path}`,
      kind: 'page',
      scope: 'pages',
      label: page.label,
      description: page.path === '/' ? 'Home' : page.path,
      keywords: uniqueKeywords([page.path, page.comingSoon ? 'coming soon' : '']),
      path: page.path,
      icon: page.icon,
    })
  }

  items.push({
    id: 'page:/organisation/chart',
    kind: 'page',
    scope: 'pages',
    label: 'Organisation Chart',
    description: '/organisation/chart',
    keywords: uniqueKeywords(['org chart', 'tree']),
    path: '/organisation/chart',
    icon: Network,
  })

  for (const employee of employees) {
    if (!employee.isActive) continue
    items.push({
      id: `person:${employee.employeeId}`,
      kind: 'person',
      scope: 'people',
      label: employee.fullName,
      description:
        [employee.jobTitle, employee.department].filter(Boolean).join(' · ') ||
        employee.email,
      keywords: uniqueKeywords([
        employee.employeeId,
        employee.email,
        employee.jobTitle,
        employee.department,
        employee.team,
        employee.division,
        employee.jobGrade,
        employee.reportsToName,
      ]),
      path: `/people/${employee.employeeId}`,
      icon: UserRound,
      avatarUrl: employee.avatarUrl,
      avatarName: employee.fullName,
    })
  }

  for (const department of organisation.departments) {
    items.push({
      id: `department:${department.id}`,
      kind: 'department',
      scope: 'organisation',
      label: department.name,
      description: `${department.headcount} ${department.headcount === 1 ? 'person' : 'people'} · ${department.teams.length} ${department.teams.length === 1 ? 'team' : 'teams'}`,
      keywords: uniqueKeywords([
        department.head?.fullName,
        ...department.teams.map((team) => team.name),
      ]),
      path: departmentDetailPath(department.id),
      icon: Building2,
    })
  }

  for (const team of organisation.teams) {
    items.push({
      id: `team:${team.id}`,
      kind: 'team',
      scope: 'organisation',
      label: team.name,
      description: `${team.departmentName} · ${team.headcount} ${team.headcount === 1 ? 'person' : 'people'}`,
      keywords: uniqueKeywords([team.departmentName, team.manager?.fullName]),
      path: teamDetailPath(team.id),
      icon: UsersRound,
    })
  }

  items.push(
    ...personGoalsItems(
      goals.cycle.id,
      goals.cycle.label,
      goals.people,
      goals.byPerson,
    ),
  )
  for (const extra of extraCycleGoals) {
    items.push(
      ...personGoalsItems(
        extra.cycleId,
        extra.cycleLabel,
        extra.people,
        extra.byPerson,
      ),
    )
  }

  for (const cycle of cycles) {
    const status = resolveCycleStatus(cycle)
    items.push({
      id: `cycle:${cycle.id}`,
      kind: 'cycle',
      scope: 'reviews',
      label: cycle.name,
      description: cycleStatusLabel(status),
      keywords: uniqueKeywords([
        cycle.periodKey,
        cycle.yearKey,
        PURPOSE_SHORT_LABEL[cyclePurposeOf(cycle)],
        cycleStatusLabel(status),
      ]),
      path: write ? cycleDetailPath(cycle.id) : '/reviews/scorecards',
      icon: CalendarCog,
      status: cycleStatusLabel(status),
      statusVariant: status === 'current' ? 'in-progress' : 'neutral',
    })
  }

  for (const row of scorecards) {
    items.push({
      id: `scorecard:${row.cycleKey}:${row.employeeId}`,
      kind: 'scorecard',
      scope: 'reviews',
      label: `${row.cycleLabel} review`,
      description: row.employeeName,
      keywords: uniqueKeywords([
        row.employeeName,
        row.cycleLabel,
        row.department,
        row.team,
        SCORECARD_STATUS_LIST_LABEL[row.status],
      ]),
      path: scorecardDetailPath(row.cycleKey, row.employeeId),
      icon: Star,
      status: SCORECARD_STATUS_LIST_LABEL[row.status],
      statusVariant:
        row.status === 'completed'
          ? 'completed'
          : row.status === 'in_progress'
            ? 'in-progress'
            : 'neutral',
    })
  }

  for (const notification of notifications) {
    if (!notification.destination) continue
    if (notification.state === 'superseded') continue
    items.push({
      id: `notification:${notification.id}`,
      kind: 'notification',
      scope: 'all',
      label: notification.title,
      description: notification.body,
      keywords: uniqueKeywords([notification.body, notification.kind]),
      path: notification.destination,
      icon: Bell,
      status: notification.state === 'unread' ? 'Unread' : undefined,
      statusVariant: notification.state === 'unread' ? 'pending' : 'neutral',
    })
  }

  return items
}
