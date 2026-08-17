import type { PlatformEmployee } from '@/lib/employees/types'
import { isDirectReport } from '@/lib/employees/relationships'
import { getGoalsSnapshotForCycle } from '@/lib/goals/store'
import type { Goal } from '@/lib/goals/types'
import { goalCompletion } from '@/lib/goals/weightage'
import { getReviewCycle, listReviewCycles } from './store'
import type { GradeBandId } from './types'
import { GRADE_BAND_META, GRADE_BAND_ORDER } from './labels'

export type ScorecardStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'

export type ScorecardRow = {
  id: string
  cycleKey: string
  cycleLabel: string
  employeeId: number
  employeeName: string
  employeeAvatarUrl: string
  reviewerId: number | null
  reviewerName: string
  reviewerAvatarUrl: string
  gradeHidden: boolean
  grade: GradeBandId | null
  role: string
  seniority: string
  team: string
  department: string
  status: ScorecardStatus
  isMine: boolean
}

export type ScorecardGoalRow = {
  id: string
  description: string
  weight: number
  ownerName: string
  progressPercent: number
  metricLabel: string
  suggestedGrade: GradeBandId
}

export type ScorecardFeedback = {
  authorName: string
  authorRole: string
  dateLabel: string
  strengths: string[]
  developments: string[]
}

export type ScorecardDetail = ScorecardRow & {
  goalsOverallPercent: number
  goalsOverallBand: GradeBandId
  performanceGoals: ScorecardGoalRow[]
  organisationalGoals: ScorecardGoalRow[]
  contributionGrade: GradeBandId
  overallGrade: GradeBandId
  feedback: ScorecardFeedback
}

export const SCORECARD_STATUS_LABEL: Record<ScorecardStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed review',
}

export const SCORECARD_STATUS_LIST_LABEL: Record<ScorecardStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
}

export const OVERALL_GRADE_CRITERIA: Record<GradeBandId, string[]> = {
  unsatisfactory: [
    'Consistently misses commitments or quality bar',
    'Limited ownership; needs heavy direction',
    'Impact is unclear or below role expectations',
  ],
  developing: [
    'Delivers with support; results are uneven',
    'Building capability for the role',
    'Impact is emerging but not yet consistent',
  ],
  performing: [
    'Reliably meets goals and role expectations',
    'Collaborates well and owns outcomes',
    'Solid, dependable impact for the cycle',
  ],
  exceeding: [
    'Surpasses goals with strong quality and pace',
    'Raises the bar for peers through example',
    'Clear, outsized contribution this cycle',
  ],
  exceptional: [
    'Transforms outcomes beyond assigned scope',
    'Sets a new standard for the organisation',
    'Rare, sustained excellence this cycle',
  ],
}

const STATUSES: ScorecardStatus[] = [
  'completed',
  'completed',
  'in_progress',
  'completed',
  'not_started',
  'in_progress',
  'completed',
]

const BANDS: GradeBandId[] = [...GRADE_BAND_ORDER]

function hashPick<T>(seed: number, items: T[]): T {
  return items[Math.abs(seed) % items.length]
}

export function cycleLabelFromKey(cycleKey: string): string {
  const match = /^q([1-4])-(\d{4})$/i.exec(cycleKey)
  if (!match) return cycleKey
  return `Q${match[1]} ${match[2]}`
}

/** Map a scorecard URL key (cycle id or period key) to the canonical review cycle id. */
export function resolveReviewCycleKey(cycleKey: string): string {
  const decoded = decodeURIComponent(cycleKey)
  const direct = getReviewCycle(decoded)
  if (direct) return direct.id
  const byPeriod = listReviewCycles().find(
    (cycle) => cycle.periodKey === decoded,
  )
  return byPeriod?.id ?? decoded
}

function suggestedGrade(progress: number): GradeBandId {
  if (progress >= 120) return 'exceptional'
  if (progress > 100) return 'exceeding'
  if (progress >= 80) return 'performing'
  if (progress >= 60) return 'developing'
  return 'unsatisfactory'
}

function scorecardMetricLabel(goal: Goal): string {
  if (goal.measurements.length === 0) return 'No metric'
  if (goal.measurements.length === 1) return goal.measurements[0].title
  return `${goal.measurements.length} metrics`
}

function toScorecardGoal(
  goal: Goal,
  ownerName: string,
): ScorecardGoalRow {
  const progressPercent = Math.round(goalCompletion(goal) * 10) / 10
  return {
    id: goal.id,
    description: goal.description,
    weight: goal.weight,
    ownerName,
    progressPercent,
    metricLabel: scorecardMetricLabel(goal),
    suggestedGrade: suggestedGrade(progressPercent),
  }
}

function buildPerformanceGoals(
  cycleKey: string,
  employeeId: number,
  ownerName: string,
): ScorecardGoalRow[] {
  const cycleId = resolveReviewCycleKey(cycleKey)
  const snapshot = getGoalsSnapshotForCycle(cycleId)
  const personGoals = snapshot.byPerson[String(employeeId)]
  return (personGoals?.goals ?? []).map((goal) =>
    toScorecardGoal(goal, ownerName),
  )
}

/** Scorecards for one person across all review cycles (includes inactive subjects). */
export function buildEmployeeScorecardHistory(
  employee: PlatformEmployee,
  employees: PlatformEmployee[],
  currentUserEmail?: string | null,
): ScorecardRow[] {
  const hasActiveSubject = employees.some(
    (person) => person.employeeId === employee.employeeId && person.isActive,
  )
  const directory = hasActiveSubject
    ? employees
    : [...employees, { ...employee, isActive: true }]

  return listReviewCycles()
    .slice()
    .sort((left, right) =>
      (right.periodKey ?? '').localeCompare(left.periodKey ?? ''),
    )
    .map((cycle) => {
      const rows = buildScorecardsForCycle(
        cycle.id,
        directory,
        currentUserEmail,
      )
      return rows.find((row) => row.employeeId === employee.employeeId) ?? null
    })
    .filter((row): row is ScorecardRow => row != null)
}

export function buildScorecardsForCycle(
  cycleKey: string,
  employees: PlatformEmployee[],
  currentUserEmail?: string | null,
): ScorecardRow[] {
  const active = employees.filter((person) => person.isActive)
  const byEmail = new Map(
    active.map((person) => [person.email.trim().toLowerCase(), person]),
  )
  const meEmail = currentUserEmail?.trim().toLowerCase() ?? ''
  const cycleLabel = cycleLabelFromKey(cycleKey)

  const me = meEmail ? byEmail.get(meEmail) : undefined

  return active.map((employee, index) => {
    const manager =
      (employee.managerEmail
        ? byEmail.get(employee.managerEmail.trim().toLowerCase())
        : undefined) ??
      (employee.reportsToName
        ? active.find(
            (person) =>
              person.fullName.trim().toLowerCase() ===
              employee.reportsToName.trim().toLowerCase(),
          )
        : undefined)

    const reviewer = manager ?? hashPick(employee.employeeId, active)
    const status = hashPick(employee.employeeId + index, STATUSES)
    const grade =
      status === 'completed'
        ? hashPick(employee.employeeId, BANDS)
        : status === 'not_started'
          ? null
          : 'exceeding'
    const isMine = me ? isDirectReport(employee, me) : false

    return {
      id: `${cycleKey}-${employee.employeeId}`,
      cycleKey,
      cycleLabel,
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      employeeAvatarUrl: employee.avatarUrl,
      reviewerId: reviewer.employeeId,
      reviewerName: reviewer.fullName,
      reviewerAvatarUrl: reviewer.avatarUrl,
      gradeHidden: true,
      grade,
      role: employee.jobTitle || '—',
      seniority: employee.jobGrade || '—',
      team: employee.team || '—',
      department: employee.department || '—',
      status,
      isMine,
    }
  })
}

export function buildScorecardDetail(
  cycleKey: string,
  employeeId: number,
  employees: PlatformEmployee[],
  currentUserEmail?: string | null,
): ScorecardDetail | null {
  const rows = buildScorecardsForCycle(cycleKey, employees, currentUserEmail)
  const row = rows.find((item) => item.employeeId === employeeId)
  if (!row) return null

  const performanceGoals = buildPerformanceGoals(
    cycleKey,
    employeeId,
    row.employeeName,
  )
  const goalsOverallPercent =
    performanceGoals.length === 0
      ? 0
      : Math.round(
          performanceGoals.reduce(
            (total, goal) =>
              total + (goal.progressPercent * goal.weight) / 100,
            0,
          ),
        )
  const overall = row.grade ?? 'exceeding'
  const reviewerFirst = row.reviewerName.split(' ')[0] ?? row.reviewerName

  return {
    ...row,
    gradeHidden: false,
    goalsOverallPercent,
    goalsOverallBand: suggestedGrade(goalsOverallPercent),
    performanceGoals,
    organisationalGoals: [],
    contributionGrade: overall,
    overallGrade: overall,
    feedback: {
      authorName: row.reviewerName,
      authorRole: 'LM',
      dateLabel: '12 Jul 2026',
      strengths: [
        `${reviewerFirst} highlighted consistent delivery above target and clear communication with stakeholders.`,
        'Takes ownership of blockers and unblocks the team without waiting for escalation.',
        'Quality of work and follow-through set a strong example for peers.',
      ],
      developments: [
        'Delegate more deliberately so focus stays on highest-leverage work.',
        'Share progress earlier with adjacent teams to reduce last-mile surprises.',
        'Continue building coaching depth with newer teammates.',
      ],
    },
  }
}

export function scorecardDetailPath(
  cycleKey: string,
  employeeId: number,
): string {
  return `/reviews/scorecards/${encodeURIComponent(cycleKey)}/${employeeId}`
}

export function gradeLabel(id: GradeBandId): string {
  return GRADE_BAND_META[id].label
}
