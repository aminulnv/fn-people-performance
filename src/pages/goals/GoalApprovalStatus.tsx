import { Check } from "lucide-react";
import { Badge } from "@/components/ui";
import type { SubmissionStatus } from "@/lib/goals/types";
import { statusLabel, statusVariant } from "./statusLabels";

export function GoalApprovalStatus({
  status,
  postWindowApprovalStage,
  checkClassName = "pd-goals-overview__check",
}: {
  status: SubmissionStatus;
  postWindowApprovalStage?: "manager" | "manager_manager";
  checkClassName?: string;
}) {
  if (status === "approved") {
    return (
      <span className={checkClassName} aria-label="Approved">
        <Check size={14} strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  if (status === "submitted") {
    const label =
      postWindowApprovalStage === "manager"
        ? "Manager pending"
        : postWindowApprovalStage === "manager_manager"
          ? "Final pending"
          : "Pending";
    return <Badge variant="pending">{label}</Badge>;
  }
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
}
