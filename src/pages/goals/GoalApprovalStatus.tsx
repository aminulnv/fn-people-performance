import type { SubmissionStatus } from "@/lib/goals/types";
import { GoalStatusBadge } from "./GoalStatusBadge";
import { statusLabel } from "./statusLabels";

export function GoalApprovalStatus({
  status,
  postWindowApprovalStage,
  labeled = false,
}: {
  status: SubmissionStatus;
  postWindowApprovalStage?: "manager" | "manager_manager";
  /** Always show a text chip, including Approved. */
  labeled?: boolean;
}) {
  if (status === "submitted") {
    let label = labeled ? "Pending approval" : "Pending";
    if (postWindowApprovalStage === "manager") label = "Manager pending";
    else if (postWindowApprovalStage === "manager_manager") {
      label = labeled ? "Pending final approval" : "Final pending";
    }
    return <GoalStatusBadge status={status}>{label}</GoalStatusBadge>;
  }
  return <GoalStatusBadge status={status}>{statusLabel(status)}</GoalStatusBadge>;
}
