import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import type { CycleEligibilityReason } from "@/lib/goals/demoData";
import { cycleIneligibilityEmptyState } from "./statusLabels";

export function GoalEditLockNotice({
  message,
  spoken,
}: {
  message: ReactNode;
  spoken?: string;
}) {
  const label = spoken ?? (typeof message === "string" ? message : undefined);
  return (
    <p className="pd-goals-lock" role="status" aria-label={label}>
      <Lock size={14} strokeWidth={2} aria-hidden />
      <span className="pd-goals-lock__copy">{message}</span>
    </p>
  );
}

/** Same short cycle-eligibility copy as the empty state, on one line. */
export function CycleIneligibilityNotice({
  personName,
  reason,
}: {
  personName: string;
  reason: CycleEligibilityReason;
}) {
  const empty = cycleIneligibilityEmptyState(personName, reason);
  return <GoalEditLockNotice message={`${empty.title}. ${empty.description}`} />;
}
