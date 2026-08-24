import { ApiError } from '@/lib/apiClient'
import { isEligibleForCycle } from './goals/demoData'
import {
  getGoalsHydration,
  markCycleGoalsHydrated,
  markOwnGoalsHydrated,
} from './goals/hydration'
import {
  approvePersonGoalsRemote,
  cascadeGoalRemote,
  copyPreviousCycleGoalsRemote,
  fetchCycleGoalSubmissionsRemote,
  fetchPersonGoalsRemote,
  savePersonGoalsDraftRemote,
  sendBackPersonGoalsRemote,
  submitPersonGoalsRemote,
} from './goals/remoteApi'
import {
  approveSubmission,
  applyHardLockIncompletes,
  copyPreviousCycleGoals,
  getGoalsSnapshot,
  getGoalsSnapshotForCycle,
  getSignedInPersonId,
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
import {
  applyCascadeToLink,
  cascadeGoal as buildCascadedGoal,
  clearCascadeLink,
} from './goals/operations'
import type {
  DemoPhase,
  Goal,
  GoalsSnapshot,
  PersonGoals,
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
import { canSubmitGoals } from './goals/weightage'

export {
  allocatedWeightCaption,
  appendGoalWithWeight,
  canSubmitGoals,
  collectGoalSubmitBlockers,
  distributeGoalWeights,
  goalCompletion,
  isEvenGoalSplit,
  overallCompletion,
  remainingGoalWeight,
  removeGoalKeepingWeights,
  submitBlockersForGoal,
  isMeasureGoalIssue,
  measureIssueLabel,
  submitIssueForGoal,
  submitSetBlockers,
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

export function isGoalCycleHydrationPending(cycleId: string): boolean {
  return hydrationInFlight.has(cycleId)
}

async function hydrateOwnGoalsFirst(
  cycleId: string,
): Promise<GoalsSnapshot | null> {
  const personId = getSignedInPersonId()
  if (!personId || personId === 'local') return null
  try {
    const mine = await fetchPersonGoalsRemote(cycleId, personId)
    markOwnGoalsHydrated(cycleId)
    return mergeRemotePersonGoals(cycleId, personId, mine)
  } catch {
    return null
  }
}

async function hydrateGoalsFromApi(
  cycleId?: string,
  options?: { force?: boolean; activate?: boolean },
): Promise<GoalsSnapshot> {
  await ensureReviewCyclesLoaded()
  const snapshot = getGoalsSnapshot()
  const activeCycleId = cycleId ?? snapshot.cycle.id
  if (!activeCycleId) return snapshot
  const shouldActivate = options?.activate !== false
  const pending = hydrationInFlight.get(activeCycleId)
  if (pending && !options?.force) return pending
  if (!options?.force && getGoalsHydration(activeCycleId).cycleReady) {
    if (snapshot.cycle.id === activeCycleId) return snapshot
    return shouldActivate
      ? setActiveCycle(activeCycleId)
      : getGoalsSnapshotForCycle(activeCycleId)
  }
  const request = (async () => {
    const ownGoals = hydrateOwnGoalsFirst(activeCycleId)
    const cycleGoals = fetchCycleGoalSubmissionsRemote(activeCycleId)
    await ownGoals
    const submissions = await cycleGoals
    const next = replaceCycleGoalsFromRemote(activeCycleId, submissions, {
      activate: shouldActivate,
    })
    markCycleGoalsHydrated(activeCycleId)
    return next
  })().finally(() => {
    if (hydrationInFlight.get(activeCycleId) === request) {
      hydrationInFlight.delete(activeCycleId)
    }
  })
  hydrationInFlight.set(activeCycleId, request)
  return request
}

export async function fetchGoalsSnapshot(): Promise<GoalsSnapshot> {
  if (useLocalGoals()) {
    const snapshot = getGoalsSnapshot()
    markCycleGoalsHydrated(snapshot.cycle.id)
    return snapshot
  }
  return hydrateGoalsFromApi()
}

export async function selectDemoPerson(personId: string): Promise<GoalsSnapshot> {
  return delay(setActivePerson(personId))
}

export async function changeDemoPhase(phase: DemoPhase): Promise<GoalsSnapshot> {
  if (phase === 'hard_lock') return delay(applyHardLockIncompletes())
  return delay(setDemoPhase(phase))
}

/** Cycles available for goal setting and reviews. */
export function listGoalCycles() {
  return getGoalsSnapshot().availableCycles
}

export async function selectGoalCycle(cycleId: string): Promise<GoalsSnapshot> {
  if (useLocalGoals()) return delay(setActiveCycle(cycleId))
  await hydrateGoalsFromApi(cycleId)
  return getGoalsSnapshot().cycle.id === cycleId
    ? getGoalsSnapshot()
    : setActiveCycle(cycleId)
}

/** Load a cycle's goals without making it the active store cycle. */
export async function ensureGoalCycleHydrated(
  cycleId: string,
): Promise<GoalsSnapshot> {
  if (useLocalGoals()) {
    markCycleGoalsHydrated(cycleId)
    return getGoalsSnapshotForCycle(cycleId)
  }
  return hydrateGoalsFromApi(cycleId, { activate: false })
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

function isStaleGoalsConflict(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.message.includes('updated elsewhere')
  )
}

async function saveGoalsDraftWithRetry(
  context: GoalMutationContext,
  goals: Goal[],
): Promise<PersonGoals> {
  try {
    return await savePersonGoalsDraftRemote(
      context.cycleId,
      context.subjectId,
      goals,
      currentVersion(context),
    )
  } catch (error) {
    if (!isStaleGoalsConflict(error)) throw error
    await hydrateGoalsFromApi(context.cycleId, { force: true })
    return savePersonGoalsDraftRemote(
      context.cycleId,
      context.subjectId,
      goals,
      currentVersion(context),
    )
  }
}

export async function saveGoals(
  context: GoalMutationContext,
  goals: Goal[],
): Promise<GoalsSnapshot> {
  if (useLocalGoals()) return delay(savePersonGoals(context, goals))
  const remote = await saveGoalsDraftWithRetry(context, goals)
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
        sourceTitle: source.description.trim() || source.linkedGoalLabel || '',
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

export async function linkExistingGoalAsCascade(
  context: GoalMutationContext,
  sourceGoalId: string,
  child: { personId: string; goalId: string },
): Promise<GoalsSnapshot> {
  const snapshot = getGoalsSnapshot()
  const source = snapshot.byPerson[context.subjectId]?.goals.find(
    (goal) => goal.id === sourceGoalId,
  )
  const row = snapshot.byPerson[child.personId]
  const current = row?.goals.find((goal) => goal.id === child.goalId)
  if (!source || !row || !current) throw new Error('Goal not found.')
  return saveGoals(
    { ...context, subjectId: child.personId },
    row.goals.map((goal) =>
      goal.id === child.goalId ? applyCascadeToLink(goal, source) : goal,
    ),
  )
}

export async function unlinkCascadedGoal(
  context: GoalMutationContext,
  sourceGoalId: string,
  child: { personId: string; goalId: string },
): Promise<GoalsSnapshot> {
  const snapshot = getGoalsSnapshot()
  const row = snapshot.byPerson[child.personId]
  const current = row?.goals.find((goal) => goal.id === child.goalId)
  if (!row || !current || current.cascadedFromGoalId !== sourceGoalId) {
    throw new Error('Cascade link not found.')
  }
  return saveGoals(
    { ...context, subjectId: child.personId },
    row.goals.map((goal) =>
      goal.id === child.goalId ? clearCascadeLink(goal) : goal,
    ),
  )
}

export async function submitGoals(
  context: GoalMutationContext,
  goals?: Goal[],
): Promise<GoalsSnapshot> {
  const snapshot = getGoalsSnapshot()
  const toSubmit = goals ?? snapshot.byPerson[context.subjectId]?.goals ?? []
  const check = canSubmitGoals(toSubmit, snapshot.cycle.goalCountPolicy)
  if (!check.ok) {
    throw new Error(check.reasons[0] ?? 'These goals cannot be submitted yet.')
  }
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
  const remote = await saveGoalsDraftWithRetry(context, goals)
  return mergeRemotePersonGoals(context.cycleId, context.subjectId, remote)
}
