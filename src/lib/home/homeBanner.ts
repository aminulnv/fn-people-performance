import { resolveGoalDeadline } from '@/lib/goals/goalExtensions'
import { countPendingGoalApprovalsForManager } from '@/lib/goals/permissions'
import { getGoalsSnapshot } from '@/lib/goals/store'
import type {
  DemoPerson,
  GoalsCycle,
  GoalsCycleStatus,
  GoalsSnapshot,
  PersonGoals,
} from '@/lib/goals/types'
import {
  getCurrentReviewCycleId,
  parseGoalsEmployeeId,
  resolveGoalsCycle,
} from '@/lib/goals/cyclesFromReviews'
import { getReviewCycle } from '@/lib/reviews/store'
import { goalsMyGoalsPath, goalsMyReportsPath } from '@/pages/goals/goalHelpers'
import {
  buildGoalDeadlineHeadline,
  cycleQuarterLabel,
  formatDaysRemainingLabel,
  formatGoalDeadlineLabel,
  resolveGoalDeadlineUrgency,
  type GoalDeadlineUrgency,
} from './goalDeadlineBanner'

export type HomeBannerVariant =
  | 'set_goals'
  | 'modify_goals'
  | 'approve_team_goals'
  | 'update_progress'

export type HomeBannerIcon =
  | 'goals'
  | 'progress'
  | 'approve'
  | 'sent_back'
  | 'none'

export type HomeBannerAside =
  | { kind: 'countdown'; primary: string; secondary: string }
  | { kind: 'action'; primary: string; secondary: string }

export type HomeBannerContent = {
  id: string
  variant: HomeBannerVariant
  cycleId: string
  personId: string
  headline: string
  subline: string
  sublineEmphasis?: string
  href: string
  aside: HomeBannerAside
  icon: HomeBannerIcon
  ariaLabel: string
  /** Goal-setting countdown urgency — drives yellow/red gradients. */
  urgency?: GoalDeadlineUrgency
}

export const HOME_BANNER_GRADIENTS: Record<
  HomeBannerVariant,
  { start: string; end: string; accent: string }
> = {
  set_goals: { start: '#14163C', end: '#635CFF', accent: '#635CFF' },
  modify_goals: { start: '#3C1D14', end: '#FF875C', accent: '#FF875C' },
  update_progress: { start: '#010706', end: '#126B43', accent: '#126B43' },
  approve_team_goals: { start: '#2F2508', end: '#E4A60A', accent: '#E4A60A' },
}

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`)
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return Math.max(
    0,
    Math.ceil(
      (parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000,
    ),
  )
}

function goalsHref(cycleId: string, personId: string): string {
  return goalsMyGoalsPath(cycleId, personId)
}

function isActiveCycle(cycleStatus: GoalsCycleStatus): boolean {
  return cycleStatus === 'current' || cycleStatus === 'manual'
}

function isGoalInputPhase(cycle: GoalsCycle): boolean {
  if (cycle.phase === 'window_open') return true
  if (
    cycle.phase === 'hard_lock' &&
    cycle.postWindowGoalPolicy === 'two_tier_approval'
  ) {
    return true
  }
  return false
}

/** Only a submitted or approved batch counts — drafts never satisfy this. */
export function hasCommittedGoalSubmission(row: PersonGoals): boolean {
  if (row.status !== 'submitted' && row.status !== 'approved') return false
  // Stale rows can carry submitted/approved status with no goals attached.
  return row.goals.length > 0
}

export function needsOwnGoalSubmission(row: PersonGoals): boolean {
  if (row.status === 'sent_back') return false
  return !hasCommittedGoalSubmission(row)
}

function shouldPromptOwnGoalSetting(
  cycle: GoalsCycle,
  row: PersonGoals,
): boolean {
  if (!needsOwnGoalSubmission(row)) return false
  if (isGoalInputPhase(cycle)) return true
  // After hard lock, incomplete rows still need a personal nudge on Home.
  return (
    (row.status === 'incomplete' || row.status === 'not_eligible') &&
    cycle.phase !== 'closed'
  )
}

function buildApproveHeadline(cycleLabel: string): string {
  return `Approve your team's ${cycleQuarterLabel(cycleLabel)} Goals`
}

function buildCountdownAside(daysRemaining: number): HomeBannerAside {
  return {
    kind: 'countdown',
    primary: formatDaysRemainingLabel(daysRemaining),
    secondary: 'Remaining',
  }
}

function resolveDeadlineContext(
  cycle: GoalsCycle,
  person: DemoPerson,
  todayKey: string,
) {
  const deadline = resolveGoalDeadline(cycle, person)
  if (!deadline) return null
  return {
    deadline,
    deadlineLabel: formatGoalDeadlineLabel(deadline),
    daysRemaining: daysBetween(todayKey, deadline),
  }
}

function resolveProgressDeadline(
  cycleId: string,
  todayKey: string,
): { deadline: string; deadlineLabel: string; daysRemaining: number } | null {
  const review = getReviewCycle(cycleId)
  const deadline = review?.stagesConfig.performance.employeeEnd.date
  if (!deadline) return null
  return {
    deadline,
    deadlineLabel: formatGoalDeadlineLabel(deadline),
    daysRemaining: daysBetween(todayKey, deadline),
  }
}

/** All Home banners that apply to the signed-in person (stacked on Home). */
export function resolveHomeBanners(
  person: DemoPerson,
  today = new Date(),
  snapshot: GoalsSnapshot = getGoalsSnapshot(),
): HomeBannerContent[] {
  const cycleId = getCurrentReviewCycleId(today) ?? snapshot.cycle.id
  const cycle =
    resolveGoalsCycle(
      cycleId,
      snapshot.cycle.phase,
      today,
      parseGoalsEmployeeId(person.id),
    ) ?? snapshot.cycle
  const cycleStatus =
    snapshot.availableCycles.find((option) => option.id === cycleId)?.status ??
    snapshot.cycleStatus

  if (cycle.assignedGroupId === null) return []
  if (!isActiveCycle(cycleStatus) || cycle.phase === 'closed') return []

  const row = snapshot.byPerson[person.id]
  if (!row || person.joinDate > cycle.day1) return []

  const todayKey = dateKey(today)
  const href = goalsHref(cycle.id, person.id)
  const banners: HomeBannerContent[] = []

  if (row.status === 'sent_back') {
    const sender = row.sendBackBy?.name ?? 'Your manager'
    banners.push({
      id: `${cycle.id}:modify_goals`,
      variant: 'modify_goals',
      cycleId: cycle.id,
      personId: person.id,
      headline: 'Your Goals Were Sent Back',
      subline: `${sender} sent your goals back.`,
      href,
      icon: 'sent_back',
      aside: {
        kind: 'action',
        primary: 'Modify Goals',
        secondary: 'For Approval',
      },
      ariaLabel: `Your goals were sent back. ${sender} sent your goals back.`,
    })
  }

  if (shouldPromptOwnGoalSetting(cycle, row)) {
    const deadlineContext = resolveDeadlineContext(cycle, person, todayKey)
    if (deadlineContext) {
      const headline = buildGoalDeadlineHeadline(cycle.label)
      banners.push({
        id: `${cycle.id}:set_goals`,
        variant: 'set_goals',
        cycleId: cycle.id,
        personId: person.id,
        headline,
        subline: 'Due by ',
        sublineEmphasis: deadlineContext.deadlineLabel,
        href,
        icon: 'goals',
        aside: buildCountdownAside(deadlineContext.daysRemaining),
        urgency: resolveGoalDeadlineUrgency(deadlineContext.daysRemaining),
        ariaLabel: `${headline}. ${formatDaysRemainingLabel(deadlineContext.daysRemaining)} remaining, due by ${deadlineContext.deadlineLabel}.`,
      })
    }
  }

  if (isGoalInputPhase(cycle)) {
    const pendingApprovals = countPendingGoalApprovalsForManager(
      person,
      snapshot.people,
      snapshot.byPerson,
    )

    if (pendingApprovals > 0) {
      const deadlineContext = resolveDeadlineContext(cycle, person, todayKey)
      if (deadlineContext) {
        const headline = buildApproveHeadline(cycle.label)
        banners.push({
          id: `${cycle.id}:approve_team_goals`,
          variant: 'approve_team_goals',
          cycleId: cycle.id,
          personId: person.id,
          headline,
          subline: 'Due by ',
          sublineEmphasis: deadlineContext.deadlineLabel,
          href: goalsMyReportsPath(cycle.id, person.id),
          icon: 'approve',
          aside: buildCountdownAside(deadlineContext.daysRemaining),
          urgency: resolveGoalDeadlineUrgency(deadlineContext.daysRemaining),
          ariaLabel: `${headline}. ${formatDaysRemainingLabel(deadlineContext.daysRemaining)} remaining, due by ${deadlineContext.deadlineLabel}.`,
        })
      }
    }
  }

  if (cycle.phase === 'check_in' && row.status === 'approved') {
    const deadlineContext = resolveProgressDeadline(cycle.id, todayKey)
    if (deadlineContext) {
      banners.push({
        id: `${cycle.id}:update_progress`,
        variant: 'update_progress',
        cycleId: cycle.id,
        personId: person.id,
        headline: 'Update Goal Progress',
        subline: 'Due by ',
        sublineEmphasis: deadlineContext.deadlineLabel,
        href,
        icon: 'progress',
        aside: {
          kind: 'action',
          primary: 'Update',
          secondary: 'Progress',
        },
        ariaLabel: `Update goal progress, due by ${deadlineContext.deadlineLabel}.`,
      })
    }
  }

  return banners
}
