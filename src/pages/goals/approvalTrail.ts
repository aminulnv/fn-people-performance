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
  canApprove?: boolean
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
    canApprove = false,
  } = args

  const twoTier = allowLateSubmissions || Boolean(postWindowApprovalStage)
  const manager = personStage('manager', lineManager, 'Manager')
  const skip = personStage('skip', skipLevelManager, 'Skip-level')

  if (perspective === 'reviewer') {
    if (status !== 'submitted') return null
    if (postWindowApprovalStage === 'manager') {
      const current = canApprove ? labelStage('you', 'You') : manager
      return trail(
        true,
        [current, skip],
        joinThen([spokenOf(current), spokenOf(skip)]),
      )
    }
    if (postWindowApprovalStage === 'manager_manager') {
      if (canApprove) {
        return trail(true, [labelStage('you', 'You')], 'Your approval is final')
      }
      return trail(true, [skip], `Awaiting ${spokenOf(skip)}`)
    }
    return null
  }

  if (status === 'submitted' && postWindowApprovalStage === 'manager_manager') {
    return trail(true, [skip], `Awaiting ${spokenOf(skip)}`)
  }

  if (status === 'submitted' && postWindowApprovalStage === 'manager') {
    return trail(
      true,
      [manager, skip],
      `Awaiting ${joinThen([spokenOf(manager), spokenOf(skip)])}`,
    )
  }

  if (status === 'submitted') {
    return trail(false, [manager], `Awaiting ${spokenOf(manager)}`)
  }

  if (status === 'sent_back') {
    const you = labelStage('you', 'Your changes', 'Needs your changes')
    const stages = twoTier
      ? [you, manager, skip]
      : lineManager
        ? [you, manager]
        : [you]
    return trail(twoTier, stages, joinThen(stages.map(spokenOf)))
  }

  if (status === 'draft') {
    if (!twoTier && !lineManager) return null
    const you = labelStage('you', 'You')
    const stages = twoTier ? [you, manager, skip] : [you, manager]
    return trail(twoTier, stages, joinThen(stages.map(spokenOf)))
  }

  return null
}
