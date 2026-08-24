import { blankGoal } from './measurements'
import { displayGoalTitle, newId } from './weightage'
import type { DemoPerson, Goal, GoalsSnapshot, Measurement } from './types'

export type GoalOwnerOption = {
  id: string
  name: string
  title?: string
  avatarUrl?: string
}

export type ResolvedGoalOwner = {
  id: string
  name: string
  title?: string
  avatarUrl?: string
}

export function buildOwnerOptions(people: DemoPerson[]): GoalOwnerOption[] {
  return people
    .map((person) => ({
      id: person.id,
      name: person.name,
      title: person.title,
      avatarUrl: person.avatarUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export type CascadeGoalOption = {
  id: string
  title: string
  managerName: string
  managerId?: string
  managerAvatarUrl?: string
  measurements?: Measurement[]
}

export type LineManagerCascade = {
  managerId?: string | null
  managerName: string | null
  managerAvatarUrl?: string
  /** Manager's manager — used when a late submission needs skip-level approval. */
  skipLevelManagerId?: string | null
  skipLevelManagerName?: string | null
  skipLevelManagerAvatarUrl?: string
  options: CascadeGoalOption[]
}

export type CascadeApprover = {
  id?: string
  name: string
  avatarUrl?: string
}

export function cascadeApprover(
  id?: string | null,
  name?: string | null,
  avatarUrl?: string,
): CascadeApprover | null {
  const trimmed = name?.trim()
  if (!trimmed) return null
  return {
    ...(id ? { id } : {}),
    name: trimmed,
    ...(avatarUrl ? { avatarUrl } : {}),
  }
}

export function cascadeApprovers(cascade: LineManagerCascade): {
  lineManager: CascadeApprover | null
  skipLevelManager: CascadeApprover | null
} {
  return {
    lineManager: cascadeApprover(
      cascade.managerId,
      cascade.managerName,
      cascade.managerAvatarUrl,
    ),
    skipLevelManager: cascadeApprover(
      cascade.skipLevelManagerId,
      cascade.skipLevelManagerName,
      cascade.skipLevelManagerAvatarUrl,
    ),
  }
}

const EMPTY_CASCADE: LineManagerCascade = { managerName: null, options: [] }

function cascadeGoalTitle(goal: Goal, index: number): string {
  return displayGoalTitle(goal, index)
}

/** Goals of the subject's line manager only — one level up the tree. */
export function lineManagerCascade(
  subject: DemoPerson | null,
  snapshot: Pick<GoalsSnapshot, 'people' | 'byPerson'> | null,
): LineManagerCascade {
  if (!subject?.managerId || !snapshot) return EMPTY_CASCADE
  const manager = snapshot.people.find((person) => person.id === subject.managerId)
  if (!manager) return EMPTY_CASCADE
  const skipLevel = manager.managerId
    ? snapshot.people.find((person) => person.id === manager.managerId)
    : null
  const goals = snapshot.byPerson[manager.id]?.goals ?? []
  return {
    managerId: manager.id,
    managerName: manager.name,
    managerAvatarUrl: manager.avatarUrl,
    skipLevelManagerId: skipLevel?.id ?? null,
    skipLevelManagerName: skipLevel?.name ?? null,
    skipLevelManagerAvatarUrl: skipLevel?.avatarUrl,
    options: goals.map((goal, index) => ({
      id: goal.id,
      title: cascadeGoalTitle(goal, index),
      managerName: manager.name,
      managerId: manager.id,
      managerAvatarUrl: manager.avatarUrl,
      measurements: goal.measurements,
    })),
  }
}

export function selectedCascadeOption(
  goal: Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'>,
  options: CascadeGoalOption[],
): CascadeGoalOption | null {
  if (goal.cascadedFromGoalId) {
    const match = options.find((option) => option.id === goal.cascadedFromGoalId)
    if (match) return match
  }
  const label = goal.linkedGoalLabel?.trim()
  if (!label) return null
  return (
    options.find((option) => option.title === label) ?? {
      id: goal.cascadedFromGoalId ?? '',
      title: label,
      managerName: '',
    }
  )
}

export function applyCascadeSelection(
  option: CascadeGoalOption | null,
): Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'> {
  if (!option) {
    return { cascadedFromGoalId: undefined, linkedGoalLabel: undefined }
  }
  return {
    cascadedFromGoalId: option.id || undefined,
    linkedGoalLabel: option.title,
  }
}

export type CascadeRecipient = {
  goalId: string
  goalTitle: string
  personId: string
  personName: string
  avatarUrl?: string
  measurements?: Measurement[]
}

/** Child goals already cascaded from this one — live title + owner. */
export function indexCascadeRecipients(
  snapshot: Pick<GoalsSnapshot, 'people' | 'byPerson'> | null,
): Map<string, CascadeRecipient[]> {
  const bySource = new Map<string, CascadeRecipient[]>()
  if (!snapshot) return bySource
  for (const person of snapshot.people) {
    const row = snapshot.byPerson[person.id]
    if (!row) continue
    row.goals.forEach((goal, index) => {
      const sourceId = goal.cascadedFromGoalId
      if (!sourceId) return
      const current = bySource.get(sourceId) ?? []
      current.push({
        goalId: goal.id,
        goalTitle: cascadeGoalTitle(goal, index),
        personId: person.id,
        personName: person.name,
        avatarUrl: person.avatarUrl,
        measurements: goal.measurements,
      })
      bySource.set(sourceId, current)
    })
  }
  return bySource
}

export function cascadeRecipients(
  sourceGoalId: string,
  snapshot: Pick<GoalsSnapshot, 'people' | 'byPerson'> | null,
): CascadeRecipient[] {
  if (!sourceGoalId) return []
  return indexCascadeRecipients(snapshot).get(sourceGoalId) ?? []
}

export type CascadeToOption = {
  id: string
  title: string
  personId: string
  personName: string
  personAvatarUrl?: string
}

/** Existing report goals that can be linked under this one. */
export function reportCascadeOptions(
  subject: Pick<DemoPerson, 'reportIds'> | null,
  snapshot: Pick<GoalsSnapshot, 'people' | 'byPerson'> | null,
  sourceGoalId: string,
): CascadeToOption[] {
  if (!subject?.reportIds.length || !snapshot || !sourceGoalId) return []
  const options: CascadeToOption[] = []
  for (const reportId of subject.reportIds) {
    const person = snapshot.people.find((entry) => entry.id === reportId)
    if (!person) continue
    const goals = snapshot.byPerson[reportId]?.goals ?? []
    goals.forEach((goal, index) => {
      if (goal.id === sourceGoalId) return
      if (goal.cascadedFromGoalId === sourceGoalId) return
      options.push({
        id: goal.id,
        title: cascadeGoalTitle(goal, index),
        personId: person.id,
        personName: person.name,
        personAvatarUrl: person.avatarUrl,
      })
    })
  }
  return options.sort(
    (left, right) =>
      left.personName.localeCompare(right.personName) ||
      left.title.localeCompare(right.title),
  )
}

export function applyCascadeToLink(
  child: Goal,
  source: Pick<Goal, 'id' | 'description' | 'linkedGoalLabel'>,
): Goal {
  return {
    ...child,
    cascadedFromGoalId: source.id,
    linkedGoalLabel: source.description.trim() || source.linkedGoalLabel,
    updatedAt: new Date().toISOString(),
  }
}

export function clearCascadeLink(child: Goal): Goal {
  return {
    ...child,
    cascadedFromGoalId: undefined,
    linkedGoalLabel: undefined,
    updatedAt: new Date().toISOString(),
  }
}

/** Prefer the goal's ownerId; fall back to the subject's bucket owner. */
export function resolveGoalOwner(
  goal: Goal,
  subject: DemoPerson,
  people: DemoPerson[],
): ResolvedGoalOwner {
  const ownerId = goal.ownerId ?? subject.id
  const match = people.find((person) => person.id === ownerId)
  if (match) {
    return {
      id: match.id,
      name: match.name,
      title: match.title,
      avatarUrl: match.avatarUrl,
    }
  }
  if (ownerId === subject.id) {
    return {
      id: subject.id,
      name: subject.name,
      title: subject.title,
      avatarUrl: subject.avatarUrl,
    }
  }
  return {
    id: ownerId,
    name: 'Former owner',
  }
}

export function replaceGoal(goals: Goal[], nextGoal: Goal): Goal[] {
  return goals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal))
}

export function removeGoal(goals: Goal[], goalId: string): Goal[] {
  return goals.filter((goal) => goal.id !== goalId)
}

function resetMeasurement(measurement: Measurement): Measurement {
  if (measurement.kind === 'milestone') {
    return {
      ...measurement,
      id: newId('m'),
      complete: false,
      progressLog: [],
    }
  }
  return {
    ...measurement,
    id: newId('m'),
    currentValue: measurement.startValue,
    progressLog: [],
  }
}

/** Fresh copy of a goal for duplicate/cascade — no progress or comments. */
export function resetGoalProgress(goal: Goal): Goal {
  return {
    ...goal,
    id: newId('goal'),
    comments: [],
    measurements: goal.measurements.map(resetMeasurement),
    updatedAt: new Date().toISOString(),
  }
}

/** Carry a previous-cycle goal forward as a clean, independent draft. */
export function copyGoalToNewCycle(goal: Goal, ownerId: string): Goal {
  const {
    cascadedFromGoalId: _cascadedFromGoalId,
    linkedGoalLabel: _linkedGoalLabel,
    ...copy
  } = resetGoalProgress(goal)
  return {
    ...copy,
    ownerId,
  }
}

export function duplicateGoal(
  source: Goal,
  options: {
    ownerId: string
    sourceTitle: string
  },
): Goal {
  const reset = resetGoalProgress(source)
  return {
    ...reset,
    description: `${options.sourceTitle} (copy)`,
    ownerId: options.ownerId,
    cascadedFromGoalId: source.cascadedFromGoalId,
    linkedGoalLabel: source.linkedGoalLabel,
  }
}

/** Placeholder child linked to a parent — title only; recipient sets measures. */
export function cascadeGoal(
  source: Goal,
  targetPersonId: string,
  options: {
    sourceTitle: string
    sourcePersonName: string
  },
): Goal {
  return {
    ...blankGoal({ ownerId: targetPersonId }),
    description: '',
    cascadedFromGoalId: source.id,
    linkedGoalLabel: options.sourceTitle,
    comments: [],
    updatedAt: new Date().toISOString(),
  }
}
