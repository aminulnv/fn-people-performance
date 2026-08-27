import type { CSSProperties, ReactNode } from "react";
import { Input } from "@/components/ui";
import { isEndBeforeStart } from "@/lib/dates/timestamp";

export const END_BEFORE_START_MESSAGE = "Must end on or after the start date.";

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
  min,
  max,
  error,
  labelPlacement = "above",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
  labelPlacement?: "above" | "notch";
}) {
  return (
    <Input
      type="datetime"
      label={labelPlacement === "notch" ? label : undefined}
      labelPlacement={labelPlacement}
      aria-label={label}
      value={value}
      min={min}
      max={max}
      error={error}
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
  const rangeError = isEndBeforeStart(startValue, endValue)
    ? END_BEFORE_START_MESSAGE
    : undefined;
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
          max={endValue || undefined}
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
          min={startValue || undefined}
          error={rangeError}
          onChange={onEndChange}
          labelPlacement={labelPlacement}
        />
      </div>
    </div>
  );
}

type CssVars = CSSProperties & Record<"--stage-date-columns", number>;
