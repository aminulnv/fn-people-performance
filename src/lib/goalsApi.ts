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
  updateApprovedProgress,
} from './goals/store'
import { DEMO_CYCLES } from './goals/demoData'
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
  GoalsSnapshot,
  Measurement,
  PersonGoals,
  SubmissionStatus,
} from './goals/types'

export { isEligibleForCycle }
export {
  canSubmitGoals,
  goalCompletion,
  overallCompletion,
  sumGoalWeights,
  sumMeasurementWeights,
  newId,
} from './goals/weightage'

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

export function listDemoCycles() {
  return DEMO_CYCLES.map((c) => ({ ...c }))
}

export async function selectDemoCycle(cycleId: string): Promise<GoalsSnapshot> {
  return delay(setActiveCycle(cycleId))
}

export async function resetDemo(): Promise<GoalsSnapshot> {
  return delay(resetGoalsDemo())
}

export async function saveGoals(
  personId: string,
  goals: Goal[],
): Promise<GoalsSnapshot> {
  return delay(savePersonGoals(personId, goals))
}

export async function submitGoals(personId: string): Promise<GoalsSnapshot> {
  return delay(submitPersonGoals(personId))
}

export async function sendBackGoals(
  personId: string,
  reason: string,
): Promise<GoalsSnapshot> {
  return delay(sendBackSubmission(personId, reason))
}

export async function approveGoals(
  personId: string,
  goals?: Goal[],
): Promise<GoalsSnapshot> {
  return delay(approveSubmission(personId, goals))
}

export async function saveProgress(
  personId: string,
  goals: Goal[],
): Promise<GoalsSnapshot> {
  return delay(updateApprovedProgress(personId, goals))
}

export async function ratePerson(
  personId: string,
  rating: Omit<QuarterRating, 'submittedAt'>,
): Promise<GoalsSnapshot> {
  return delay(submitQuarterRating(personId, rating))
}
