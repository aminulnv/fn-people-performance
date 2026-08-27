import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  COMPANY_OKR_NAME,
  type OkrReferenceScope,
  type OkrWindowData,
} from "@/lib/okr/reference";
import { GoalOkrReferenceList } from "./GoalOkrReferenceList";

/** Inline reference card for layouts that keep a permanent side column. */
export function GoalOkrReferencePanel({
  employeeId,
  quarter,
  scope,
  collapsible = false,
  window,
}: {
  employeeId?: number;
  quarter?: string;
  scope?: OkrReferenceScope;
  collapsible?: boolean;
  window?: OkrWindowData;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (!employeeId || employeeId <= 0) return null;

  return (
    <aside className="pd-okr-ref" aria-label="OKR reference">
      <button
        type="button"
        className="pd-okr-ref__header"
        aria-expanded={isOpen}
        disabled={!collapsible}
        onClick={() => {
          if (collapsible) setIsOpen((current) => !current);
        }}
      >
        <span className="pd-okr-ref__title-row">
          <strong>Your OKRs</strong>
          {collapsible ? (
            <ChevronDown
              className="pd-okr-ref__panel-chevron"
              size={16}
              strokeWidth={2.25}
              aria-hidden
            />
          ) : null}
        </span>
        <span className="pd-okr-ref__scope">
          {[
            COMPANY_OKR_NAME,
            scope?.department.trim(),
            scope?.wing.trim(),
            quarter,
          ]
            .filter(Boolean)
            .join(" / ")}
        </span>
      </button>

      {isOpen ? (
        <GoalOkrReferenceList
          employeeId={employeeId}
          quarter={quarter}
          scope={scope}
          window={window}
        />
      ) : null}
    </aside>
  );
}
