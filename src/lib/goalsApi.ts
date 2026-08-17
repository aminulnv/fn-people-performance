import { isEligibleForCycle } from './goals/demoData'
import {
  approvePersonGoalsRemote,
  cascadeGoalRemote,
  copyPreviousCycleGoalsRemote,
  fetchCycleGoalSubmissionsRemote,
  savePersonGoalsDraftRemote,
  sendBackPersonGoalsRemote,
  submitPersonGoalsRemote,
} from './goals/remoteApi'
import {
  approveSubmission,
  applyHardLockIncompletes,
  copyPreviousCycleGoals,
  getGoalsSnapshot,
  mergeRemotePersonGoals,
  replaceCycleGoalsFromRemote,
  resetGoalsDemo,
  savePersonGoals,
  sendBackSubmission,
  setActiveCycle,
  setActivePerson,
  setDemoPhase,
  submitPersonGoals,
  subscribeGoalsStore,
  updateGoalProgress,
  type GoalMutationContext,
} from './goals/store'
import { ensureReviewCyclesLoaded } from './reviews/store'
import { cascadeGoal as buildCascadedGoal } from './goals/operations'
import type {
  DemoPhase,
  Goal,
  GoalsSnapshot,
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

function useLocalGoals(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_GOALS_BACKEND === 'local' ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === 'local'
  )
}

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms)
  })
}

/** Subscribe for live demo updates (persona actions). */
export function watchGoalsSnapshot(onChange: () => void): () => void {
  return subscribeGoalsStore(onChange)
}

/** Every mounted goals view refreshes on the same store change — share one request. */
const hydrationInFlight = new Map<string, Promise<GoalsSnapshot>>()

async function hydrateGoalsFromApi(cycleId?: string): Promise<GoalsSnapshot> {
  await ensureReviewCyclesLoaded()
  const snapshot = getGoalsSnapshot()
  const activeCycleId = cycleId ?? snapshot.cycle.id
  if (!activeCycleId) return snapshot
  const pending = hydrationInFlight.get(activeCycleId)
  if (pending) return pending
  const request = fetchCycleGoalSubmissionsRemote(activeCycleId)
    .then((submissions) =>
      replaceCycleGoalsFromRemote(activeCycleId, submissions),
    )
    .finally(() => {
      hydrationInFlight.delete(activeCycleId)
    })
  hydrationInFlight.set(activeCycleId, request)
  return request
}

export async function fetchGoalsSnapshot(): Promise<GoalsSnapshot> {
  if (useLocalGoals()) return getGoalsSnapshot()
  return hydrateGoalsFromApi()
}

export async function selectDemoPerson(personId: string): Promise<GoalsSnapshot> {
  return delay(setActivePerson(personId))
}

export async function changeDemoPhase(phase: DemoPhase): Promise<GoalsSnapshot> {
  if (phase === 'hard_lock') return delay(applyHardLockIncompletes())
  return delay(setDemoPhase(phase))
}

/** Performance cycles available for goal setting and reviews. */
export function listGoalCycles() {
  return getGoalsSnapshot().availableCycles
}

export async function selectGoalCycle(cycleId: string): Promise<GoalsSnapshot> {
  if (useLocalGoals()) return delay(setActiveCycle(cycleId))
  setActiveCycle(cycleId)
  return hydrateGoalsFromApi(cycleId)
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

function currentVersion(context: GoalMutationContext): number {
  return (
    getGoalsSnapshot().byPerson[context.subjectId]?.version ??
    0
  )
}

export async function saveGoals(
  context: GoalMutationContext,
  goals: Goal[],
): Promise<GoalsSnapshot> {
  if (useLocalGoals()) return delay(savePersonGoals(context, goals))
  const remote = await savePersonGoalsDraftRemote(
    context.cycleId,
    context.subjectId,
    goals,
    currentVersion(context),
  )
  return mergeRemotePersonGoals(context.cycleId, context.subjectId, remote)
}

export async function copyPreviousGoals(
  context: GoalMutationContext,
): Promise<GoalsSnapshot> {
  if (useLocalGoals()) return delay(copyPreviousCycleGoals(context))
  const remote = await copyPreviousCycleGoalsRemote(
    context.cycleId,
    context.subjectId,
    currentVersion(context),
  )
  return mergeRemotePersonGoals(context.cycleId, context.subjectId, remote)
}

export async function cascadeGoalToReports(
  context: GoalMutationContext,
  goalId: string,
  reportIds: string[],
): Promise<GoalsSnapshot> {
  const snapshot = getGoalsSnapshot()
  if (useLocalGoals()) {
    const source = snapshot.byPerson[context.subjectId]?.goals.find(
      (goal) => goal.id === goalId,
    )
    const actor = snapshot.people.find((person) => person.id === context.actorId)
    if (!source || !actor) throw new Error('Goal or actor not found.')
    let next = snapshot
    for (const reportId of reportIds) {
      const row = next.byPerson[reportId]
      if (!row) continue
      const child = buildCascadedGoal(source, reportId, {
        sourceTitle: source.description || 'Untitled goal',
        sourcePersonName: actor.name,
      })
      next = savePersonGoals(
        { ...context, subjectId: reportId },
        [...row.goals, child],
      )
    }
    return delay(next)
  }

  const expectedVersions = Object.fromEntries(
    reportIds.map((reportId) => [
      reportId,
      snapshot.byPerson[reportId]?.version ?? 0,
    ]),
  )
  const submissions = await cascadeGoalRemote(
    context.cycleId,
    context.subjectId,
    goalId,
    reportIds,
    expectedVersions,
  )
  let next = snapshot
  for (const submission of submissions) {
    next = mergeRemotePersonGoals(
      context.cycleId,
      submission.personId,
      submission,
    )
  }
  return next
}

export async function submitGoals(
  context: GoalMutationContext,
  goals?: Goal[],
): Promise<GoalsSnapshot> {
  if (useLocalGoals()) {
    if (goals) savePersonGoals(context, goals)
    return delay(submitPersonGoals(context))
  }
  const remote = await submitPersonGoalsRemote(
    context.cycleId,
    context.subjectId,
    { goals, expectedVersion: currentVersion(context) },
  )
  return mergeRemotePersonGoals(context.cycleId, context.subjectId, remote)
}

export async function sendBackGoals(
  context: GoalMutationContext,
  reason: string,
): Promise<GoalsSnapshot> {
  if (useLocalGoals()) return delay(sendBackSubmission(context, reason))
  const remote = await sendBackPersonGoalsRemote(
    context.cycleId,
    context.subjectId,
    reason,
    currentVersion(context),
  )
  return mergeRemotePersonGoals(context.cycleId, context.subjectId, remote)
}

export async function approveGoals(
  context: GoalMutationContext,
  goals?: Goal[],
): Promise<GoalsSnapshot> {
  if (useLocalGoals()) return delay(approveSubmission(context, goals))
  const remote = await approvePersonGoalsRemote(
    context.cycleId,
    context.subjectId,
    goals,
    currentVersion(context),
  )
  return mergeRemotePersonGoals(context.cycleId, context.subjectId, remote)
}

export async function saveProgress(
  context: GoalMutationContext,
  goals: Goal[],
): Promise<GoalsSnapshot> {
  if (useLocalGoals()) return delay(updateGoalProgress(context, goals))
  const remote = await savePersonGoalsDraftRemote(
    context.cycleId,
    context.subjectId,
    goals,
    currentVersion(context),
  )
  return mergeRemotePersonGoals(context.cycleId, context.subjectId, remote)
}
