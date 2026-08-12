import type { DemoPerson, GoalsCycle, GoalsSnapshot } from './types'

/** Quarters available in the cycle picker. */
export const DEMO_CYCLES: GoalsCycle[] = [
  {
    id: 'q1-2026',
    label: 'Q1 2026',
    day1: '2026-01-01',
    phase: 'window_open',
  },
  {
    id: 'q2-2026',
    label: 'Q2 2026',
    day1: '2026-04-01',
    phase: 'window_open',
  },
  {
    id: 'q3-2026',
    label: 'Q3 2026',
    day1: '2026-07-01',
    phase: 'window_open',
  },
  {
    id: 'q4-2026',
    label: 'Q4 2026',
    day1: '2026-10-01',
    phase: 'window_open',
  },
]

/** Active demo quarter (Q2). */
export const DEMO_CYCLE: GoalsCycle =
  DEMO_CYCLES.find((c) => c.id === 'q2-2026') ?? DEMO_CYCLES[1]

export const CURRENT_CYCLE_ID = DEMO_CYCLE.id

/** Goals people come from the People directory (Create employee), not a demo roster. */
export function createInitialSnapshot(): GoalsSnapshot {
  return {
    cycle: { ...DEMO_CYCLE },
    activePersonId: '',
    people: [],
    byPerson: {},
  }
}

export function isEligibleForCycle(
  person: DemoPerson,
  cycle: GoalsCycle,
): boolean {
  return person.joinDate <= cycle.day1
}
