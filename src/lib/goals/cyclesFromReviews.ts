import { resolveCyclePolicyForPerson } from "@/lib/reviews/cycleGroups";
import {
  dayValue as toDay,
  todayDayValue as todayValue,
} from "@/lib/reviews/periods";
import { getReviewCycle, listReviewCycles } from "@/lib/reviews/store";
import { cycleStatusLabel } from "@/lib/reviews/status";
import type { ReviewCycle, ReviewCycleStatus } from "@/lib/reviews/types";
import type { DemoPhase, GoalsCycle, GoalsCycleOption } from "./types";

export { cycleStatusLabel };

function scheduledGoalPhase(cycle: ReviewCycle, today: Date): DemoPhase {
  const now = todayValue(today);
  const goalWindow = cycle.stagesConfig.goals.employee;
  const checkInStart = cycle.stagesConfig.performance.employeeStart.date;
  const checkInEnd = cycle.stagesConfig.performance.managerEnd.date;

  if (now < toDay(goalWindow.startDate)) return "not_open";
  if (now <= toDay(goalWindow.endDate)) return "window_open";
  if (now < toDay(checkInStart)) return "hard_lock";
  if (now <= toDay(checkInEnd)) return "check_in";
  return "closed";
}

export function resolveGoalPhase(
  cycle: ReviewCycle,
  _manualPhase: DemoPhase = "window_open",
  today = new Date(),
): DemoPhase {
  return scheduledGoalPhase(cycle, today);
}

/** Map a cycle into the Goals cycle shape (same identity). */
export function reviewCycleToGoalsCycle(
  cycle: ReviewCycle,
  manualPhase: DemoPhase = "window_open",
  today = new Date(),
  employeeId?: number | null,
): GoalsCycle {
  const policy = resolveCyclePolicyForPerson(cycle, employeeId);
  const resolved: ReviewCycle = {
    ...cycle,
    settings: policy.settings,
    stagesConfig: policy.stagesConfig,
    calibration: policy.calibration,
  };
  return {
    id: cycle.id,
    label: cycle.name,
    day1: cycle.startDate,
    phase:
      employeeId != null && !policy.groupId
        ? "not_open"
        : resolveGoalPhase(resolved, manualPhase, today),
    goalCountPolicy: policy.settings.goalCountPolicy,
    postWindowGoalPolicy: policy.settings.postWindowGoalPolicy,
    goalWindow: { ...policy.stagesConfig.goals.employee },
    goalExtensions: policy.groupId
      ? []
      : structuredClone(policy.stagesConfig.goals.extensions ?? []),
    assignedGroupId:
      employeeId == null ? undefined : policy.groupId,
  };
}

export function listGoalCycleOptions(
  phaseByCycle: Record<string, DemoPhase> = {},
  today = new Date(),
): GoalsCycleOption[] {
  return listReviewCycles().map((cycle) => ({
    ...reviewCycleToGoalsCycle(
      cycle,
      phaseByCycle[cycle.id] ?? "window_open",
      today,
    ),
    status: goalCycleStatus(cycle, today),
  }));
}

/** Prefer current → most recent previous → first available. */
export function pickDefaultCycleId(options: GoalsCycleOption[]): string | null {
  const current = options.find((c) => c.status === "current");
  if (current) return current.id;

  const previous = [...options]
    .filter((c) => c.status === "previous")
    .sort((a, b) => b.day1.localeCompare(a.day1))[0];
  if (previous) return previous.id;

  return options[0]?.id ?? null;
}

export function parseGoalsEmployeeId(
  personId?: string | number | null,
): number | undefined {
  if (personId == null || personId === "") return undefined;
  const employeeId = Number(personId);
  return Number.isInteger(employeeId) ? employeeId : undefined;
}

export function resolveGoalsCycle(
  cycleId: string,
  manualPhase: DemoPhase,
  today = new Date(),
  employeeId?: number | null,
): GoalsCycle | null {
  const review = getReviewCycle(cycleId);
  if (!review) return null;
  return reviewCycleToGoalsCycle(review, manualPhase, today, employeeId);
}

export function resolveGoalsCycleStatus(
  cycleId: string,
  today = new Date(),
): ReviewCycleStatus | null {
  const review = getReviewCycle(cycleId);
  if (!review) return null;
  return goalCycleStatus(review, today);
}

export function goalCycleStatus(
  review: ReviewCycle,
  today = new Date(),
): ReviewCycleStatus {
  const now = todayValue(today);
  const start = toDay(review.stagesConfig.goals.employee.startDate);
  const end = Math.max(
    toDay(review.endDate),
    toDay(review.stagesConfig.performance.employeeEnd.date),
    toDay(review.stagesConfig.performance.managerEnd.date),
  );
  if (now < start) return "future";
  if (now > end) return "previous";
  return "current";
}

export function getCurrentReviewCycleId(today = new Date()): string | null {
  const current = listReviewCycles().find(
    (cycle) => resolveGoalsCycleStatus(cycle.id, today) === "current",
  );
  return current?.id ?? null;
}
