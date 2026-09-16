import { DEFAULT_CYCLE_SETTINGS } from "@/lib/reviews/demoData";
import type { DemoPerson, GoalsCycle, GoalsSnapshot, SubmissionStatus } from "./types";
import { listGoalCycleOptions, pickDefaultCycleId } from "./cyclesFromReviews";

/**
 * Internal placeholder when Reviews has no cycles. Never listed in
 * `availableCycles` — Goals UI treats an empty list as "no cycles yet".
 */
export const EMPTY_GOALS_CYCLE: GoalsCycle = {
  id: "",
  label: "",
  day1: "1970-01-01",
  phase: "closed",
  goalCountPolicy: { ...DEFAULT_CYCLE_SETTINGS.goalCountPolicy },
  postWindowGoalPolicy: "hard_stop",
};

export function createInitialSnapshot(): GoalsSnapshot {
  const options = listGoalCycleOptions({});
  const activeId = pickDefaultCycleId(options);
  const selected = options.find((c) => c.id === activeId) ?? options[0];

  if (!selected) {
    return {
      cycle: EMPTY_GOALS_CYCLE,
      cycleStatus: "previous",
      availableCycles: [],
      activePersonId: "",
      people: [],
      byPerson: {},
    };
  }

  return {
    cycle: {
      id: selected.id,
      label: selected.label,
      day1: selected.day1,
      quarterEndDate: selected.quarterEndDate,
      phase: selected.phase,
      goalCountPolicy: selected.goalCountPolicy,
      lateProgressUpdateDays: selected.lateProgressUpdateDays,
      postWindowGoalPolicy: selected.postWindowGoalPolicy,
      goalWindow: selected.goalWindow,
      goalExtensions: selected.goalExtensions,
    },
    cycleStatus: selected.status,
    availableCycles: options,
    activePersonId: "",
    people: [],
    byPerson: {},
  };
}

export type CycleEligibilityReason = "not_in_cycle" | "joined_after_day1";

export function cycleEligibility(
  person: DemoPerson,
  cycle: GoalsCycle,
): CycleEligibilityReason | null {
  if (cycle.assignedGroupId === null) return "not_in_cycle";
  if (person.joinDate > cycle.day1) return "joined_after_day1";
  return null;
}

export function cycleIneligibilityReason(
  person: DemoPerson,
  cycle: GoalsCycle,
  status?: SubmissionStatus,
): CycleEligibilityReason | null {
  return (
    cycleEligibility(person, cycle) ??
    (status === "not_eligible" ? "joined_after_day1" : null)
  );
}

export function isEligibleForCycle(
  person: DemoPerson,
  cycle: GoalsCycle,
): boolean {
  return cycleEligibility(person, cycle) === null;
}
