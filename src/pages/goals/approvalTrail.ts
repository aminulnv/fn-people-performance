import type { PersonGoals, SubmissionStatus } from '@/lib/goals/types'

export type ApprovalTrailPerson = {
  id?: string | null
  name: string
  avatarUrl?: string
}

export type ApprovalTrailStage = {
  key: string
  label: string
  spoken?: string
  person?: ApprovalTrailPerson | null
}

export type ApprovalTrailModel = {
  late: boolean
  stages: ApprovalTrailStage[]
  currentIndex: number
  spoken: string
}

export type BuildApprovalTrailArgs = {
  perspective: 'owner' | 'reviewer'
  status: SubmissionStatus
  postWindowApprovalStage?: PersonGoals['postWindowApprovalStage']
  allowLateSubmissions?: boolean
  lineManager?: ApprovalTrailPerson | null
  skipLevelManager?: ApprovalTrailPerson | null
}

function joinThen(parts: string[]): string {
  return parts.filter(Boolean).join(', then ')
}

function withLate(late: boolean, body: string): string {
  return late ? `Late submission. ${body}` : body
}

function spokenOf(stage: ApprovalTrailStage): string {
  return stage.spoken ?? stage.label
}

function labelStage(
  key: string,
  label: string,
  spoken?: string,
): ApprovalTrailStage {
  return { key, label, spoken }
}

function personStage(
  key: string,
  person: ApprovalTrailPerson | null | undefined,
  fallback: string,
): ApprovalTrailStage {
  return person
    ? { key, label: person.name, person }
    : { key, label: fallback }
}

function trail(
  late: boolean,
  stages: ApprovalTrailStage[],
  spoken: string,
  currentIndex = 0,
): ApprovalTrailModel {
  return { late, stages, currentIndex, spoken: withLate(late, spoken) }
}

function approverStages(
  manager: ApprovalTrailStage,
  skip: ApprovalTrailStage | null,
): ApprovalTrailStage[] {
  return skip ? [manager, skip] : [manager]
}

/**
 * Shared approval path for anyone looking at a goal set. Stages name people
 * rather than “you”, so the same banner reads correctly for the owner, their
 * manager, or anyone else with visibility.
 */
export function buildApprovalTrail(
  args: BuildApprovalTrailArgs,
): ApprovalTrailModel | null {
  const {
    perspective,
    status,
    postWindowApprovalStage,
    allowLateSubmissions = false,
    lineManager,
    skipLevelManager,
  } = args

  const twoTier = allowLateSubmissions || Boolean(postWindowApprovalStage)
  const manager = personStage('manager', lineManager, 'Manager')
  const skip = skipLevelManager
    ? personStage('skip', skipLevelManager, 'Skip-level')
    : null

  if (status === 'submitted') {
    if (postWindowApprovalStage === 'manager_manager') {
      const finalApprover = skip ?? manager
      return trail(true, [finalApprover], `Awaiting ${spokenOf(finalApprover)}`)
    }
    if (postWindowApprovalStage === 'manager') {
      const stages = approverStages(manager, skip)
      return trail(
        true,
        stages,
        `Awaiting ${joinThen(stages.map(spokenOf))}`,
      )
    }
    if (perspective === 'owner') {
      return trail(false, [manager], `Awaiting ${spokenOf(manager)}`)
    }
    return null
  }

  if (status === 'sent_back') {
    const revise = labelStage('you', 'Changes needed', 'Needs changes')
    const stages = twoTier
      ? [revise, ...approverStages(manager, skip)]
      : lineManager
        ? [revise, manager]
        : [revise]
    return trail(twoTier, stages, joinThen(stages.map(spokenOf)))
  }

  if (status === 'draft') {
    if (twoTier) {
      const stages = approverStages(manager, skip)
      return trail(true, stages, joinThen(stages.map(spokenOf)))
    }
    if (perspective === 'owner' && lineManager) {
      const you = labelStage('you', 'You')
      return trail(false, [you, manager], joinThen(['You', spokenOf(manager)]))
    }
    return null
  }

  return null
}
