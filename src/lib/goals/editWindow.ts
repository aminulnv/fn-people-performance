import { formatShortDate } from "@/lib/reviews/periods";
import { isGoalWindowOpenForPerson, resolveGoalDeadline } from "./goalExtensions";
import type {
  DemoPerson,
  GoalsCycle,
  GoalsCycleStatus,
  PersonGoals,
} from "./types";

export type GoalEditLockPersonSlot = "lineManager" | "skipLevelManager";
export type GoalEditLockSegment = string | GoalEditLockPersonSlot;

export type GoalEditLockNames = {
  lineManagerName?: string | null;
  skipLevelManagerName?: string | null;
};

export type DescribeGoalEditLockArgs = {
  cycle: GoalsCycle;
  cycleStatus: GoalsCycleStatus;
  canUpdateProgress: boolean;
  status?: PersonGoals["status"];
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"];
  subject?: DemoPerson;
} & GoalEditLockNames;

function twoTierSegments({
  deadline,
  status,
  postWindowApprovalStage,
  mentionSkipLevel,
}: {
  deadline: string;
  status?: PersonGoals["status"];
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"];
  mentionSkipLevel: boolean;
}): GoalEditLockSegment[] {
  const approvers: GoalEditLockSegment[] = mentionSkipLevel
    ? ["lineManager", " and ", "skipLevelManager"]
    : ["lineManager"];

  if (status === "approved") {
    return [
      `${deadline} Changes to approved goals require renewed approval from `,
      ...approvers,
      ".",
    ];
  }
  if (status === "submitted") {
    return postWindowApprovalStage === "manager_manager" && mentionSkipLevel
      ? [
          `${deadline} This submission is awaiting final approval from `,
          "skipLevelManager",
          ".",
        ]
      : [
          `${deadline} This submission is awaiting approval from `,
          "lineManager",
          ".",
        ];
  }
  if (status === "sent_back") {
    return [
      `${deadline} This submission was sent back for changes and can be resubmitted for two-tier approval.`,
    ];
  }
  return [
    `${deadline} Late submissions require approval from `,
    ...approvers,
    ".",
  ];
}

export function speakGoalEditLockSegments(
  segments: GoalEditLockSegment[],
  names: GoalEditLockNames = {},
): string {
  return segments
    .map((segment) => {
      if (segment === "lineManager") {
        return names.lineManagerName?.trim() || "the direct manager";
      }
      if (segment === "skipLevelManager") {
        return names.skipLevelManagerName?.trim() || "the skip-level manager";
      }
      return segment;
    })
    .join("");
}

/**
 * One-line explanation for a blocked goal edit. Mirrors the window and cycle
 * checks in `deriveGoalCapabilities`, so the UI never has to guess.
 */
export function goalEditLockSegments({
  cycle,
  cycleStatus,
  canUpdateProgress,
  status,
  postWindowApprovalStage,
  subject,
  skipLevelManagerName,
}: DescribeGoalEditLockArgs): GoalEditLockSegment[] | null {
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
  const mentionSkipLevel =
    skipLevelManagerName === undefined ? true : Boolean(skipLevelManagerName?.trim());

  if (cycleStatus === "future" || cycle.phase === "not_open") {
    return [
      opensOn
        ? `Goal editing opens ${opensOn} and closes ${closesOn}.`
        : `${cycle.label} has not opened for goal setting yet.`,
    ];
  }

  if (cycleStatus === "previous" || cycle.phase === "closed") {
    return [`${cycle.label} is closed, so goals are read-only.`];
  }

  if (cycle.phase === "hard_lock") {
    if (subject && isGoalWindowOpenForPerson(cycle, subject)) {
      return null;
    }
    if (cycle.postWindowGoalPolicy === "two_tier_approval") {
      const deadline = closesOn
        ? `The goal deadline passed ${closesOn}.`
        : "The goal deadline has passed.";
      return twoTierSegments({
        deadline,
        status,
        postWindowApprovalStage,
        mentionSkipLevel,
      });
    }
    return [
      closesOn
        ? `Goal editing closed ${closesOn}.${progressNote}`
        : `Goal editing is closed for ${cycle.label}.${progressNote}`,
    ];
  }

  if (cycle.phase === "check_in") {
    return [
      `Goal details are locked during the performance review period.${progressNote}`,
    ];
  }

  return null;
}

export function describeGoalEditLock(
  args: DescribeGoalEditLockArgs,
): string | null {
  const segments = goalEditLockSegments(args);
  if (!segments) return null;
  return speakGoalEditLockSegments(segments, args);
}
