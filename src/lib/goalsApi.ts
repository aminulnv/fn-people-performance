import { isEligibleForCycle } from './goals/demoData'
import {
  approveSubmission,
  applyHardLockIncompletes,
  getGoalsSnapshot,
  resetGoalsDemo,
  savePersonGoals,
  sendBackSubmission,
  setActiveCycle,
  setActivePerson,
  setDemoPhase,
  submitPersonGoals,
  submitQuarterRating,
  subscribeGoalsStore,
  updateGoalProgress,
  type GoalMutationContext,
} from './goals/store'
import type {
  DemoPhase,
  Goal,
  GoalsSnapshot,
  QuarterRating,
} from './goals/types'

export type {
  DemoPerson,
  DemoPhase,
  Goal,
  GoalsCycleOption,
  GoalsCycleStatus,
  GoalsSnapshot,
  Measurement,
  PersonGoals,
  SubmissionStatus,
} from './goals/types'

export type { GoalMutationContext }

export { isEligibleForCycle }
export {
  canSubmitGoals,
  goalCompletion,
  overallCompletion,
  sumGoalWeights,
  sumMeasurementWeights,
  newId,
} from './goals/weightage'
export type { SubmitGoalBlocker } from './goals/weightage'

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms)
  })
}

/** Subscribe for live demo updates (persona actions). */
export function watchGoalsSnapshot(onChange: () => void): () => void {
  return subscribeGoalsStore(onChange)
}

export async function fetchGoalsSnapshot(): Promise<GoalsSnapshot> {
  return delay(getGoalsSnapshot())
}

export async function selectDemoPerson(personId: string): Promise<GoalsSnapshot> {
  return delay(setActivePerson(personId))
}

export async function changeDemoPhase(phase: DemoPhase): Promise<GoalsSnapshot> {
  if (phase === 'hard_lock') return delay(applyHardLockIncompletes())
  return delay(setDemoPhase(phase))
}

/** Review cycles available for goal setting (same identity as Reviews). */
export function listGoalCycles() {
  return getGoalsSnapshot().availableCycles
}

export async function selectGoalCycle(cycleId: string): Promise<GoalsSnapshot> {
  return delay(setActiveCycle(cycleId))
}

/** @deprecated Prefer listGoalCycles / selectGoalCycle */
export function listDemoCycles() {
  return listGoalCycles()
}

/** @deprecated Prefer selectGoalCycle */
export async function selectDemoCycle(cycleId: string): Promise<GoalsSnapshot> {
  return selectGoalCycle(cycleId)
}

export async function resetDemo(): Promise<GoalsSnapshot> {
  return delay(resetGoalsDemo())
}

export async function saveGoals(
  context: GoalMutationContext,
  goals: Goal[],
): Promise<GoalsSnapshot> {
  return delay(savePersonGoals(context, goals))
}

export async function submitGoals(
  context: GoalMutationContext,
): Promise<GoalsSnapshot> {
  return delay(submitPersonGoals(context))
}

export async function sendBackGoals(
  context: GoalMutationContext,
  reason: string,
): Promise<GoalsSnapshot> {
  return delay(sendBackSubmission(context, reason))
}

export async function approveGoals(
  context: GoalMutationContext,
  goals?: Goal[],
): Promise<GoalsSnapshot> {
  return delay(approveSubmission(context, goals))
}

export async function saveProgress(
  context: GoalMutationContext,
  goals: Goal[],
): Promise<GoalsSnapshot> {
  return delay(updateGoalProgress(context, goals))
}

export async function ratePerson(
  context: GoalMutationContext,
  rating: Omit<QuarterRating, 'submittedAt'>,
): Promise<GoalsSnapshot> {
  return delay(submitQuarterRating(context, rating))
}
