import { Check } from "lucide-react";
import { Avatar } from "@/components/ui";
import { avatarStyle } from "@/lib/employees/avatar";
import type { LineManagerCascade } from "@/lib/goals/operations";
import type { PersonGoals, SendBackAuthor } from "@/lib/goals/types";
import { approvalCopy, resolveApprovalPerson } from "./approvalDisplay";
import { EMPTY_LINE_MANAGER_CASCADE } from "./GoalCascadeField";

export function GoalApprovalCard({
  status,
  postWindowApprovalStage,
  sendBackReason,
  sendBackBy,
  approvedBy,
  cascadeFrom = EMPTY_LINE_MANAGER_CASCADE,
}: {
  status: PersonGoals["status"];
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"];
  sendBackReason?: string;
  sendBackBy?: SendBackAuthor;
  approvedBy?: SendBackAuthor;
  cascadeFrom?: LineManagerCascade;
}) {
  const approval = approvalCopy(status, postWindowApprovalStage);
  const approver = resolveApprovalPerson({
    status,
    postWindowApprovalStage,
    sendBackBy,
    approvedBy,
    cascadeFrom,
  });

  return (
    <div
      className={`pd-goal-view__approval pd-goal-view__approval--${approval.tone}`}
    >
      <span className="pd-goal-view__approval-icon" aria-hidden>
        <Check size={16} strokeWidth={2.5} />
      </span>
      <div className="pd-goal-view__approval-copy">
        <p className="pd-goal-view__approval-title">{approval.title}</p>
        {approver ? (
          <div className="pd-goal-view__approval-person">
            <span className="pd-goal-view__approval-prefix">
              {approval.personPrefix}
            </span>
            <Avatar
              name={approver.name}
              src={approver.avatarUrl}
              size="sm"
              alt={`Approver ${approver.name}`}
              style={avatarStyle(approver.name)}
            />
            <p className="pd-goal-view__approval-sub">{approver.name}</p>
          </div>
        ) : (
          <p className="pd-goal-view__approval-sub">{approval.sub}</p>
        )}
      </div>
      {status === "sent_back" && sendBackReason ? (
        <p className="pd-goal-view__approval-reason">{sendBackReason}</p>
      ) : null}
    </div>
  );
}
