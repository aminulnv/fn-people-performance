import type { PlatformEmployee } from '@/lib/employees/types'
import { isDirectReport } from '@/lib/employees/relationships'
import { getGoalsSnapshotForCycle } from '@/lib/goals/store'
import type { Goal } from '@/lib/goals/types'
import { goalCompletion } from '@/lib/goals/weightage'
import { cycleMemberIds, findCycleGroupForPerson } from './cycleGroups'
import { getReviewCycle, listReviewCycles } from './store'
import type {
  GradeBandId,
  ReviewActorRole,
  ReviewAppeal,
  ReviewPacket,
  ReviewPacketStatus,
  ReviewQuestion,
  ScorecardPillar,
} from './types'
import { GRADE_BAND_META } from './labels'

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
  strengths: string
  developments: string
}

export type ScorecardDetail = ScorecardRow & {
  goalsOverallPercent: number
  goalsOverallBand: GradeBandId | null
  performanceGoals: ScorecardGoalRow[]
  organisationalGoals: ScorecardGoalRow[]
  contributionGrade: GradeBandId | null
  overallGrade: GradeBandId | null
  feedback: ScorecardFeedback
}

export const SCORECARD_STATUS_LABEL: Record<ScorecardStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed review',
}

export const PACKET_STATUS_LABEL: Record<ReviewPacketStatus, string> = {
  not_started: 'Not started',
  self_in_progress: 'Self-review in progress',
  self_submitted: 'Self-review submitted',
  manager_in_progress: 'Manager review in progress',
  manager_submitted: 'Manager review submitted',
  in_calibration: 'In calibration',
  calibrated: 'Calibrated',
  released_to_managers: 'Released to managers',
  released_to_employees: 'Released to employees',
  appealed: 'Appealed',
}

export const APPEAL_STATUS_LABEL: Record<ReviewAppeal['status'], string> = {
  open: 'Open',
  recorded: 'Recorded',
  resolved: 'Resolved',
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

const RELEASED_STATUSES = new Set<ReviewPacketStatus>([
  'released_to_managers',
  'released_to_employees',
])

const COMPLETED_STATUSES = new Set<ReviewPacketStatus>([
  'calibrated',
  'released_to_managers',
  'released_to_employees',
  'appealed',
])

export function scorecardStatusFromPacket(
  status: ReviewPacketStatus,
): ScorecardStatus {
  if (status === 'not_started') return 'not_started'
  if (COMPLETED_STATUSES.has(status)) return 'completed'
  return 'in_progress'
}

export function gradeFromPacket(packet: Pick<
  ReviewPacket,
  | 'publishedOverallGrade'
  | 'calibratedOverallGrade'
  | 'managerOverallGrade'
  | 'selfOverallGrade'
  | 'status'
>): { grade: GradeBandId | null; gradeHidden: boolean } {
  const released = RELEASED_STATUSES.has(packet.status)
  if (released && packet.publishedOverallGrade) {
    return { grade: packet.publishedOverallGrade, gradeHidden: false }
  }
  const unpublished =
    packet.calibratedOverallGrade ??
    packet.managerOverallGrade ??
    packet.selfOverallGrade ??
    null
  if (!unpublished) return { grade: null, gradeHidden: false }
  return { grade: unpublished, gradeHidden: true }
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

export function gradeFromGoalProgress(
  percent: number,
  goalCount: number,
): GradeBandId | null {
  if (goalCount <= 0) return null
  if (percent < 50) return 'unsatisfactory'
  if (percent < 70) return 'developing'
  if (percent < 90) return 'performing'
  if (percent < 110) return 'exceeding'
  return 'exceptional'
}

/** Assigned Goals pillar grade only — never inferred from completion. */
export function goalsGradeFromPacket(
  packet: ReviewPacket | null | undefined,
): GradeBandId | null {
  if (!packet) return null
  const scores = packet.pillarScores.filter(
    (score) => score.pillarId === 'goals' && score.grade != null,
  )
  return (
    scores.find((score) => score.actorRole === 'manager')?.grade ??
    scores.find((score) => score.actorRole === 'self')?.grade ??
    null
  )
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
    suggestedGrade: gradeFromGoalProgress(progressPercent, 1) ?? 'performing',
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

function resolveScorecardReviewer(
  employee: PlatformEmployee,
  active: PlatformEmployee[],
  byEmail: Map<string, PlatformEmployee>,
  managerEmployeeId?: number | null,
): PlatformEmployee | null {
  if (managerEmployeeId != null) {
    const assigned = active.find((person) => person.employeeId === managerEmployeeId)
    if (assigned) return assigned
  }
  if (employee.reportsToId != null) {
    const byId = active.find((person) => person.employeeId === employee.reportsToId)
    if (byId) return byId
  }
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

  return manager ?? null
}

function toScorecardRow(
  cycleKey: string,
  employee: PlatformEmployee,
  reviewer: PlatformEmployee | null,
  status: ScorecardStatus,
  isMine: boolean,
  grade: GradeBandId | null = null,
  gradeHidden = false,
): ScorecardRow {
  return {
    id: `${cycleKey}-${employee.employeeId}`,
    cycleKey,
    cycleLabel: cycleLabelFromKey(cycleKey),
    employeeId: employee.employeeId,
    employeeName: employee.fullName,
    employeeAvatarUrl: employee.avatarUrl,
    reviewerId: reviewer?.employeeId ?? null,
    reviewerName: reviewer?.fullName ?? '—',
    reviewerAvatarUrl: reviewer?.avatarUrl ?? '',
    gradeHidden,
    grade,
    role: employee.jobTitle || '—',
    seniority: employee.jobGrade || '—',
    team: employee.team || '—',
    department: employee.department || '—',
    status,
    isMine,
  }
}

function scorecardDirectory(
  employees: PlatformEmployee[],
  extra?: PlatformEmployee,
): PlatformEmployee[] {
  const hasExtra =
    extra != null &&
    employees.some(
      (person) => person.employeeId === extra.employeeId && person.isActive,
    )
  const directory =
    extra && !hasExtra ? [...employees, { ...extra, isActive: true }] : employees
  return directory.filter((person) => person.isActive)
}

function scorecardRowForPerson(
  cycleKey: string,
  employee: PlatformEmployee,
  active: PlatformEmployee[],
  byEmail: Map<string, PlatformEmployee>,
  me: PlatformEmployee | undefined,
  packet?: ReviewPacket,
): ScorecardRow {
  const reviewer = resolveScorecardReviewer(
    employee,
    active,
    byEmail,
    packet?.managerEmployeeId,
  )
  const status = packet
    ? scorecardStatusFromPacket(packet.status)
    : 'not_started'
  const { grade, gradeHidden } = packet
    ? gradeFromPacket(packet)
    : { grade: null, gradeHidden: false }
  const isMine = me ? isDirectReport(employee, me) : false
  return toScorecardRow(
    cycleKey,
    employee,
    reviewer,
    status,
    isMine,
    grade,
    gradeHidden,
  )
}

/** Scorecards for one person across cycles they actually belong to. */
export function buildEmployeeScorecardHistory(
  employee: PlatformEmployee,
  employees: PlatformEmployee[],
  currentUserEmail?: string | null,
  packets: ReviewPacket[] = [],
): ScorecardRow[] {
  const active = scorecardDirectory(employees, employee)
  const byEmail = new Map(
    active.map((person) => [person.email.trim().toLowerCase(), person]),
  )
  const meEmail = currentUserEmail?.trim().toLowerCase() ?? ''
  const me = meEmail ? byEmail.get(meEmail) : undefined
  const packetByCycle = new Map(
    packets
      .filter((packet) => packet.employeeId === employee.employeeId)
      .map((packet) => [packet.cycleId, packet]),
  )

  return listReviewCycles()
    .filter(
      (cycle) =>
        findCycleGroupForPerson(cycle, employee.employeeId) != null ||
        packetByCycle.has(cycle.id),
    )
    .slice()
    .sort((left, right) =>
      (right.periodKey ?? '').localeCompare(left.periodKey ?? ''),
    )
    .map((cycle) =>
      scorecardRowForPerson(
        cycle.id,
        employee,
        active,
        byEmail,
        me,
        packetByCycle.get(cycle.id),
      ),
    )
}

export function buildScorecardsForCycle(
  cycleKey: string,
  employees: PlatformEmployee[],
  currentUserEmail?: string | null,
  packets: ReviewPacket[] = [],
): ScorecardRow[] {
  const cycle = getReviewCycle(resolveReviewCycleKey(cycleKey))
  const active = scorecardDirectory(employees)
  const byEmail = new Map(
    active.map((person) => [person.email.trim().toLowerCase(), person]),
  )
  const meEmail = currentUserEmail?.trim().toLowerCase() ?? ''
  const me = meEmail ? byEmail.get(meEmail) : undefined
  const byId = new Map(active.map((person) => [person.employeeId, person]))
  const packetByEmployee = new Map(
    packets.map((packet) => [packet.employeeId, packet]),
  )
  const roster = new Set([
    ...(cycle ? cycleMemberIds(cycle) : []),
    ...packets.map((packet) => packet.employeeId),
  ])

  return [...roster]
    .map((employeeId) => byId.get(employeeId))
    .filter((employee): employee is PlatformEmployee => employee != null)
    .sort((left, right) =>
      left.fullName.localeCompare(right.fullName, undefined, {
        sensitivity: 'base',
      }),
    )
    .map((employee) =>
      scorecardRowForPerson(
        cycle?.id ?? cycleKey,
        employee,
        active,
        byEmail,
        me,
        packetByEmployee.get(employee.employeeId),
      ),
    )
}

const STRENGTH_QUESTION_IDS = new Set([
  'delivered',
  'values',
  'quarter-comment',
])
const DEVELOPMENT_QUESTION_IDS = new Set(['improve', 'support'])

export const SCORECARD_STRENGTHS_ANSWER_ID = 'strengths'
export const SCORECARD_DEVELOPMENTS_ANSWER_ID = 'developments'

const PACKED_FEEDBACK_IDS = new Set([
  SCORECARD_STRENGTHS_ANSWER_ID,
  SCORECARD_DEVELOPMENTS_ANSWER_ID,
])

export function isScorecardFeedbackQuestion(questionId: string): boolean {
  return (
    STRENGTH_QUESTION_IDS.has(questionId) ||
    DEVELOPMENT_QUESTION_IDS.has(questionId) ||
    PACKED_FEEDBACK_IDS.has(questionId)
  )
}

function joinFeedbackParts(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join('\n\n')
}

export function feedbackTextForRole(
  answers: ReviewPacket['answers'],
  actorRole: ReviewActorRole,
): Pick<ScorecardFeedback, 'strengths' | 'developments'> {
  const usable = answers.filter(
    (answer) => answer.actorRole === actorRole && answer.body.trim(),
  )
  const packedStrengths = usable.find(
    (answer) => answer.questionId === SCORECARD_STRENGTHS_ANSWER_ID,
  )
  const packedDevelopments = usable.find(
    (answer) => answer.questionId === SCORECARD_DEVELOPMENTS_ANSWER_ID,
  )
  const strengths = joinFeedbackParts([
    ...usable
      .filter((answer) => STRENGTH_QUESTION_IDS.has(answer.questionId))
      .map((answer) => answer.body),
    packedStrengths?.body ?? '',
  ])
  const developments = joinFeedbackParts([
    ...usable
      .filter((answer) => DEVELOPMENT_QUESTION_IDS.has(answer.questionId))
      .map((answer) => answer.body),
    packedDevelopments?.body ?? '',
  ])
  const leftover = joinFeedbackParts(
    usable
      .filter((answer) => !isScorecardFeedbackQuestion(answer.questionId))
      .map((answer) => answer.body),
  )

  return {
    strengths: strengths || leftover,
    developments,
  }
}

export function answersFromFeedbackText(
  questions: Array<{ id: string }>,
  strengths: string,
  developments: string,
): Array<{ questionId: string; body: string }> {
  const ids = questions.map((question) => question.id)
  return [
    ...ids
      .filter((id) => STRENGTH_QUESTION_IDS.has(id))
      .map((id) => ({ questionId: id, body: '' })),
    ...ids
      .filter((id) => DEVELOPMENT_QUESTION_IDS.has(id))
      .map((id) => ({ questionId: id, body: '' })),
    { questionId: SCORECARD_STRENGTHS_ANSWER_ID, body: strengths.trim() },
    { questionId: SCORECARD_DEVELOPMENTS_ANSWER_ID, body: developments.trim() },
  ]
}

function formatPacketDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function feedbackFromPacket(
  packet: ReviewPacket | null | undefined,
  reviewerName: string,
): ScorecardFeedback {
  const answers = packet?.answers ?? []
  const preferredRole =
    answers.some((answer) => answer.actorRole === 'manager' && answer.body.trim())
      ? 'manager'
      : 'self'
  const text = feedbackTextForRole(answers, preferredRole)

  return {
    authorName: reviewerName,
    authorRole: 'LM',
    dateLabel: formatPacketDate(
      packet?.releasedToEmployeeAt ??
        packet?.releasedToManagerAt ??
        packet?.updatedAt,
    ),
    strengths: text.strengths,
    developments: text.developments,
  }
}

export function buildScorecardDetail(
  cycleKey: string,
  employeeId: number,
  employees: PlatformEmployee[],
  currentUserEmail?: string | null,
  packet?: ReviewPacket | null,
): ScorecardDetail | null {
  const rows = buildScorecardsForCycle(
    cycleKey,
    employees,
    currentUserEmail,
    packet ? [packet] : [],
  )
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
  const goalsOverallBand = goalsGradeFromPacket(packet)
  const overall = row.grade

  return {
    ...row,
    gradeHidden: false,
    goalsOverallPercent,
    goalsOverallBand,
    performanceGoals,
    organisationalGoals: [],
    contributionGrade: overall,
    overallGrade: overall,
    feedback: feedbackFromPacket(packet, row.reviewerName),
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

export function packetStageLabel(status: ReviewPacketStatus): string {
  return PACKET_STATUS_LABEL[status]
}

export function formatReviewDate(value?: string): string {
  return formatPacketDate(value)
}

export function latestScorecardGrade(packet: ReviewPacket | null | undefined): {
  grade: GradeBandId | null
  source: 'published' | 'calibrated' | 'manager' | 'self' | null
} {
  if (!packet) return { grade: null, source: null }
  if (packet.publishedOverallGrade) {
    return { grade: packet.publishedOverallGrade, source: 'published' }
  }
  if (packet.calibratedOverallGrade) {
    return { grade: packet.calibratedOverallGrade, source: 'calibrated' }
  }
  if (packet.managerOverallGrade) {
    return { grade: packet.managerOverallGrade, source: 'manager' }
  }
  if (packet.selfOverallGrade) {
    return { grade: packet.selfOverallGrade, source: 'self' }
  }
  return { grade: null, source: null }
}

export type PacketQuestionField = {
  questionId: string
  prompt: string
  body: string
}

export type PacketPillarField = {
  pillarId: string
  label: string
  weight: number
  grade: GradeBandId | null
  comment: string
}

export function packetFieldsForRole(
  packet: ReviewPacket,
  actorRole: ReviewActorRole,
  questions: ReviewQuestion[],
  pillars: ScorecardPillar[],
): {
  answers: PacketQuestionField[]
  pillars: PacketPillarField[]
  overallGrade: GradeBandId | null
} {
  return {
    answers: questions
      .filter((question) => !isScorecardFeedbackQuestion(question.id))
      .map((question) => ({
        questionId: question.id,
        prompt: question.prompt,
        body:
          packet.answers.find(
            (answer) =>
              answer.actorRole === actorRole &&
              answer.questionId === question.id,
          )?.body.trim() ?? '',
      })),
    pillars: pillars.map((pillar) => {
      const score = packet.pillarScores.find(
        (item) => item.actorRole === actorRole && item.pillarId === pillar.id,
      )
      return {
        pillarId: pillar.id,
        label: pillar.label,
        weight: pillar.weight,
        grade: score?.grade ?? null,
        comment: score?.comment.trim() ?? '',
      }
    }),
    overallGrade:
      actorRole === 'self' ? packet.selfOverallGrade : packet.managerOverallGrade,
  }
}

export function packetHasRoleContent(
  packet: ReviewPacket,
  actorRole: ReviewActorRole,
): boolean {
  const overall =
    actorRole === 'self' ? packet.selfOverallGrade : packet.managerOverallGrade
  return (
    overall != null ||
    packet.answers.some(
      (answer) => answer.actorRole === actorRole && answer.body.trim(),
    ) ||
    packet.pillarScores.some(
      (score) => score.actorRole === actorRole && score.grade != null,
    )
  )
}
