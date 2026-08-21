import { DEFAULT_CYCLE_SETTINGS } from "@/lib/reviews/demoData";
import type { DemoPerson, GoalsCycle, GoalsSnapshot } from "./types";
import { listGoalCycleOptions, pickDefaultCycleId } from "./cyclesFromReviews";

/**
 * Fallback when Reviews has no cycles yet — Goals still needs a shape.
 * Prefer real cycles via cyclesFromReviews.
 */
export const FALLBACK_CYCLE: GoalsCycle = {
  id: "q3-2026",
  label: "Q3 2026",
  day1: "2026-07-01",
  phase: "window_open",
  goalCountPolicy: { ...DEFAULT_CYCLE_SETTINGS.goalCountPolicy },
  postWindowGoalPolicy: DEFAULT_CYCLE_SETTINGS.postWindowGoalPolicy,
};

/** @deprecated Use cycles — kept for migration of old session data. */
export const DEMO_CYCLES: GoalsCycle[] = [FALLBACK_CYCLE];

export const DEMO_CYCLE: GoalsCycle = FALLBACK_CYCLE;

/** Active calendar “current” quarter id when Reviews is empty. */
export const CURRENT_CYCLE_ID = FALLBACK_CYCLE.id;

/** Goals people come from the People directory (Create employee), not a demo roster. */
export function createInitialSnapshot(): GoalsSnapshot {
  const options = listGoalCycleOptions({});
  const activeId = pickDefaultCycleId(options);
  const selected =
    options.find((c) => c.id === activeId) ??
    (options[0]
      ? options[0]
      : { ...FALLBACK_CYCLE, status: "previous" as const });

  return {
    cycle: {
      id: selected.id,
      label: selected.label,
      day1: selected.day1,
      phase: selected.phase,
      goalCountPolicy: selected.goalCountPolicy,
      postWindowGoalPolicy: selected.postWindowGoalPolicy,
      goalWindow: selected.goalWindow,
      goalExtensions: selected.goalExtensions,
    },
    cycleStatus: selected.status,
    availableCycles: options.length > 0 ? options : [selected],
    activePersonId: "",
    people: [],
    byPerson: {},
  };
}

export function isEligibleForCycle(
  person: DemoPerson,
  cycle: GoalsCycle,
): boolean {
  if (cycle.assignedGroupId === null) return false;
  return person.joinDate <= cycle.day1;
}
