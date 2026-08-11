import {
  createInitialSnapshot,
  DEMO_CYCLES,
  isEligibleForCycle,
} from './demoData'
import type {
  DemoPhase,
  Goal,
  GoalsSnapshot,
  QuarterRating,
} from './types'
import { canSubmitGoals } from './weightage'

const STORAGE_KEY = 'pd-goals-demo-v3'

let memory: GoalsSnapshot | null = null
const listeners = new Set<() => void>()

function clone<T>(value: T): T {
  return structuredClone(value)
}

function readStorage(): GoalsSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GoalsSnapshot
  } catch {
    return null
  }
}

function writeStorage(snapshot: GoalsSnapshot): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    /* ignore quota */
  }
}

function getState(): GoalsSnapshot {
  if (!memory) {
    memory = readStorage() ?? createInitialSnapshot()
  }
  return memory
}

function commit(next: GoalsSnapshot): GoalsSnapshot {
  memory = next
  writeStorage(next)
  listeners.forEach((l) => l())
  return clone(next)
}

export function subscribeGoalsStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getGoalsSnapshot(): GoalsSnapshot {
  return clone(getState())
}

export function resetGoalsDemo(): GoalsSnapshot {
  return commit(createInitialSnapshot())
}

export function setActivePerson(personId: string): GoalsSnapshot {
  const state = getState()
  if (!state.people.some((p) => p.id === personId)) return clone(state)
  return commit({ ...state, activePersonId: personId })
}

export function setDemoPhase(phase: DemoPhase): GoalsSnapshot {
  const state = getState()
  return commit({
    ...state,
    cycle: { ...state.cycle, phase },
  })
}

/** Switch the active demo quarter; keeps the current lifecycle phase. */
export function setActiveCycle(cycleId: string): GoalsSnapshot {
  const state = getState()
  const next = DEMO_CYCLES.find((c) => c.id === cycleId)
  if (!next || next.id === state.cycle.id) return clone(state)
  return commit({
    ...state,
    cycle: { ...next, phase: state.cycle.phase },
  })
}

export function savePersonGoals(
  personId: string,
  goals: Goal[],
): GoalsSnapshot {
  const state = getState()
  const current = state.byPerson[personId]
  if (!current) return clone(state)
  if (current.status !== 'draft' && current.status !== 'sent_back') {
    return clone(state)
  }
  return commit({
    ...state,
    byPerson: {
      ...state.byPerson,
      [personId]: { ...current, goals: clone(goals) },
    },
  })
}

export function submitPersonGoals(personId: string): GoalsSnapshot {
  const state = getState()
  const person = state.people.find((p) => p.id === personId)
  const current = state.byPerson[personId]
  if (!person || !current) return clone(state)
  if (!isEligibleForCycle(person, state.cycle)) {
    return commit({
      ...state,
      byPerson: {
        ...state.byPerson,
        [personId]: { ...current, status: 'not_eligible', goals: [] },
      },
    })
  }
  if (state.cycle.phase === 'hard_lock' || state.cycle.phase === 'check_in') {
    throw new Error('Goal window is locked. New submits are not allowed.')
  }
  if (current.status !== 'draft' && current.status !== 'sent_back') {
    throw new Error('Goals are not in a submittable state.')
  }
  const check = canSubmitGoals(current.goals)
  if (!check.ok) throw new Error(check.reasons[0] ?? 'Cannot submit.')
  return commit({
    ...state,
    byPerson: {
      ...state.byPerson,
      [personId]: {
        ...current,
        status: 'submitted',
        sendBackReason: undefined,
      },
    },
  })
}

export function sendBackSubmission(
  personId: string,
  reason: string,
): GoalsSnapshot {
  const state = getState()
  const current = state.byPerson[personId]
  if (!current || current.status !== 'submitted') return clone(state)
  return commit({
    ...state,
    byPerson: {
      ...state.byPerson,
      [personId]: {
        ...current,
        status: 'sent_back',
        sendBackReason: reason.trim() || 'Please revise and resubmit.',
      },
    },
  })
}

export function approveSubmission(
  personId: string,
  goals?: Goal[],
): GoalsSnapshot {
  const state = getState()
  const current = state.byPerson[personId]
  if (!current || current.status !== 'submitted') return clone(state)
  return commit({
    ...state,
    byPerson: {
      ...state.byPerson,
      [personId]: {
        ...current,
        status: 'approved',
        goals: clone(goals ?? current.goals),
        sendBackReason: undefined,
        managerNote: 'Approved',
      },
    },
  })
}

export function updateApprovedProgress(
  personId: string,
  goals: Goal[],
): GoalsSnapshot {
  const state = getState()
  const current = state.byPerson[personId]
  if (!current || current.status !== 'approved') return clone(state)
  return commit({
    ...state,
    byPerson: {
      ...state.byPerson,
      [personId]: { ...current, goals: clone(goals) },
    },
  })
}

export function submitQuarterRating(
  personId: string,
  rating: Omit<QuarterRating, 'submittedAt'>,
): GoalsSnapshot {
  const state = getState()
  const current = state.byPerson[personId]
  if (!current || current.status !== 'approved') {
    throw new Error('Only approved goals can be rated.')
  }
  if (state.cycle.phase !== 'check_in') {
    throw new Error('Check-in is not open yet. Switch demo phase to Check-in.')
  }
  return commit({
    ...state,
    byPerson: {
      ...state.byPerson,
      [personId]: {
        ...current,
        rating: {
          ...rating,
          submittedAt: new Date().toISOString(),
        },
      },
    },
  })
}

/** Mark incomplete when hard lock hits and still draft (demo helper). */
export function applyHardLockIncompletes(): GoalsSnapshot {
  const state = getState()
  const byPerson = { ...state.byPerson }
  for (const person of state.people) {
    const row = byPerson[person.id]
    if (!row) continue
    if (row.status === 'draft' || row.status === 'sent_back') {
      if (isEligibleForCycle(person, state.cycle)) {
        byPerson[person.id] = { ...row, status: 'incomplete' }
      }
    }
  }
  return commit({
    ...state,
    cycle: { ...state.cycle, phase: 'hard_lock' },
    byPerson,
  })
}
