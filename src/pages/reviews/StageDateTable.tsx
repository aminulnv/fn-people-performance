import type { CSSProperties, ReactNode } from "react";
import { Input } from "@/components/ui";

export function StageTable({
  columns,
  children,
}: {
  columns: [string, ...string[]];
  children: ReactNode;
}) {
  const [rowHeading, ...dateHeadings] = columns;
  return (
    <div
      className="pd-stage-table"
      style={{ "--stage-date-columns": dateHeadings.length } as CssVars}
    >
      <div className="pd-stage-table__head">
        <span className="pd-stage-table__heading">{rowHeading}</span>
        {dateHeadings.map((heading) => (
          <span key={heading} className="pd-stage-table__heading">
            {heading}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}

export function StageRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="pd-stage-table__row">
      <div className="pd-stage-table__label">
        <span className="pd-stage-table__name">{label}</span>
        {hint ? <span className="pd-stage-table__hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function DateCell({
  label,
  value,
  onChange,
  labelPlacement = "above",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  labelPlacement?: "above" | "notch";
}) {
  return (
    <Input
      type="date"
      label={labelPlacement === "notch" ? label : undefined}
      labelPlacement={labelPlacement}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function StageWindowFields({
  startLabel,
  endLabel,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  labelPlacement = "above",
}: {
  startLabel: string;
  endLabel: string;
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  labelPlacement?: "above" | "notch";
}) {
  const notched = labelPlacement === "notch";
  return (
    <div
      className={
        notched ? "pd-reviews-window pd-reviews-window--notch" : "pd-reviews-window"
      }
    >
      <div className="pd-reviews-window__date">
        {notched ? null : (
          <span className="pd-reviews-window__label">{startLabel}</span>
        )}
        <DateCell
          label={startLabel}
          value={startValue}
          onChange={onStartChange}
          labelPlacement={labelPlacement}
        />
      </div>
      <div className="pd-reviews-window__track" aria-hidden>
        <span className="pd-reviews-window__line" />
        <span className="pd-reviews-window__dot" />
        <span className="pd-reviews-window__line" />
      </div>
      <div className="pd-reviews-window__date pd-reviews-window__date--end">
        {notched ? null : (
          <span className="pd-reviews-window__label">{endLabel}</span>
        )}
        <DateCell
          label={endLabel}
          value={endValue}
          onChange={onEndChange}
          labelPlacement={labelPlacement}
        />
      </div>
    </div>
  );
}

type CssVars = CSSProperties & Record<"--stage-date-columns", number>;
