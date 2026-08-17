import { formatShortDate } from "@/lib/reviews/periods";
import { isGoalWindowOpenForPerson, resolveGoalDeadline } from "./goalExtensions";
import type {
  DemoPerson,
  GoalsCycle,
  GoalsCycleStatus,
  PersonGoals,
} from "./types";

/**
 * One-line explanation for a blocked goal edit. Mirrors the window and cycle
 * checks in `deriveGoalCapabilities`, so the UI never has to guess.
 */
export function describeGoalEditLock({
  cycle,
  cycleStatus,
  canUpdateProgress,
  status,
  postWindowApprovalStage,
  subject,
}: {
  cycle: GoalsCycle;
  cycleStatus: GoalsCycleStatus;
  canUpdateProgress: boolean;
  status?: PersonGoals["status"];
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"];
  subject?: DemoPerson;
}): string | null {
  const opensOn = cycle.goalWindow
    ? formatShortDate(cycle.goalWindow.startDate)
    : null;
  const effectiveDeadline = subject
    ? resolveGoalDeadline(cycle, subject)
    : cycle.goalWindow?.endDate;
  const closesOn = effectiveDeadline
    ? formatShortDate(effectiveDeadline)
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
    if (subject && isGoalWindowOpenForPerson(cycle, subject)) {
      return null;
    }
    if (cycle.postWindowGoalPolicy === "two_tier_approval") {
      const deadline = closesOn
        ? `The goal deadline passed ${closesOn}.`
        : "The goal deadline has passed.";
      if (status === "approved") {
        return `${deadline} Changes to approved goals require renewed direct manager and skip-level manager approval.`;
      }
      if (status === "submitted") {
        return postWindowApprovalStage === "manager_manager"
          ? `${deadline} This submission is awaiting final approval from the skip-level manager.`
          : `${deadline} This submission is awaiting direct manager approval.`;
      }
      if (status === "sent_back") {
        return `${deadline} This submission was sent back for changes and can be resubmitted for two-tier approval.`;
      }
      return `${deadline} Late submissions require direct manager and skip-level manager approval.`;
    }
    return closesOn
      ? `Goal editing closed ${closesOn}.${progressNote}`
      : `Goal editing is closed for ${cycle.label}.${progressNote}`;
  }

  if (cycle.phase === "check_in") {
    return `Goal details are locked during the performance review period.${progressNote}`;
  }

  return null;
}
