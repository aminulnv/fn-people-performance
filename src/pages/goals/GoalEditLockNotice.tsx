import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cx } from "@/lib/cx";
import type { CycleEligibilityReason } from "@/lib/goals/demoData";
import { cycleIneligibilityEmptyState } from "./statusLabels";

export function GoalEditLockNotice({
  message,
  spoken,
  title = "Read Only",
  layout = "card",
}: {
  message: ReactNode;
  spoken?: string;
  title?: string;
  /** `ribbon` sits on the goals card, matching Late Submission. */
  layout?: "card" | "ribbon";
}) {
  const label = spoken ?? (typeof message === "string" ? message : title)
  return (
    <aside
      className={cx(
        "pd-goals-banner",
        "pd-goals-banner--lock",
        layout === "ribbon" && "pd-goals-banner--ribbon",
      )}
      role="status"
      aria-label={label}
    >
      <div className="pd-goals-banner__start">
        <span className="pd-goals-banner__icon" aria-hidden>
          <Lock size={13} strokeWidth={2.25} />
        </span>
        <p className="pd-goals-banner__title">{title}</p>
        {message ? (
          <p className="pd-goals-banner__detail">{message}</p>
        ) : spoken ? (
          <p className="pd-goals-banner__detail">{spoken}</p>
        ) : null}
      </div>
    </aside>
  );
}

/** Same short cycle-eligibility copy as the empty state, on one line. */
export function CycleIneligibilityNotice({
  personName,
  reason,
  layout,
}: {
  personName: string;
  reason: CycleEligibilityReason;
  layout?: "card" | "ribbon";
}) {
  const empty = cycleIneligibilityEmptyState(personName, reason);
  return (
    <GoalEditLockNotice
      layout={layout}
      title={empty.title}
      message={empty.description}
      spoken={`${empty.title}. ${empty.description}`}
    />
  );
}
