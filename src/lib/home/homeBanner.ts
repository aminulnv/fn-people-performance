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
import { areReviewCyclesHydrated, getReviewCycle } from '@/lib/reviews/store'
import { goalsMyGoalsPath, goalsMyReportsPath } from '@/pages/goals/goalHelpers'
import {
  buildGoalDeadlineHeadline,
  buildGoalSubmitHeadline,
  cycleQuarterLabel,
  deadlineAriaSuffix,
  deadlineCountdownCopy,
  deadlineSublineEmphasis,
  deadlineSublinePrefix,
  formatDeadlineTimerUnits,
  formatGoalDeadlineLabel,
  remainingTimeUntilDeadline,
  resolveGoalDeadlineTiming,
  resolveGoalDeadlineUrgency,
  signedDaysUntil,
  type GoalDeadlineTimerUnit,
  type GoalDeadlineTiming,
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
  | {
      kind: 'countdown'
      primary: string
      secondary: string
      units?: GoalDeadlineTimerUnit[]
    }
  | { kind: 'action'; primary: string; secondary: string }
  | { kind: 'status'; primary: string; secondary: string }

export type HomeBannerArtwork = 'calendar' | 'approve' | 'return' | 'logbook' | 'none'

export type HomeBannerContent = {
  id: string
  variant: HomeBannerVariant
  cycleId: string
  personId: string
  headline: string
  subline: string
  sublineEmphasis?: string
  /** Optional person chip rendered in the subline (e.g. who sent goals back). */
  sublineActor?: {
    name: string
    avatarUrl?: string
  }
  href: string
  aside: HomeBannerAside
  icon: HomeBannerIcon
  /** Large right-side visual for the hero countdown layout. */
  artwork?: HomeBannerArtwork
  ariaLabel: string
  /** Goal-setting countdown urgency - drives yellow/red gradients. */
  urgency?: GoalDeadlineUrgency
  /** Calendar state of the deadline - due later, due today, or already past. */
  timing?: GoalDeadlineTiming
  /** YYYY-MM-DD deadline used for live Days/Hours/Mins units. */
  deadline?: string
}

export const HOME_BANNER_GRADIENTS: Record<
  HomeBannerVariant,
  { start: string; end: string; accent: string }
> = {
  set_goals: { start: '#050505', end: '#2E30C1', accent: '#4E54D4' },
  modify_goals: { start: '#3C1D14', end: '#FF875C', accent: '#FF875C' },
  update_progress: { start: '#010706', end: '#126B43', accent: '#126B43' },
  approve_team_goals: { start: '#050505', end: '#2E30C1', accent: '#4E54D4' },
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function deadlineAside(
  signedDays: number,
  deadline: string,
  now: Date,
): HomeBannerAside {
  const copy = deadlineCountdownCopy(signedDays)
  const timing = resolveGoalDeadlineTiming(signedDays)
  if (timing === 'overdue') {
    return { kind: 'status', ...copy }
  }
  if (timing === 'upcoming') {
    return {
      kind: 'countdown',
      ...copy,
      units: formatDeadlineTimerUnits(
        remainingTimeUntilDeadline(deadline, now),
      ),
    }
  }
  return { kind: 'countdown', ...copy }
}

function deadlineBannerCopy(
  headline: string,
  context: DeadlineContext,
  now: Date,
  options?: { artwork?: HomeBannerArtwork },
): Pick<
  HomeBannerContent,
  | 'headline'
  | 'subline'
  | 'sublineEmphasis'
  | 'aside'
  | 'urgency'
  | 'timing'
  | 'ariaLabel'
  | 'artwork'
  | 'deadline'
> {
  return {
    headline,
    subline: deadlineSublinePrefix(context.timing),
    sublineEmphasis: deadlineSublineEmphasis(
      context.timing,
      context.deadlineLabel,
    ),
    aside: deadlineAside(context.daysRemaining, context.deadline, now),
    urgency: context.urgency,
    timing: context.timing,
    ariaLabel: `${headline}. ${deadlineAriaSuffix(context.daysRemaining, context.deadlineLabel)}`,
    deadline: context.deadline,
    ...(options?.artwork ? { artwork: options.artwork } : {}),
  }
}

function goalsHref(cycleId: string, personId: string): string {
  return goalsMyGoalsPath(cycleId, personId)
}

function isActiveCycle(cycleStatus: GoalsCycleStatus): boolean {
  return cycleStatus === 'current'
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

/** Only a submitted or approved batch counts - drafts never satisfy this. */
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

type DeadlineContext = {
  deadline: string
  deadlineLabel: string
  daysRemaining: number
  timing: GoalDeadlineTiming
  urgency: GoalDeadlineUrgency
}

function toDeadlineContext(deadline: string, todayKey: string): DeadlineContext {
  const daysRemaining = signedDaysUntil(todayKey, deadline)
  return {
    deadline,
    deadlineLabel: formatGoalDeadlineLabel(deadline),
    daysRemaining,
    timing: resolveGoalDeadlineTiming(daysRemaining),
    urgency: resolveGoalDeadlineUrgency(daysRemaining),
  }
}

function resolveDeadlineContext(
  cycle: GoalsCycle,
  person: DemoPerson,
  todayKey: string,
): DeadlineContext | null {
  const deadline = resolveGoalDeadline(cycle, person)
  if (!deadline) return null
  return toDeadlineContext(deadline, todayKey)
}

function resolveProgressDeadline(
  cycleId: string,
  todayKey: string,
): DeadlineContext | null {
  const review = getReviewCycle(cycleId)
  const deadline = review?.stagesConfig.performance.employeeEnd.date
  if (!deadline) return null
  return toDeadlineContext(deadline, todayKey)
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

  if (!areReviewCyclesHydrated()) return []
  if (cycle.assignedGroupId === null) return []
  if (!isActiveCycle(cycleStatus) || cycle.phase === 'closed') return []

  const row = snapshot.byPerson[person.id]
  if (!row || person.joinDate > cycle.day1) return []

  const todayKey = dateKey(today)
  const href = goalsHref(cycle.id, person.id)
  const banners: HomeBannerContent[] = []
  const heroArtwork = { artwork: 'calendar' as const }

  if (row.status === 'sent_back') {
    const sender = row.sendBackBy?.name ?? 'Your manager'
    const senderId = row.sendBackBy?.id
    const senderAvatar =
      row.sendBackBy?.avatarUrl?.trim() ||
      snapshot.people.find((person) => person.id === senderId)?.avatarUrl
    banners.push({
      id: `${cycle.id}:modify_goals`,
      variant: 'modify_goals',
      cycleId: cycle.id,
      personId: person.id,
      headline: 'Your Goals Were Sent Back',
      subline: `${sender} sent your goals back.`,
      sublineActor: {
        name: sender,
        avatarUrl: senderAvatar,
      },
      href,
      icon: 'none',
      artwork: 'return',
      aside: {
        kind: 'action',
        primary: 'Modify Now',
        secondary: '',
      },
      ariaLabel: `Your goals were sent back. ${sender} sent your goals back.`,
    })

    const deadlineContext = resolveDeadlineContext(cycle, person, todayKey)
    if (deadlineContext && isGoalInputPhase(cycle)) {
      banners.push({
        id: `${cycle.id}:submit_goals`,
        variant: 'set_goals',
        cycleId: cycle.id,
        personId: person.id,
        href,
        icon: 'none',
        ...deadlineBannerCopy(
          buildGoalSubmitHeadline(cycle.label),
          deadlineContext,
          today,
          heroArtwork,
        ),
      })
    }
  }

  if (shouldPromptOwnGoalSetting(cycle, row)) {
    const deadlineContext = resolveDeadlineContext(cycle, person, todayKey)
    if (deadlineContext && isGoalInputPhase(cycle)) {
      banners.push({
        id: `${cycle.id}:set_goals`,
        variant: 'set_goals',
        cycleId: cycle.id,
        personId: person.id,
        href,
        icon: 'none',
        ...deadlineBannerCopy(
          buildGoalDeadlineHeadline(cycle.label),
          deadlineContext,
          today,
          heroArtwork,
        ),
      })
    }
  }

  const pendingApprovals = countPendingGoalApprovalsForManager(
    person,
    snapshot.people,
    snapshot.byPerson,
  )
  if (pendingApprovals > 0) {
    const deadlineContext = resolveDeadlineContext(cycle, person, todayKey)
    if (deadlineContext) {
      const headline = buildApproveHeadline(cycle.label)
      const copy = deadlineBannerCopy(
        headline,
        deadlineContext,
        today,
        { artwork: 'approve' },
      )
      banners.push({
        id: `${cycle.id}:approve_team_goals`,
        variant: 'approve_team_goals',
        cycleId: cycle.id,
        personId: person.id,
        href: goalsMyReportsPath(cycle.id, person.id),
        icon: 'none',
        ...copy,
      })
    }
  }

  if (cycle.phase === 'check_in' && row.status === 'approved') {
    const deadlineContext = resolveProgressDeadline(cycle.id, todayKey)
    if (deadlineContext) {
      const upcoming = deadlineContext.timing === 'upcoming'
      banners.push({
        id: `${cycle.id}:update_progress`,
        variant: 'update_progress',
        cycleId: cycle.id,
        personId: person.id,
        href,
        icon: 'none',
        artwork: 'logbook',
        ...(upcoming
          ? {
              headline: 'Update Goal Progress',
              subline: 'Due by ',
              sublineEmphasis: deadlineContext.deadlineLabel,
              aside: {
                kind: 'action' as const,
                primary: 'Update Now',
                secondary: '',
              },
              ariaLabel: `Update goal progress, due by ${deadlineContext.deadlineLabel}.`,
            }
          : deadlineBannerCopy(
              'Update Goal Progress',
              deadlineContext,
              today,
              { artwork: 'logbook' },
            )),
      })
    }
  }

  return banners
}
