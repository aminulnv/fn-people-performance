import type { ReactNode } from "react";
import { Lock } from "lucide-react";
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
  /** `ribbon` is a flush strip, matching Action required. */
  layout?: "card" | "ribbon";
}) {
  const label = spoken ?? (typeof message === "string" ? message : title);
  const detail = message ? (
    <p className="pd-goals-sendback__reason pd-goals-banner__detail">
      {message}
    </p>
  ) : spoken ? (
    <p className="pd-goals-sendback__reason pd-goals-banner__detail">
      {spoken}
    </p>
  ) : null;

  if (layout === "ribbon") {
    return (
      <aside
        className="pd-goals-sendback pd-goals-sendback--ribbon pd-goals-banner pd-goals-banner--lock pd-goals-banner--ribbon"
        role="status"
        aria-label={label}
      >
        <div className="pd-goals-banner__start">
          <span className="pd-goals-banner__icon" aria-hidden>
            <Lock size={13} strokeWidth={2.25} />
          </span>
          <p className="pd-goals-banner__title">{title}</p>
          {detail}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="pd-goals-sendback pd-goals-sendback--lock pd-goals-sendback--compact"
      role="status"
      aria-label={label}
    >
      <span className="pd-goals-sendback__icon" aria-hidden>
        <Lock size={13} strokeWidth={2.25} />
      </span>
      <div className="pd-goals-sendback__copy">
        <div className="pd-goals-sendback__head">
          <p className="pd-goals-sendback__title">{title}</p>
        </div>
        {detail}
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
