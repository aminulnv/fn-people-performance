import {
  getCurrentReviewCycleId,
  parseGoalsEmployeeId,
  resolveGoalsCycle,
} from '@/lib/goals/cyclesFromReviews'
import { countPendingGoalApprovalsForManager } from '@/lib/goals/permissions'
import type { DemoPerson, GoalsSnapshot } from '@/lib/goals/types'
import { goalsMyGoalsPath, goalsMyReportsPath } from '@/pages/goals/goalHelpers'
import { dayValue } from '@/lib/reviews/periods'
import { resolveCyclePolicyForPerson } from '@/lib/reviews/cycleGroups'
import { listScorecardForms } from '@/lib/reviews/scorecardFormsStore'
import {
  areReviewCyclesHydrated,
  getReviewCycle,
} from '@/lib/reviews/store'
import type { CycleStagesConfig, ReviewCycle } from '@/lib/reviews/types'
import { reviewsTabPath } from '@/lib/reviews/paths'
import {
  formatGoalDeadlineLabel,
  signedDaysUntil,
} from './goalDeadlineBanner'

export const HOME_RHYTHM_PHASES = [
  { id: 'goals', label: 'Goals' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'calibrate', label: 'Calibrate' },
  { id: 'done', label: 'Done' },
] as const

export type HomeRhythmPhaseId = (typeof HOME_RHYTHM_PHASES)[number]['id']

export type HomeMilestone = {
  label: string
  date: string
  dateLabel: string
  /** Relative copy e.g. "in 15 days" / "today" / "2 days ago" */
  relativeLabel: string
  /** Signed days until the milestone (negative if past). */
  daysRemaining: number
  href: string
}

export type HomeTeamAttention = {
  goalsPending: number
  href: string
}

export type HomePhaseProgress = 'done' | 'active' | 'upcoming'

export type HomePhaseStep = {
  id: HomeRhythmPhaseId
  label: string
  progress: HomePhaseProgress
}

const PHASE_HINTS: Record<HomeRhythmPhaseId, string> = {
  goals: 'Set and align your goals',
  reviews: 'Self and manager reviews',
  calibrate: 'Calibrate team ratings',
  done: 'This cycle is complete',
}

export type HomeOrientation = {
  cycleId: string
  cycleLabel: string
  activePhase: HomeRhythmPhaseId
  activePhaseLabel: string
  activePhaseHint: string
  phases: HomePhaseStep[]
  /** 0–1 progress through the four-step rhythm. */
  rhythmProgress: number
  nextMilestone: HomeMilestone | null
  teamAttention: HomeTeamAttention | null
  /** Soft idle line when the person has no action banners. */
  clearCopy: string
  goalsHref: string
  reviewsHref: string
}

type WindowCandidate = {
  phase: HomeRhythmPhaseId
  label: string
  start: string
  end: string
  href: string
}

function isoToday(today: Date): string {
  return today.toISOString().slice(0, 10)
}

function relativeFromSignedDays(signedDays: number): string {
  if (signedDays === 0) return 'today'
  if (signedDays === 1) return 'tomorrow'
  if (signedDays === -1) return 'yesterday'
  if (signedDays > 0) return `in ${signedDays} days`
  return `${Math.abs(signedDays)} days ago`
}

function collectWindows(
  stages: CycleStagesConfig,
  cycleId: string,
  personId: string,
): WindowCandidate[] {
  const goalsHref = goalsMyGoalsPath(cycleId, personId)
  const reviewsHref = reviewsTabPath('scorecards')
  const windows: WindowCandidate[] = []

  windows.push({
    phase: 'goals',
    label: 'Goal setting',
    start: stages.goals.employee.startDate,
    end: stages.goals.employee.endDate,
    href: goalsHref,
  })

  const stagesList = stages.reviewStages ?? []
  const selfReview = stagesList.find(
    (stage) => stage.id === 'self_review' && stage.enabled,
  )
  const managerReview = stagesList.find(
    (stage) => stage.id === 'manager_review' && stage.enabled,
  )

  if (selfReview?.start?.date && selfReview.end?.date) {
    windows.push({
      phase: 'reviews',
      label: 'Self-review',
      start: selfReview.start.date,
      end: selfReview.end.date,
      href: reviewsHref,
    })
  } else {
    windows.push({
      phase: 'reviews',
      label: 'Performance review',
      start: stages.performance.employeeStart.date,
      end: stages.performance.employeeEnd.date,
      href: reviewsHref,
    })
  }

  if (managerReview?.start?.date && managerReview.end?.date) {
    windows.push({
      phase: 'reviews',
      label: 'Manager review',
      start: managerReview.start.date,
      end: managerReview.end.date,
      href: reviewsHref,
    })
  } else if (stagesList.length === 0) {
    windows.push({
      phase: 'reviews',
      label: 'Manager review',
      start: stages.performance.managerStart.date,
      end: stages.performance.managerEnd.date,
      href: reviewsHref,
    })
  }

  const hod = stagesList.find(
    (stage) => stage.id === 'calibration_hod_hrbp' && stage.enabled,
  )
  const slt = stagesList.find(
    (stage) => stage.id === 'calibration_slt' && stage.enabled,
  )
  if (hod?.start?.date && hod.end?.date) {
    windows.push({
      phase: 'calibrate',
      label: 'HOD / HRBP calibration',
      start: hod.start.date,
      end: hod.end.date,
      href: '/calibration',
    })
  }
  if (slt?.start?.date && slt.end?.date) {
    windows.push({
      phase: 'calibrate',
      label: 'SLT calibration',
      start: slt.start.date,
      end: slt.end.date,
      href: '/calibration',
    })
  }
  if (
    stagesList.length === 0 &&
    stages.calibration.enabled &&
    stages.calibration.start.date &&
    stages.calibration.end.date
  ) {
    windows.push({
      phase: 'calibrate',
      label: 'Calibration',
      start: stages.calibration.start.date,
      end: stages.calibration.end.date,
      href: '/calibration',
    })
  }

  return windows.filter((window) => window.start && window.end)
}

/** Active rhythm phase for the strip — prefer later phases when windows overlap. */
export function resolveHomeRhythmPhase(
  windows: WindowCandidate[],
  todayKey: string,
): HomeRhythmPhaseId {
  const now = dayValue(todayKey)
  const active = windows.filter(
    (window) =>
      now >= dayValue(window.start) && now <= dayValue(window.end),
  )
  if (active.some((window) => window.phase === 'calibrate')) return 'calibrate'
  if (active.some((window) => window.phase === 'reviews')) return 'reviews'
  if (active.some((window) => window.phase === 'goals')) return 'goals'

  const lastEnded = [...windows]
    .filter((window) => now > dayValue(window.end))
    .sort((a, b) => dayValue(b.end) - dayValue(a.end))[0]
  if (!lastEnded) return 'goals'
  if (lastEnded.phase === 'calibrate') return 'done'
  return lastEnded.phase
}

export function resolveNextMilestone(
  windows: WindowCandidate[],
  todayKey: string,
): HomeMilestone | null {
  const now = dayValue(todayKey)
  const upcoming = windows
    .flatMap((window) => {
      const events: { label: string; date: string; href: string }[] = []
      if (dayValue(window.start) >= now) {
        events.push({
          label: `${window.label} opens`,
          date: window.start,
          href: window.href,
        })
      }
      if (dayValue(window.end) >= now) {
        events.push({
          label: `${window.label} ends`,
          date: window.end,
          href: window.href,
        })
      }
      return events
    })
    .sort((a, b) => dayValue(a.date) - dayValue(b.date) || a.label.localeCompare(b.label))

  const next = upcoming[0]
  if (!next) return null

  const signed = signedDaysUntil(todayKey, next.date)
  return {
    label: next.label,
    date: next.date,
    dateLabel: formatGoalDeadlineLabel(next.date),
    relativeLabel: relativeFromSignedDays(signed),
    daysRemaining: signed,
    href: next.href,
  }
}

export function buildPhaseSteps(
  activePhase: HomeRhythmPhaseId,
): HomePhaseStep[] {
  const activeIndex = HOME_RHYTHM_PHASES.findIndex(
    (phase) => phase.id === activePhase,
  )
  return HOME_RHYTHM_PHASES.map((phase, index) => ({
    id: phase.id,
    label: phase.label,
    progress:
      index < activeIndex
        ? 'done'
        : index === activeIndex
          ? 'active'
          : 'upcoming',
  }))
}

function resolveTeamAttention(
  person: DemoPerson,
  snapshot: GoalsSnapshot,
  cycleId: string,
): HomeTeamAttention | null {
  if (!person.reportIds?.length) return null
  const goalsPending = countPendingGoalApprovalsForManager(
    person,
    snapshot.people,
    snapshot.byPerson,
  )
  if (goalsPending <= 0) return null
  return {
    goalsPending,
    href: goalsMyReportsPath(cycleId, person.id),
  }
}

function clearCopyFor(
  activePhase: HomeRhythmPhaseId,
  nextMilestone: HomeMilestone | null,
): string {
  if (nextMilestone) {
    return `You’re clear for now · ${nextMilestone.label} ${nextMilestone.relativeLabel}`
  }
  if (activePhase === 'done') return 'You’re clear · this cycle is complete'
  return 'You’re clear for now'
}

export function resolveHomeOrientation(
  person: DemoPerson,
  today = new Date(),
  snapshot: GoalsSnapshot,
  reviewCycle: ReviewCycle | null = null,
): HomeOrientation | null {
  if (!areReviewCyclesHydrated()) return null

  const cycleId = getCurrentReviewCycleId(today) ?? snapshot.cycle.id
  if (!cycleId) return null

  const cycleStatus =
    snapshot.availableCycles.find((option) => option.id === cycleId)?.status ??
    snapshot.cycleStatus
  if (cycleStatus !== 'current') return null

  const goalsCycle =
    resolveGoalsCycle(
      cycleId,
      snapshot.cycle.phase,
      today,
      parseGoalsEmployeeId(person.id),
    ) ?? snapshot.cycle

  if (goalsCycle.assignedGroupId === null) return null

  const review =
    reviewCycle ??
    getReviewCycle(cycleId) ??
    null
  if (!review) return null

  const policy = resolveCyclePolicyForPerson(
    review,
    parseGoalsEmployeeId(person.id),
    listScorecardForms(),
  )
  const todayKey = isoToday(today)

  const windows = collectWindows(policy.stagesConfig, cycleId, person.id)
  const activePhase = resolveHomeRhythmPhase(windows, todayKey)
  const phases = buildPhaseSteps(activePhase)
  const activeIndex = Math.max(
    0,
    HOME_RHYTHM_PHASES.findIndex((phase) => phase.id === activePhase),
  )
  const nextMilestone = resolveNextMilestone(windows, todayKey)
  const teamAttention = resolveTeamAttention(person, snapshot, cycleId)
  const activeMeta = HOME_RHYTHM_PHASES[activeIndex]

  return {
    cycleId,
    cycleLabel: goalsCycle.label,
    activePhase,
    activePhaseLabel: activeMeta.label,
    activePhaseHint: PHASE_HINTS[activePhase],
    phases,
    rhythmProgress:
      HOME_RHYTHM_PHASES.length <= 1
        ? 1
        : activeIndex / (HOME_RHYTHM_PHASES.length - 1),
    nextMilestone,
    teamAttention,
    clearCopy: clearCopyFor(activePhase, nextMilestone),
    goalsHref: goalsMyGoalsPath(cycleId, person.id),
    reviewsHref: reviewsTabPath('scorecards'),
  }
}
