/** Which goal-cycle payloads have landed - empty local rows are not a real empty list. */

const ownReadyCycles = new Set<string>()
const cycleReadyCycles = new Set<string>()
/** Single-person scorecard hydrates — keyed `cycleId:personId`. */
const personReadyKeys = new Set<string>()
const listeners = new Set<() => void>()

export type GoalsHydration = {
  ownReady: boolean
  cycleReady: boolean
}

function emit() {
  for (const listener of listeners) listener()
}

function personKey(cycleId: string, personId: string) {
  return `${cycleId}:${personId}`
}

export function getGoalsHydration(cycleId: string): GoalsHydration {
  if (!cycleId) return { ownReady: false, cycleReady: false }
  return {
    ownReady: ownReadyCycles.has(cycleId) || cycleReadyCycles.has(cycleId),
    cycleReady: cycleReadyCycles.has(cycleId),
  }
}

export function isPersonGoalsHydrated(
  cycleId: string,
  personId: string | number,
): boolean {
  if (!cycleId || personId == null || String(personId) === '') return false
  if (cycleReadyCycles.has(cycleId)) return true
  return personReadyKeys.has(personKey(cycleId, String(personId)))
}

export function markPersonGoalsHydrated(
  cycleId: string,
  personId: string | number,
): void {
  if (!cycleId || personId == null || String(personId) === '') return
  personReadyKeys.add(personKey(cycleId, String(personId)))
}

export function markOwnGoalsHydrated(cycleId: string): void {
  if (!cycleId || ownReadyCycles.has(cycleId)) return
  ownReadyCycles.add(cycleId)
  emit()
}

/** Cycles already pulled from the API - live refresh only reloads these. */
export function listHydratedGoalCycleIds(): string[] {
  return [...cycleReadyCycles]
}

export function markCycleGoalsHydrated(cycleId: string): void {
  if (!cycleId) return
  const already = cycleReadyCycles.has(cycleId)
  cycleReadyCycles.add(cycleId)
  ownReadyCycles.add(cycleId)
  if (!already) emit()
}

export function subscribeGoalsHydration(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function resetGoalsHydrationForTests(): void {
  ownReadyCycles.clear()
  cycleReadyCycles.clear()
  personReadyKeys.clear()
}
