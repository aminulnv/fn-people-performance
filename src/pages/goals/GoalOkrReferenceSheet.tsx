import { Target } from "lucide-react";
import { COMPANY_OKR_NAME, type OkrReferenceScope } from "@/lib/okr/reference";
import { GoalOkrReferenceList } from "./GoalOkrReferenceList";

export const OKR_REFERENCE_SHEET_LABEL = "Your OKRs";
export const OKR_REFERENCE_TAB_LABEL = "View OKRs";

function scopeLine(
  scope?: OkrReferenceScope,
  cycleLabel?: string,
): string {
  return [
    COMPANY_OKR_NAME,
    scope?.department.trim(),
    scope?.wing.trim(),
    cycleLabel,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Reference content sized for the goal drawer's pull-out sheet. */
export function GoalOkrReferenceSheet({
  employeeId,
  quarter,
  cycleLabel,
  scope,
}: {
  employeeId: number;
  quarter?: string;
  cycleLabel?: string;
  scope?: OkrReferenceScope;
}) {
  return (
    <div className="pd-okr-sheet">
      <header className="pd-okr-sheet__head">
        <h2>
          <Target size={20} strokeWidth={2.25} aria-hidden />
          Your OKRs
        </h2>
        <p>{scopeLine(scope, cycleLabel ?? quarter)}</p>
      </header>
      <GoalOkrReferenceList
        employeeId={employeeId}
        quarter={quarter}
        scope={scope}
      />
    </div>
  );
}
