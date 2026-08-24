import { ExternalLink } from "lucide-react";
import { Input, Textarea } from "@/components/ui";
import {
  normalizeProofUrl,
  proofLinkLabel,
} from "@/lib/goals/proof";

export function MeasureProofFields({
  proofUrl,
  comment,
  onChange,
  compact = false,
  name = "measure",
}: {
  proofUrl?: string;
  comment?: string;
  onChange: (next: { proofUrl?: string; comment?: string }) => void;
  compact?: boolean;
  name?: string;
}) {
  return (
    <div
      className={`pd-goal-proof${compact ? " pd-goal-proof--compact" : ""}`}
    >
      <Input
        type="url"
        inputMode="url"
        label="Proof link"
        placeholder="https://"
        autoComplete="url"
        value={proofUrl ?? ""}
        aria-label={`Proof link for ${name}`}
        onChange={(event) =>
          onChange({
            proofUrl: event.target.value,
            comment,
          })
        }
        onBlur={(event) => {
          const next = normalizeProofUrl(event.target.value);
          if ((next ?? "") === (proofUrl ?? "")) return;
          onChange({ proofUrl: next, comment });
        }}
      />
      <Textarea
        label="Proof note"
        rows={compact ? 2 : 3}
        placeholder="Optional context for this evidence"
        value={comment ?? ""}
        aria-label={`Proof note for ${name}`}
        onChange={(event) =>
          onChange({
            proofUrl,
            comment: event.target.value,
          })
        }
        onBlur={(event) => {
          const next = event.target.value.trim() || undefined;
          if (next === (comment?.trim() || undefined)) return;
          onChange({ proofUrl, comment: next });
        }}
      />
    </div>
  );
}

export function MeasureProofReadout({
  proofUrl,
  comment,
}: {
  proofUrl?: string;
  comment?: string;
}) {
  const href = normalizeProofUrl(proofUrl ?? "");
  const note = comment?.trim() ?? "";
  if (!href && !note) return null;

  return (
    <div className="pd-goal-proof-readout">
      {href ? (
        <a
          className="pd-goal-proof-readout__link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={13} strokeWidth={2.25} aria-hidden />
          {proofLinkLabel(href)}
        </a>
      ) : null}
      {note ? <p className="pd-goal-proof-readout__note">{note}</p> : null}
    </div>
  );
}
