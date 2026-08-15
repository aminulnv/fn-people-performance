import { isEligibleForCycle } from './demoData'
import type {
  DemoPerson,
  GoalsCycle,
  GoalsCycleStatus,
  PersonGoals,
  SubmissionStatus,
} from './types'

export type GoalActionContext = {
  actor: DemoPerson
  subject: DemoPerson
  row: PersonGoals
  cycle: GoalsCycle
  cycleStatus: GoalsCycleStatus
}

export type GoalCapabilities = {
  canEditStructure: boolean
  canUpdateProgress: boolean
  canCreate: boolean
  canRemove: boolean
  canDuplicate: boolean
  canCascade: boolean
  canSubmit: boolean
  canApprove: boolean
  canSendBack: boolean
  canRate: boolean
  canViewAsManager: boolean
}

const MUTABLE_STATUSES: SubmissionStatus[] = [
  'draft',
  'sent_back',
  'submitted',
  'approved',
]

export function isDirectManager(
  actor: DemoPerson,
  subject: DemoPerson,
): boolean {
  return subject.managerId === actor.id || actor.reportIds.includes(subject.id)
}

export function canMutateGoalStatus(status: SubmissionStatus): boolean {
  return MUTABLE_STATUSES.includes(status)
}

function isSelfOrManager(actor: DemoPerson, subject: DemoPerson): boolean {
  return actor.id === subject.id || isDirectManager(actor, subject)
}

/**
 * Corrected policy shared by V1 and V2. Actor identity comes from auth, not
 * the person in the URL.
 */
export function deriveGoalCapabilities(
  context: GoalActionContext,
): GoalCapabilities {
  const { actor, subject, row, cycle, cycleStatus } = context
  const eligible = isEligibleForCycle(subject, cycle)
  const mutable = canMutateGoalStatus(row.status)
  const currentCycle = cycleStatus === 'current'
  const windowOpen = cycle.phase === 'window_open'
  const selfOrManager = isSelfOrManager(actor, subject)
  const isSelf = actor.id === subject.id
  const manager = isDirectManager(actor, subject)
  const canStructure =
    eligible &&
    mutable &&
    currentCycle &&
    windowOpen &&
    selfOrManager

  const canProgress =
    eligible && mutable && currentCycle && selfOrManager

  return {
    canEditStructure: canStructure,
    canUpdateProgress: canProgress,
    canCreate: canStructure,
    canRemove: canStructure,
    canDuplicate: canStructure,
    canCascade: canStructure && isSelf && actor.reportIds.length > 0,
    canSubmit:
      isSelf &&
      eligible &&
      windowOpen &&
      (row.status === 'draft' || row.status === 'sent_back'),
    canApprove: manager && row.status === 'submitted',
    canSendBack:
      manager && (row.status === 'submitted' || row.status === 'approved'),
    canRate:
      manager &&
      currentCycle &&
      cycle.phase === 'check_in' &&
      row.status === 'approved' &&
      !row.rating,
    canViewAsManager: manager || actor.role === 'ptr' || actor.role === 'hrbp',
  }
}

/**
 * Direct reports of `manager` — the person whose Reports section is on screen,
 * which is not always the signed-in actor.
 */
export function selectManagerReports(
  manager: DemoPerson,
  people: DemoPerson[],
  byPerson: Record<string, PersonGoals>,
): { person: DemoPerson; row: PersonGoals }[] {
  return manager.reportIds
    .map((id) => {
      const person = people.find((candidate) => candidate.id === id)
      const row = byPerson[id]
      if (!person || !row) return null
      return { person, row }
    })
    .filter(Boolean) as { person: DemoPerson; row: PersonGoals }[]
}

/** Pending reports first so managers act before they browse. */
export function orderManagerReports<T extends { row: PersonGoals }>(
  reports: T[],
): T[] {
  return [
    ...reports.filter((report) => report.row.status === 'submitted'),
    ...reports.filter((report) => report.row.status !== 'submitted'),
  ]
}
