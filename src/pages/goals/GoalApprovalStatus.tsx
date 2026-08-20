import { Check } from "lucide-react";
import { Badge } from "@/components/ui";
import type { SubmissionStatus } from "@/lib/goals/types";
import { statusLabel, statusVariant } from "./statusLabels";

export function GoalApprovalStatus({
  status,
  postWindowApprovalStage,
  checkClassName = "pd-goals-overview__check",
  labeled = false,
}: {
  status: SubmissionStatus;
  postWindowApprovalStage?: "manager" | "manager_manager";
  checkClassName?: string;
  /** Always show a text chip, including Approved. */
  labeled?: boolean;
}) {
  if (status === "approved" && !labeled) {
    return (
      <span className={checkClassName} aria-label="Approved">
        <Check size={14} strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  if (status === "submitted") {
    let label = labeled ? "Pending approval" : "Pending";
    if (postWindowApprovalStage === "manager") label = "Manager pending";
    else if (postWindowApprovalStage === "manager_manager") {
      label = labeled ? "Pending final approval" : "Final pending";
    }
    return <Badge variant="pending">{label}</Badge>;
  }
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
}
