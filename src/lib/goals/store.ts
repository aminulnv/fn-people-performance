import { subscribeEmployeesStore } from '@/lib/employees/store'
import {
  subscribeReviewsStore,
} from '@/lib/reviews/store'
import {
  listGoalCycleOptions,
  pickDefaultCycleId,
  resolveGoalsCycle,
  resolveGoalsCycleStatus,
} from './cyclesFromReviews'
import {
  createInitialSnapshot,
  FALLBACK_CYCLE,
  isEligibleForCycle,
} from './demoData'
import { hasStructuralGoalChanges } from './goalChanges'
import { emptyPersonGoals, mergePeopleIntoGoalsState } from './peopleFromEmployees'
import {
  deriveGoalCapabilities,
  isDirectManager,
} from './permissions'
import type {
  DemoPhase,
  Goal,
  GoalsCycleOption,
  GoalsSnapshot,
  PersonGoals,
  QuarterRating,
} from './types'
import { canSubmitGoals } from './weightage'

/** Explicit cycle + actor so UI shells cannot mutate the wrong person or cycle. */
export type GoalMutationContext = {
  cycleId: string
  actorId: string
  subjectId: string
}

/** v12: reports of the signed-in person now seed as pending approval. */
const STORAGE_KEY = 'pd-goals-demo-v12'
/** Skip v9 so uniform “all approved” demo rows are not carried over. */
const LEGACY_STORAGE_KEY = 'pd-goals-demo-v8'
const OLDER_STORAGE_KEY = 'pd-goals-demo-v7'

type GoalsPersisted = {
  activeCycleId: string
  activePersonId: string
  phaseByCycle: Record<string, DemoPhase>
  byCycle: Record<string, Record<string, PersonGoals>>
}

let memory: GoalsPersisted | null = null
const listeners = new Set<() => void>()
let bridgesReady = false
/** Pushed in by the auth layer — goals must not depend on auth. */
let signedInPersonId = ''

function clone<T>(value: T): T {
  return structuredClone(value)
}

function readRaw(key: string): unknown | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function writeStorage(state: GoalsPersisted): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

function isPersisted(value: unknown): value is GoalsPersisted {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.activeCycleId === 'string' &&
    typeof v.activePersonId === 'string' &&
    typeof v.phaseByCycle === 'object' &&
    v.phaseByCycle != null &&
    typeof v.byCycle === 'object' &&
    v.byCycle != null
  )
}

/** Migrate v7 flat snapshot → per-cycle persistence. */
function migrateLegacy(value: unknown): GoalsPersisted | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const cycle = v.cycle as { id?: string; phase?: DemoPhase } | undefined
  const byPerson = v.byPerson as Record<string, PersonGoals> | undefined
  if (!cycle?.id || !byPerson) return null
  return {
    activeCycleId: cycle.id,
    activePersonId:
      typeof v.activePersonId === 'string' ? v.activePersonId : '',
    phaseByCycle: { [cycle.id]: cycle.phase ?? 'window_open' },
    byCycle: { [cycle.id]: byPerson },
  }
}

function withoutEmptyDemoRows(state: GoalsPersisted): GoalsPersisted {
  const byCycle: GoalsPersisted['byCycle'] = {}
  for (const [cycleId, rows] of Object.entries(state.byCycle)) {
    byCycle[cycleId] = Object.fromEntries(
      Object.entries(rows).filter(([, row]) => {
        return row.goals.length > 0 || row.status !== 'draft'
      }),
    )
  }
  return { ...state, byCycle }
}

function createInitialPersisted(): GoalsPersisted {
  const options = listGoalCycleOptions({})
  const activeCycleId =
    pickDefaultCycleId(options) ?? FALLBACK_CYCLE.id
  return {
    activeCycleId,
    activePersonId: '',
    phaseByCycle: { [activeCycleId]: 'window_open' },
    byCycle: {},
  }
}

function ensureBridges() {
  if (bridgesReady) return
  bridgesReady = true
  subscribeEmployeesStore(() => {
    notify()
  })
  subscribeReviewsStore(() => {
    if (!memory) return
    const options = listGoalCycleOptions(memory.phaseByCycle)
    if (options.length === 0) {
      notify()
      return
    }
    if (!options.some((c) => c.id === memory!.activeCycleId)) {
      const nextId = pickDefaultCycleId(options)
      if (nextId) {
        memory = { ...memory, activeCycleId: nextId }
        writeStorage(memory)
      }
    }
    notify()
  })
}

function getPersisted(): GoalsPersisted {
  ensureBridges()
  if (!memory) {
    const fresh = readRaw(STORAGE_KEY)
    if (isPersisted(fresh)) {
      memory = fresh
    } else {
      const v8 = readRaw(LEGACY_STORAGE_KEY)
      const legacy = isPersisted(v8)
        ? withoutEmptyDemoRows(v8)
        : migrateLegacy(readRaw(OLDER_STORAGE_KEY))
      memory = legacy ?? createInitialPersisted()
      writeStorage(memory)
    }
  }
  return memory
}

function notify(): void {
  listeners.forEach((l) => l())
}

function commit(next: GoalsPersisted): GoalsSnapshot {
  memory = next
  writeStorage(next)
  notify()
  return projectSnapshot(next)
}

function phaseFor(state: GoalsPersisted, cycleId: string): DemoPhase {
  return state.phaseByCycle[cycleId] ?? 'window_open'
}

function ensureCycleBucket(
  state: GoalsPersisted,
  cycleId: string,
): Record<string, PersonGoals> {
  return state.byCycle[cycleId] ?? {}
}

function projectSnapshot(state: GoalsPersisted): GoalsSnapshot {
  const options = listGoalCycleOptions(state.phaseByCycle)
  let activeCycleId = state.activeCycleId

  if (options.length > 0 && !options.some((c) => c.id === activeCycleId)) {
    activeCycleId = pickDefaultCycleId(options) ?? options[0].id
  }

  const phase = phaseFor(state, activeCycleId)
  const fromReviews = resolveGoalsCycle(activeCycleId, phase)
  const option = options.find((c) => c.id === activeCycleId)

  const cycle = fromReviews ??
    option ?? {
      ...FALLBACK_CYCLE,
      phase,
    }

  const cycleStatus =
    resolveGoalsCycleStatus(cycle.id) ??
    option?.status ??
    'previous'

  const availableCycles: GoalsCycleOption[] =
    options.length > 0
      ? options
      : [{ ...cycle, status: cycleStatus }]

  const bucket = ensureCycleBucket(state, cycle.id)
  const merged = mergePeopleIntoGoalsState({
    cycleId: cycle.id,
    byPerson: bucket,
    activePersonId: state.activePersonId,
    signedInPersonId,
  })

  return {
    cycle: {
      id: cycle.id,
      label: cycle.label,
      day1: cycle.day1,
      phase,
    },
    cycleStatus,
    availableCycles,
    activePersonId: merged.activePersonId,
    people: merged.people,
    byPerson: merged.byPerson,
  }
}

export function subscribeGoalsStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getGoalsSnapshot(): GoalsSnapshot {
  return clone(projectSnapshot(getPersisted()))
}

export function getGoalsSnapshotForCycle(cycleId: string): GoalsSnapshot {
  const state = getPersisted()
  const options = listGoalCycleOptions(state.phaseByCycle)
  if (!options.some((cycle) => cycle.id === cycleId)) {
    return clone(projectSnapshot(state))
  }
  return clone(projectSnapshot({ ...state, activeCycleId: cycleId }))
}

export function resetGoalsDemo(): GoalsSnapshot {
  return commit(createInitialPersisted())
}

/** The signed-in person seeds in draft so goal setting stays reachable in demo data. */
export function setSignedInPerson(personId: string): void {
  if (signedInPersonId === personId) return
  signedInPersonId = personId
  notify()
}

export function setActivePerson(personId: string): GoalsSnapshot {
  const state = getPersisted()
  if (!personId) return projectSnapshot(state)
  const snap = projectSnapshot(state)
  if (!snap.people.some((p) => p.id === personId)) {
    return clone(snap)
  }
  return commit({ ...state, activePersonId: personId })
}

export function setDemoPhase(phase: DemoPhase): GoalsSnapshot {
  const state = getPersisted()
  return commit({
    ...state,
    phaseByCycle: {
      ...state.phaseByCycle,
      [state.activeCycleId]: phase,
    },
  })
}

/** Switch the active review/goal cycle; goals are scoped per cycle. */
export function setActiveCycle(cycleId: string): GoalsSnapshot {
  const state = getPersisted()
  const options = listGoalCycleOptions(state.phaseByCycle)
  const next = options.find((c) => c.id === cycleId)
  if (!next || next.id === state.activeCycleId) {
    return clone(projectSnapshot(state))
  }
  return commit({
    ...state,
    activeCycleId: next.id,
    phaseByCycle: {
      ...state.phaseByCycle,
      [next.id]: state.phaseByCycle[next.id] ?? next.phase,
    },
  })
}

function updatePersonGoals(
  cycleId: string,
  personId: string,
  updater: (current: PersonGoals) => PersonGoals | null,
): GoalsSnapshot {
  const state = getPersisted()
  const snap = projectSnapshot({ ...state, activeCycleId: cycleId })
  if (snap.cycle.id !== cycleId) {
    throw new Error('Unknown goal cycle.')
  }
  const bucket = { ...ensureCycleBucket(state, cycleId) }
  for (const person of snap.people) {
    if (!bucket[person.id]) {
      bucket[person.id] = snap.byPerson[person.id] ?? emptyPersonGoals(person.id)
    }
  }
  const current = bucket[personId]
  if (!current) return clone(snap)
  const updated = updater(current)
  if (!updated) return clone(snap)
  bucket[personId] = updated
  return commit({
    ...state,
    activeCycleId: cycleId,
    activePersonId: state.activePersonId,
    byCycle: { ...state.byCycle, [cycleId]: bucket },
  })
}

function requireMutationActors(context: GoalMutationContext): {
  snap: GoalsSnapshot
  actor: NonNullable<GoalsSnapshot['people'][number]>
  subject: NonNullable<GoalsSnapshot['people'][number]>
  row: PersonGoals
} {
  const snap = getGoalsSnapshotForCycle(context.cycleId)
  if (snap.cycle.id !== context.cycleId) {
    throw new Error('Unknown goal cycle.')
  }
  const actor = snap.people.find((person) => person.id === context.actorId)
  const subject = snap.people.find((person) => person.id === context.subjectId)
  const row = snap.byPerson[context.subjectId]
  if (!actor || !subject || !row) {
    throw new Error('Unknown actor or subject for this goal action.')
  }
  return { snap, actor, subject, row }
}

function capabilitiesFor(context: GoalMutationContext) {
  const { snap, actor, subject, row } = requireMutationActors(context)
  return {
    snap,
    actor,
    subject,
    row,
    capabilities: deriveGoalCapabilities({
      actor,
      subject,
      row,
      cycle: snap.cycle,
      cycleStatus: snap.cycleStatus,
    }),
  }
}

export function savePersonGoals(
  context: GoalMutationContext,
  goals: Goal[],
): GoalsSnapshot {
  const { capabilities } = capabilitiesFor(context)
  if (!capabilities.canEditStructure) {
    throw new Error('You do not have permission to edit these goals.')
  }
  return updatePersonGoals(context.cycleId, context.subjectId, (current) => {
    if (
      current.status !== 'draft' &&
      current.status !== 'sent_back' &&
      current.status !== 'submitted' &&
      current.status !== 'approved'
    ) {
      return null
    }
    if (
      current.status === 'approved' &&
      hasStructuralGoalChanges(current.goals, goals)
    ) {
      return {
        ...current,
        status: 'submitted',
        goals: clone(goals),
        managerNote: undefined,
        rating: undefined,
      }
    }
    return { ...current, goals: clone(goals) }
  })
}

export function submitPersonGoals(context: GoalMutationContext): GoalsSnapshot {
  const { snap, subject, row, capabilities } = capabilitiesFor(context)
  if (!capabilities.canSubmit) {
    throw new Error('You do not have permission to submit these goals.')
  }

  if (!isEligibleForCycle(subject, snap.cycle)) {
    return updatePersonGoals(context.cycleId, context.subjectId, (current) => ({
      ...current,
      status: 'not_eligible',
      goals: [],
    }))
  }
  if (snap.cycle.phase === 'hard_lock' || snap.cycle.phase === 'check_in') {
    throw new Error('Goal window is locked. New submits are not allowed.')
  }
  if (row.status !== 'draft' && row.status !== 'sent_back') {
    throw new Error('Goals are not in a submittable state.')
  }
  const check = canSubmitGoals(row.goals)
  if (!check.ok) throw new Error(check.reasons[0] ?? 'Cannot submit.')

  return updatePersonGoals(context.cycleId, context.subjectId, (current) => ({
    ...current,
    status: 'submitted',
    sendBackReason: undefined,
  }))
}

export function sendBackSubmission(
  context: GoalMutationContext,
  reason: string,
): GoalsSnapshot {
  const { capabilities } = capabilitiesFor(context)
  if (!capabilities.canSendBack) {
    throw new Error('You do not have permission to send these goals back.')
  }
  return updatePersonGoals(context.cycleId, context.subjectId, (current) => {
    if (current.status !== 'submitted' && current.status !== 'approved') {
      return null
    }
    return {
      ...current,
      status: 'sent_back',
      sendBackReason: reason.trim() || 'Please revise and resubmit.',
      managerNote: undefined,
      rating: undefined,
    }
  })
}

export function approveSubmission(
  context: GoalMutationContext,
  goals?: Goal[],
): GoalsSnapshot {
  const { capabilities } = capabilitiesFor(context)
  if (!capabilities.canApprove) {
    throw new Error('You do not have permission to approve these goals.')
  }
  return updatePersonGoals(context.cycleId, context.subjectId, (current) => {
    if (current.status !== 'submitted') return null
    return {
      ...current,
      status: 'approved',
      goals: clone(goals ?? current.goals),
      sendBackReason: undefined,
      managerNote: 'Approved',
    }
  })
}

export function updateGoalProgress(
  context: GoalMutationContext,
  goals: Goal[],
): GoalsSnapshot {
  const { capabilities } = capabilitiesFor(context)
  if (!capabilities.canUpdateProgress) {
    throw new Error('You do not have permission to update progress.')
  }
  return updatePersonGoals(context.cycleId, context.subjectId, (current) => {
    if (
      current.status !== 'draft' &&
      current.status !== 'sent_back' &&
      current.status !== 'submitted' &&
      current.status !== 'approved'
    ) {
      throw new Error('Progress cannot be updated for these goals.')
    }
    if (hasStructuralGoalChanges(current.goals, goals)) {
      throw new Error('Structural goal changes must use the goal editor.')
    }
    return { ...current, goals: clone(goals) }
  })
}

export function submitQuarterRating(
  context: GoalMutationContext,
  rating: Omit<QuarterRating, 'submittedAt'>,
): GoalsSnapshot {
  const { snap, capabilities } = capabilitiesFor(context)
  if (!capabilities.canRate) {
    throw new Error('You do not have permission to rate these goals.')
  }
  if (snap.cycle.phase !== 'check_in') {
    throw new Error('Check-in is not open yet. Switch demo phase to Check-in.')
  }
  return updatePersonGoals(context.cycleId, context.subjectId, (current) => {
    if (current.status !== 'approved') {
      throw new Error('Only approved goals can be rated.')
    }
    return {
      ...current,
      rating: {
        ...rating,
        submittedAt: new Date().toISOString(),
      },
    }
  })
}

/** Mark incomplete when hard lock hits and still draft (demo helper). */
export function applyHardLockIncompletes(): GoalsSnapshot {
  const state = getPersisted()
  const snap = projectSnapshot(state)
  const cycleId = snap.cycle.id
  const bucket = { ...ensureCycleBucket(state, cycleId) }

  for (const person of snap.people) {
    const row = snap.byPerson[person.id] ?? emptyPersonGoals(person.id)
    bucket[person.id] = row
    if (row.status === 'draft' || row.status === 'sent_back') {
      if (isEligibleForCycle(person, snap.cycle)) {
        bucket[person.id] = { ...row, status: 'incomplete' }
      }
    }
  }

  return commit({
    ...state,
    activeCycleId: cycleId,
    phaseByCycle: {
      ...state.phaseByCycle,
      [cycleId]: 'hard_lock',
    },
    byCycle: { ...state.byCycle, [cycleId]: bucket },
  })
}

export function assertIsDirectManager(
  actorId: string,
  subjectId: string,
): boolean {
  const snap = getGoalsSnapshot()
  const actor = snap.people.find((person) => person.id === actorId)
  const subject = snap.people.find((person) => person.id === subjectId)
  if (!actor || !subject) return false
  return isDirectManager(actor, subject)
}

/** Re-export for callers that still build an empty shell. */
export { createInitialSnapshot }
