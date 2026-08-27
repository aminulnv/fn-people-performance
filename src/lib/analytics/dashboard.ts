import { isEffectiveDirectReport } from '@/lib/delegations/roles'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { PersonGoals } from '@/lib/goals/types'
import { cycleMemberIds, findCycleGroupForPerson } from '@/lib/reviews/cycleGroups'
import { GRADE_BAND_META, GRADE_BAND_ORDER } from '@/lib/reviews/labels'
import { PACKET_STATUS_LABEL } from '@/lib/reviews/scorecards'
import {
  isGoalsModuleEnabled,
  isReviewsModuleEnabled,
} from '@/lib/reviews/reviewStages'
import type {
  GradeBandId,
  ReviewCycle,
  ReviewPacket,
  ReviewPacketStatus,
} from '@/lib/reviews/types'

export type AnalyticsScope = 'all' | 'reports' | 'department' | 'mine'

export type AnalyticsAttentionId =
  | 'reviews_not_started'
  | 'self_reviews_open'
  | 'manager_reviews_open'
  | 'ready_to_release'
  | 'held_with_managers'
  | 'open_appeals'
  | 'goals_missing'

export type AnalyticsAttentionItem = {
  id: AnalyticsAttentionId
  title: string
  count: number
  why: string
  href: string
}

export type AnalyticsPipelineStep = {
  id: ReviewPacketStatus
  label: string
  count: number
}

export type AnalyticsGradeMixRow = {
  id: GradeBandId
  label: string
  count: number
  percent: number
  guidelinePercent: number
  deltaPoints: number
}

export type AnalyticsDepartmentRow = {
  name: string
  people: number
  notStarted: number
  inProgress: number
  waiting: number
  released: number
  graded: number
  unfinishedPercent: number
}

export type AnalyticsManagerRow = {
  employeeId: number
  name: string
  teamSize: number
  notStarted: number
  inProgress: number
  unfinished: number
}

export type AnalyticsGoalCoverage = {
  members: number
  withGoals: number
  missing: number
  draft: number
  sentBack: number
  submitted: number
  approved: number
}

export type AnalyticsReviewTotals = {
  members: number
  notStarted: number
  inProgress: number
  waiting: number
  released: number
  graded: number
}

export type AnalyticsDashboard = {
  cycleId: string
  cycleName: string
  memberCount: number
  goalsEnabled: boolean
  reviewsEnabled: boolean
  goals: AnalyticsGoalCoverage | null
  reviews: AnalyticsReviewTotals | null
  attention: AnalyticsAttentionItem[]
  pipeline: AnalyticsPipelineStep[]
  gradeMix: AnalyticsGradeMixRow[]
  departments: AnalyticsDepartmentRow[]
  managers: AnalyticsManagerRow[]
}

const PIPELINE_ORDER: ReviewPacketStatus[] = [
  'not_started',
  'self_in_progress',
  'self_submitted',
  'manager_in_progress',
  'manager_submitted',
  'in_calibration',
  'calibrated',
  'released_to_managers',
  'released_to_employees',
  'appealed',
]

export function officialGrade(
  packet: Pick<
    ReviewPacket,
    | 'publishedOverallGrade'
    | 'calibratedOverallGrade'
    | 'managerOverallGrade'
    | 'selfOverallGrade'
  > | null | undefined,
): GradeBandId | null {
  if (!packet) return null
  return (
    packet.publishedOverallGrade ??
    packet.calibratedOverallGrade ??
    packet.managerOverallGrade ??
    packet.selfOverallGrade ??
    null
  )
}

export type ReviewWorkBucket = 'notStarted' | 'inProgress' | 'waiting' | 'released'

export function reviewWorkBucket(status: ReviewPacketStatus): ReviewWorkBucket {
  switch (status) {
    case 'not_started':
      return 'notStarted'
    case 'self_in_progress':
    case 'manager_in_progress':
      return 'inProgress'
    case 'self_submitted':
    case 'manager_submitted':
    case 'in_calibration':
    case 'calibrated':
      return 'waiting'
    case 'released_to_managers':
    case 'released_to_employees':
    case 'appealed':
      return 'released'
  }
}

export function defaultAnalyticsScope(input: {
  canReadAll: boolean
  hasDirectReports: boolean
  hasDepartment: boolean
}): AnalyticsScope {
  if (input.canReadAll) return 'all'
  if (input.hasDirectReports) return 'reports'
  if (input.hasDepartment) return 'department'
  return 'mine'
}

export function personMatchesAnalyticsScope(
  employee: PlatformEmployee,
  scope: AnalyticsScope,
  viewer: PlatformEmployee | null,
  directory: readonly PlatformEmployee[],
): boolean {
  if (scope === 'all' || viewer == null) return true
  if (scope === 'mine') return employee.employeeId === viewer.employeeId
  if (scope === 'department') {
    return (
      employee.department.trim().toLocaleLowerCase() ===
      viewer.department.trim().toLocaleLowerCase()
    )
  }
  return isEffectiveDirectReport(employee, viewer, directory)
}

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

function countByStatus(packets: ReviewPacket[]): Record<ReviewPacketStatus, number> {
  const counts = Object.fromEntries(
    PIPELINE_ORDER.map((status) => [status, 0]),
  ) as Record<ReviewPacketStatus, number>
  for (const packet of packets) {
    counts[packet.status] += 1
  }
  return counts
}

function openAppealCount(packet: ReviewPacket): number {
  return (packet.appeals ?? []).filter((appeal) => appeal.status === 'open').length
}

function hasGoals(submission: PersonGoals | undefined): boolean {
  return (submission?.goals.length ?? 0) > 0
}

function reviewWorkHasStarted(packets: readonly ReviewPacket[]): boolean {
  return packets.some(
    (packet) => packet.status !== 'not_started' || officialGrade(packet) != null,
  )
}

function dayValue(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1)
}

function reviewWindowHasOpened(
  cycle: ReviewCycle,
  today = new Date(),
): boolean {
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const starts = (cycle.stagesConfig.reviewStages ?? [])
    .filter((stage) => stage.enabled && stage.id !== 'goals' && stage.start?.date)
    .map((stage) => dayValue(stage.start?.date ?? ''))
  if (starts.length === 0) {
    starts.push(dayValue(cycle.stagesConfig.performance.employeeStart.date))
    starts.push(dayValue(cycle.stagesConfig.performance.managerStart.date))
  }
  const earliest = Math.min(...starts)
  return Number.isFinite(earliest) && now >= earliest
}

function shouldShowReviews(input: {
  moduleEnabled: boolean
  packets: readonly ReviewPacket[]
  cycle: ReviewCycle
  today?: Date
}): boolean {
  if (reviewWorkHasStarted(input.packets)) return true
  return input.moduleEnabled && reviewWindowHasOpened(input.cycle, input.today)
}

/**
 * Cycle operating picture from data the product already stores.
 * Skips vanity totals (comment counts, raw headcount as a hero, invented scores).
 */
export function buildAnalyticsDashboard(input: {
  cycle: ReviewCycle
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  submissions: readonly PersonGoals[]
  scope: AnalyticsScope
  viewer: PlatformEmployee | null
  reviewsHref?: string
  goalsHref?: string
  today?: Date
}): AnalyticsDashboard {
  const directory = input.employees.filter((employee) => employee.isActive)
  const memberIds = new Set(cycleMemberIds(input.cycle))
  const roster = directory.filter(
    (employee) =>
      memberIds.has(employee.employeeId) &&
      personMatchesAnalyticsScope(
        employee,
        input.scope,
        input.viewer,
        directory,
      ),
  )
  const rosterIds = new Set(roster.map((employee) => employee.employeeId))
  const byId = new Map(roster.map((employee) => [employee.employeeId, employee]))

  const packets = input.packets.filter((packet) => rosterIds.has(packet.employeeId))
  const submissionsByPerson = new Map(
    input.submissions.map((submission) => [Number(submission.personId), submission]),
  )

  const goalsEnabled = roster.some((employee) => {
    const group = findCycleGroupForPerson(input.cycle, employee.employeeId)
    return isGoalsModuleEnabled(
      (group?.stagesConfig ?? input.cycle.stagesConfig).reviewStages,
    )
  })
  const reviewsEnabled = roster.some((employee) => {
    const group = findCycleGroupForPerson(input.cycle, employee.employeeId)
    return isReviewsModuleEnabled(
      (group?.stagesConfig ?? input.cycle.stagesConfig).reviewStages,
    )
  })
  const cycleReviewsEnabled = isReviewsModuleEnabled(
    input.cycle.stagesConfig.reviewStages,
  )
  const cycleGoalsEnabled = isGoalsModuleEnabled(input.cycle.stagesConfig.reviewStages)
  const showGoals = goalsEnabled || (roster.length === 0 && cycleGoalsEnabled)
  const showReviews = shouldShowReviews({
    moduleEnabled:
      reviewsEnabled || (roster.length === 0 && cycleReviewsEnabled),
    packets,
    cycle: input.cycle,
    today: input.today,
  })

  const reviewsHref = input.reviewsHref ?? '/reviews'
  const goalsHref = input.goalsHref ?? '/goals'

  let goals: AnalyticsGoalCoverage | null = null
  if (showGoals) {
    const coverage: AnalyticsGoalCoverage = {
      members: roster.length,
      withGoals: 0,
      missing: 0,
      draft: 0,
      sentBack: 0,
      submitted: 0,
      approved: 0,
    }
    for (const employee of roster) {
      const submission = submissionsByPerson.get(employee.employeeId)
      if (hasGoals(submission)) coverage.withGoals += 1
      else coverage.missing += 1
      switch (submission?.status) {
        case 'sent_back':
          coverage.sentBack += 1
          break
        case 'submitted':
          coverage.submitted += 1
          break
        case 'approved':
          coverage.approved += 1
          break
        case 'incomplete':
        case 'not_eligible':
          break
        default:
          if (submission?.status === 'draft') coverage.draft += 1
          break
      }
    }
    goals = coverage
  }

  const statusCounts = countByStatus(packets)
  let reviews: AnalyticsReviewTotals | null = null
  if (showReviews) {
    reviews = {
      members: roster.length,
      notStarted: 0,
      inProgress: 0,
      waiting: 0,
      released: 0,
      graded: 0,
    }
    for (const packet of packets) {
      reviews[reviewWorkBucket(packet.status)] += 1
      if (officialGrade(packet)) reviews.graded += 1
    }
    const withoutPacket = roster.length - packets.length
    if (withoutPacket > 0) reviews.notStarted += withoutPacket
  }

  const attention: AnalyticsAttentionItem[] = []
  const notStarted =
    (reviews?.notStarted ?? 0)
  if (showReviews && notStarted > 0) {
    attention.push({
      id: 'reviews_not_started',
      title: 'Reviews not started',
      count: notStarted,
      why: 'Nobody has opened this person’s review yet.',
      href: reviewsHref,
    })
  }
  if (showReviews && statusCounts.self_in_progress > 0) {
    attention.push({
      id: 'self_reviews_open',
      title: 'Self-reviews still open',
      count: statusCounts.self_in_progress,
      why: 'The employee started and has not submitted.',
      href: reviewsHref,
    })
  }
  if (showReviews && statusCounts.manager_in_progress > 0) {
    attention.push({
      id: 'manager_reviews_open',
      title: 'Manager reviews still open',
      count: statusCounts.manager_in_progress,
      why: 'The line manager has a draft and has not submitted.',
      href: reviewsHref,
    })
  }
  const readyToRelease =
    statusCounts.manager_submitted +
    statusCounts.calibrated +
    statusCounts.in_calibration
  if (showReviews && readyToRelease > 0) {
    attention.push({
      id: 'ready_to_release',
      title: 'Waiting on release',
      count: readyToRelease,
      why: 'Manager review is in or past submit — still not with the employee.',
      href: reviewsHref,
    })
  }
  if (showReviews && statusCounts.released_to_managers > 0) {
    attention.push({
      id: 'held_with_managers',
      title: 'Released to managers only',
      count: statusCounts.released_to_managers,
      why: 'Employees cannot see the official grade yet.',
      href: reviewsHref,
    })
  }
  const openAppeals = packets.reduce(
    (sum, packet) => sum + openAppealCount(packet),
    0,
  )
  if (showReviews && openAppeals > 0) {
    attention.push({
      id: 'open_appeals',
      title: 'Open appeals',
      count: openAppeals,
      why: 'An employee recorded a challenge after release.',
      href: reviewsHref,
    })
  }
  if (showGoals && (goals?.missing ?? 0) > 0) {
    attention.push({
      id: 'goals_missing',
      title: 'No goals on file',
      count: goals?.missing ?? 0,
      why: 'These people are in the cycle and have not saved any goals.',
      href: goalsHref,
    })
  }

  const enabledStatuses = new Set<ReviewPacketStatus>()
  if (showReviews) {
    enabledStatuses.add('not_started')
    for (const employee of roster) {
      const stages = findCycleGroupForPerson(input.cycle, employee.employeeId)
        ?.stagesConfig.reviewStages ?? input.cycle.stagesConfig.reviewStages
      for (const stage of stages ?? []) {
        if (!stage.enabled) continue
        if (stage.id === 'self_review') {
          enabledStatuses.add('self_in_progress')
          enabledStatuses.add('self_submitted')
        }
        if (stage.id === 'manager_review') {
          enabledStatuses.add('manager_in_progress')
          enabledStatuses.add('manager_submitted')
        }
        if (
          stage.id === 'calibration_hod_hrbp' ||
          stage.id === 'calibration_slt'
        ) {
          enabledStatuses.add('in_calibration')
          enabledStatuses.add('calibrated')
        }
        if (stage.id === 'publish_managers') {
          enabledStatuses.add('released_to_managers')
        }
        if (stage.id === 'publish_employees') {
          enabledStatuses.add('released_to_employees')
        }
        if (stage.id === 'appeal') enabledStatuses.add('appealed')
      }
    }
  }

  const pipeline = showReviews
    ? PIPELINE_ORDER.filter(
        (status) => enabledStatuses.has(status) || statusCounts[status] > 0,
      ).map((status) => ({
        id: status,
        label: PACKET_STATUS_LABEL[status],
        count: statusCounts[status],
      }))
    : []

  const gradedPackets = packets.filter((packet) => officialGrade(packet))
  const gradeMix: AnalyticsGradeMixRow[] = []
  if (showReviews && gradedPackets.length > 0) {
    const guideline = input.cycle.calibration.gradeDistribution
    const counts = Object.fromEntries(
      GRADE_BAND_ORDER.map((id) => [id, 0]),
    ) as Record<GradeBandId, number>
    for (const packet of gradedPackets) {
      const grade = officialGrade(packet)
      if (grade) counts[grade] += 1
    }
    for (const id of GRADE_BAND_ORDER) {
      const count = counts[id]
      const actual = percent(count, gradedPackets.length)
      const guidelinePercent = guideline[id] ?? 0
      gradeMix.push({
        id,
        label: GRADE_BAND_META[id].label,
        count,
        percent: actual,
        guidelinePercent,
        deltaPoints: actual - guidelinePercent,
      })
    }
  }

  const packetByEmployee = new Map(
    packets.map((packet) => [packet.employeeId, packet]),
  )
  const departments: AnalyticsDepartmentRow[] = []
  if (showReviews) {
    const byDepartment = new Map<string, AnalyticsDepartmentRow>()
    for (const employee of roster) {
      const name = employee.department.trim() || 'Unassigned'
      const row = byDepartment.get(name) ?? {
        name,
        people: 0,
        notStarted: 0,
        inProgress: 0,
        waiting: 0,
        released: 0,
        graded: 0,
        unfinishedPercent: 0,
      }
      row.people += 1
      const packet = packetByEmployee.get(employee.employeeId)
      const bucket = packet ? reviewWorkBucket(packet.status) : 'not_started'
      row[bucket] += 1
      if (officialGrade(packet)) row.graded += 1
      byDepartment.set(name, row)
    }
    for (const row of byDepartment.values()) {
      row.unfinishedPercent = percent(row.notStarted + row.inProgress, row.people)
      departments.push(row)
    }
    departments.sort((left, right) => {
      if (right.unfinishedPercent !== left.unfinishedPercent) {
        return right.unfinishedPercent - left.unfinishedPercent
      }
      return left.name.localeCompare(right.name)
    })
  }

  const managers: AnalyticsManagerRow[] = []
  if (showReviews) {
    const byManager = new Map<number, AnalyticsManagerRow>()
    for (const packet of packets) {
      const subject = byId.get(packet.employeeId)
      const managerId = packet.managerEmployeeId ?? subject?.reportsToId
      if (managerId == null || !Number.isInteger(managerId)) continue
      if (managerId === packet.employeeId) continue
      const manager = directory.find((employee) => employee.employeeId === managerId)
      const row = byManager.get(managerId) ?? {
        employeeId: managerId,
        name: manager?.fullName ?? subject?.reportsToName ?? 'Unknown manager',
        teamSize: 0,
        notStarted: 0,
        inProgress: 0,
        unfinished: 0,
      }
      row.teamSize += 1
      const bucket = reviewWorkBucket(packet.status)
      if (bucket === 'notStarted') row.notStarted += 1
      if (bucket === 'inProgress') row.inProgress += 1
      row.unfinished = row.notStarted + row.inProgress
      byManager.set(managerId, row)
    }
    managers.push(
      ...[...byManager.values()]
        .filter((row) => row.unfinished > 0)
        .sort((left, right) => {
          if (right.unfinished !== left.unfinished) {
            return right.unfinished - left.unfinished
          }
          return left.name.localeCompare(right.name)
        })
        .slice(0, 8),
    )
  }

  return {
    cycleId: input.cycle.id,
    cycleName: input.cycle.name,
    memberCount: roster.length,
    goalsEnabled: showGoals,
    reviewsEnabled: showReviews,
    goals,
    reviews,
    attention,
    pipeline,
    gradeMix,
    departments,
    managers,
  }
}
