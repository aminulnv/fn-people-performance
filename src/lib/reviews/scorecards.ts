import type { PlatformEmployee } from '@/lib/employees/types'
import type { GradeBandId } from './types'
import { GRADE_BAND_META, GRADE_BAND_ORDER } from './labels'

export type ScorecardStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'calibrating'

export type ScorecardRow = {
  id: string
  cycleKey: string
  cycleLabel: string
  employeeId: number
  employeeName: string
  employeeAvatarUrl: string
  reviewType: 'LM review' | 'Self review' | 'Peer review'
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
  calibrating: 'Calibrating',
}

export const SCORECARD_STATUS_LIST_LABEL: Record<ScorecardStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  calibrating: 'Calibrating',
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
  'calibrating',
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

function buildGoals(
  seed: number,
  ownerName: string,
): { performance: ScorecardGoalRow[]; organisational: ScorecardGoalRow[] } {
  const performance: ScorecardGoalRow[] = [
    {
      id: `g-${seed}-1`,
      description: 'Improve delivery quality and close critical defects faster',
      weight: 40,
      ownerName,
      progressPercent: 112.5,
      metricLabel: 'Defects closed',
      suggestedGrade: 'exceeding',
    },
    {
      id: `g-${seed}-2`,
      description: 'Ship roadmap commitments for the quarter on schedule',
      weight: 35,
      ownerName,
      progressPercent: 100,
      metricLabel: 'Milestones',
      suggestedGrade: 'performing',
    },
    {
      id: `g-${seed}-3`,
      description: 'Strengthen cross-team collaboration and stakeholder updates',
      weight: 25,
      ownerName,
      progressPercent: 130,
      metricLabel: 'NPS / feedback',
      suggestedGrade: 'exceeding',
    },
  ]

  const organisational: ScorecardGoalRow[] = [
    {
      id: `g-${seed}-o1`,
      description: 'Contribute to company-wide process improvements',
      weight: 50,
      ownerName,
      progressPercent: 95,
      metricLabel: 'Initiatives',
      suggestedGrade: 'performing',
    },
    {
      id: `g-${seed}-o2`,
      description: 'Support hiring and onboarding for the team',
      weight: 50,
      ownerName,
      progressPercent: 110,
      metricLabel: 'Hires supported',
      suggestedGrade: 'exceeding',
    },
  ]

  return { performance, organisational }
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
      status === 'completed' || status === 'calibrating'
        ? hashPick(employee.employeeId, BANDS)
        : status === 'not_started'
          ? null
          : 'exceeding'
    const isMine =
      Boolean(meEmail) &&
      (employee.email.trim().toLowerCase() === meEmail ||
        reviewer.email.trim().toLowerCase() === meEmail)

    return {
      id: `${cycleKey}-${employee.employeeId}`,
      cycleKey,
      cycleLabel,
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      employeeAvatarUrl: employee.avatarUrl,
      reviewType: 'LM review',
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

  const goals = buildGoals(employeeId, row.employeeName)
  const overall = row.grade ?? 'exceeding'
  const reviewerFirst = row.reviewerName.split(' ')[0] ?? row.reviewerName

  return {
    ...row,
    gradeHidden: false,
    goalsOverallPercent: 116,
    goalsOverallBand: 'exceeding',
    performanceGoals: goals.performance,
    organisationalGoals: goals.organisational,
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
