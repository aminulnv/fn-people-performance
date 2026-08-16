import { formatShortDate } from "@/lib/reviews/periods";
import type { GoalsCycle, GoalsCycleStatus } from "./types";

/**
 * One-line explanation for a blocked goal edit. Mirrors the window and cycle
 * checks in `deriveGoalCapabilities`, so the UI never has to guess.
 */
export function describeGoalEditLock({
  cycle,
  cycleStatus,
  canUpdateProgress,
}: {
  cycle: GoalsCycle;
  cycleStatus: GoalsCycleStatus;
  canUpdateProgress: boolean;
}): string | null {
  const opensOn = cycle.goalWindow
    ? formatShortDate(cycle.goalWindow.startDate)
    : null;
  const closesOn = cycle.goalWindow
    ? formatShortDate(cycle.goalWindow.endDate)
    : null;
  const progressNote = canUpdateProgress
    ? " Progress updates are still allowed."
    : "";

  if (cycleStatus === "future" || cycle.phase === "not_open") {
    return opensOn
      ? `Goal editing opens ${opensOn} and closes ${closesOn}.`
      : `${cycle.label} has not opened for goal setting yet.`;
  }

  if (cycleStatus === "previous" || cycle.phase === "closed") {
    return `${cycle.label} is closed, so goals are read-only.`;
  }

  if (cycle.phase === "hard_lock") {
    if (cycle.postWindowGoalPolicy === "two_tier_approval") {
      return closesOn
        ? `The goal deadline passed ${closesOn}. You can still submit goals for direct manager and skip-level manager approval.`
        : `The goal deadline has passed. You can still submit goals for two-tier approval.`;
    }
    return closesOn
      ? `Goal editing closed ${closesOn}.${progressNote}`
      : `Goal editing is closed for ${cycle.label}.${progressNote}`;
  }

  if (cycle.phase === "check_in") {
    return `Goal details are locked during the check-in period.${progressNote}`;
  }

  return null;
}
