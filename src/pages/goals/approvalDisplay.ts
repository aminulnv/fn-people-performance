import type { LineManagerCascade } from "@/lib/goals/operations";
import type { PersonGoals, SubmissionStatus } from "@/lib/goals/types";
import { statusLabel, submissionStatusLabel } from "./statusLabels";

export type ApprovalPerson = {
  name: string;
  avatarUrl?: string;
};

export function approvalCopy(
  status: SubmissionStatus,
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"],
): {
  title: string;
  sub: string;
  personPrefix: string;
  tone: "ok" | "pending" | "draft";
} {
  if (status === "approved") {
    return {
      title: "Approved",
      sub: "Approval complete",
      personPrefix: "by",
      tone: "ok",
    };
  }
  if (status === "submitted") {
    return {
      title:
        postWindowApprovalStage === "manager_manager"
          ? "Pending final approval"
          : "Pending approval",
      sub:
        postWindowApprovalStage === "manager_manager"
          ? "Waiting on skip-level manager"
          : "Waiting on manager",
      personPrefix: "by",
      tone: "pending",
    };
  }
  if (status === "sent_back") {
    return {
      title: "Sent back",
      sub: "Needs changes",
      personPrefix: "by",
      tone: "pending",
    };
  }
  return {
    title: statusLabel(status),
    sub: "Not submitted yet",
    personPrefix: "by",
    tone: "draft",
  };
}

/** Who the approval card should name — skip-level when that stage is pending. */
export function resolveApprovalPerson({
  status,
  postWindowApprovalStage,
  sendBackBy,
  approvedBy,
  cascadeFrom,
}: {
  status: SubmissionStatus;
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"];
  sendBackBy?: ApprovalPerson | null;
  approvedBy?: ApprovalPerson | null;
  cascadeFrom: LineManagerCascade;
}): ApprovalPerson | null {
  if (sendBackBy) return sendBackBy;
  if (status === "approved" && approvedBy) return approvedBy;
  const approval = approvalCopy(status, postWindowApprovalStage);
  if (approval.tone === "draft") return null;
  if (
    status === "submitted" &&
    postWindowApprovalStage === "manager_manager" &&
    cascadeFrom.skipLevelManagerName
  ) {
    return {
      name: cascadeFrom.skipLevelManagerName,
      avatarUrl: cascadeFrom.skipLevelManagerAvatarUrl,
    };
  }
  if (!cascadeFrom.managerName) return null;
  return {
    name: cascadeFrom.managerName,
    avatarUrl: cascadeFrom.managerAvatarUrl,
  };
}

export function goalCountLabel(goalCount: number): string {
  return `${goalCount} goal${goalCount === 1 ? "" : "s"}`;
}

/** Chip label for a person's goal batch — status only, no count. */
export function batchStatusLabel(
  status: SubmissionStatus,
  goalCount: number,
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"],
): string {
  if (status === "submitted" && postWindowApprovalStage === "manager_manager") {
    return "Pending final approval";
  }
  return submissionStatusLabel(status, goalCount);
}
