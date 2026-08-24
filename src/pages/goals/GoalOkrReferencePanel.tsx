import { useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import { COMPANY_OKR_NAME, type OkrReferenceScope } from "@/lib/okr/reference";
import { GoalOkrReferenceList } from "./GoalOkrReferenceList";

/** Inline reference card for layouts that keep a permanent side column. */
export function GoalOkrReferencePanel({
  scope,
  collapsible = false,
}: {
  scope: OkrReferenceScope;
  collapsible?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (!scope.department.trim()) return null;

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
        <span className="pd-okr-ref__eyebrow">
          <Eye size={13} strokeWidth={2} aria-hidden />
          Read-only reference
        </span>
        <span className="pd-okr-ref__title-row">
          <strong>Company, department &amp; wing OKRs</strong>
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
          {[COMPANY_OKR_NAME, scope.department.trim(), scope.wing.trim()]
            .filter(Boolean)
            .join(" / ")}
        </span>
      </button>

      {isOpen ? <GoalOkrReferenceList scope={scope} /> : null}
    </aside>
  );
}
