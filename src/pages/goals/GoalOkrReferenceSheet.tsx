import { Eye, Target } from "lucide-react";
import type { OkrReferenceScope } from "@/lib/okr/reference";
import { GoalOkrReferenceList } from "./GoalOkrReferenceList";

export const OKR_REFERENCE_SHEET_LABEL = "Department and wing OKRs";
export const OKR_REFERENCE_TAB_LABEL = "View OKRs";

/** Reference content sized for the goal drawer's pull-out sheet. */
export function GoalOkrReferenceSheet({ scope }: { scope: OkrReferenceScope }) {
  return (
    <div className="pd-okr-sheet">
      <header className="pd-okr-sheet__head">
        <span className="pd-okr-sheet__eyebrow">
          <Eye size={13} strokeWidth={2} aria-hidden />
          Read-only reference
        </span>
        <h2>
          <Target size={20} strokeWidth={2.25} aria-hidden />
          Department &amp; wing OKRs
        </h2>
        <p>
          {scope.department}
          {scope.wing.trim() ? ` · ${scope.wing}` : ""}
        </p>
      </header>
      <GoalOkrReferenceList scope={scope} />
    </div>
  );
}
