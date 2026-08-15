import { newId } from './weightage'
import type { DemoPerson, Goal, Measurement } from './types'

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
    }
  }
  return {
    ...measurement,
    id: newId('m'),
    currentValue: measurement.startValue,
  }
}

/** Fresh copy of a goal for duplicate/cascade — no progress or comments. */
export function resetGoalProgress(goal: Goal): Goal {
  return {
    ...goal,
    id: newId('goal'),
    progressStatus: 'on_track',
    comments: [],
    measurements: goal.measurements.map(resetMeasurement),
    updatedAt: new Date().toISOString(),
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
    linkedGoalLabel: source.description.trim() || undefined,
  }
}

export function cascadeGoal(
  source: Goal,
  targetPersonId: string,
  options: {
    sourceTitle: string
  },
): Goal {
  const reset = resetGoalProgress(source)
  return {
    ...reset,
    ownerId: targetPersonId,
    linkedGoalLabel: options.sourceTitle,
  }
}
