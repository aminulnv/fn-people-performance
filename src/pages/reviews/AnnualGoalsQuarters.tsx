import { useEffect, useId, useState } from "react";
import { ChevronDown, Target } from "lucide-react";
import { ListboxSelect, Tooltip } from "@/components/ui";
import { ensurePersonGoalsHydrated, type Goal } from "@/lib/goalsApi";
import { gradeLabel } from "@/lib/reviews/scorecards";
import { goalsDetailPath } from "@/pages/goals/goalHelpers";
import {
  isQ12026TransitionQuarter,
  TRANSITION_QUARTER_BADGE,
  TRANSITION_QUARTER_TOOLTIP,
  type AnnualQuarterRow,
} from "@/lib/reviews/annualQuarters";
import type { GradeBandId } from "@/lib/reviews/types";
import {
  GRADE_LISTBOX_OPTIONS,
  ScorecardGoalsCard,
} from "./ScorecardGoalsCard";

const LEAVE_OPTION_VALUE = "leave";

const GRADE_OR_LEAVE_OPTIONS = [
  ...GRADE_LISTBOX_OPTIONS,
  { value: LEAVE_OPTION_VALUE, label: "Leave (O)" },
];

function gradeSelectClass(grade: GradeBandId | null | "" | typeof LEAVE_OPTION_VALUE) {
  return [
    "pd-reviews-scorecard__goals-grade",
    grade && grade !== LEAVE_OPTION_VALUE
      ? `pd-reviews-scorecard__grade-select--${grade}`
      : "",
    grade === LEAVE_OPTION_VALUE ? "pd-reviews-scorecard__grade-select--leave" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function GradeBadge({
  grade,
  label,
}: {
  grade: GradeBandId;
  label?: string;
}) {
  return (
    <span
      className={[
        "pd-reviews-scorecard__band",
        `pd-reviews-scorecard__band--${grade}`,
      ].join(" ")}
      aria-label={label}
    >
      {gradeLabel(grade)}
    </span>
  );
}

function LeaveBadge({ label }: { label?: string }) {
  return (
    <span
      className="pd-reviews-scorecard__band pd-reviews-scorecard__band--leave"
      aria-label={label}
    >
      Leave (O)
    </span>
  );
}

export function AnnualGoalsQuarters({
  rows,
  goalsByCycleId = {},
  q4Goals,
  q4CycleId,
  q4PersonId,
  personId,
  owner,
  q4Href,
  q4Grade = null,
  onQ4GradeChange,
  q4GradeLocked = false,
  annualGoalsGrade = null,
  onAnnualGoalsGradeChange,
  annualGoalsGradeLocked = false,
  goalsWeight,
  canMarkLeave = false,
  leaveBusyPacketId = null,
  onLeaveChange,
}: {
  rows: AnnualQuarterRow[];
  goalsByCycleId?: Record<string, Goal[] | undefined>;
  q4Goals?: Goal[];
  q4CycleId?: string;
  q4PersonId?: string;
  personId?: string;
  owner?: { id: string; name: string; avatarUrl?: string };
  q4Href?: string;
  q4Grade?: GradeBandId | null;
  onQ4GradeChange?: (grade: GradeBandId | "") => void;
  q4GradeLocked?: boolean;
  /** Employee overall annual Goals rating (not per-goal / not per-quarter). */
  annualGoalsGrade?: GradeBandId | null;
  onAnnualGoalsGradeChange?: (grade: GradeBandId | "") => void;
  annualGoalsGradeLocked?: boolean;
  goalsWeight?: number;
  /** PTR / admin can assign leave (O) on a linked quarter. */
  canMarkLeave?: boolean;
  leaveBusyPacketId?: string | null;
  onLeaveChange?: (packetId: string, leave: boolean) => void | Promise<void>;
}) {
  const baseId = useId();
  const subjectId = personId ?? q4PersonId;
  const showAnnualGradeEditor = Boolean(onAnnualGoalsGradeChange);
  const showAnnualGrade = showAnnualGradeEditor || Boolean(annualGoalsGrade);
  const annualGradeLabel =
    goalsWeight != null ? `Overall grade (${goalsWeight}%)` : "Overall grade";
  const sourceIds = rows.map((row) => row.sourceCycleId).join("|");
  const defaultOpenId =
    rows.find((row) => row.kind === "progress")?.sourceCycleId ??
    rows[rows.length - 1]?.sourceCycleId ??
    "";
  const [openId, setOpenId] = useState(defaultOpenId);

  useEffect(() => {
    if (openId && !rows.some((row) => row.sourceCycleId === openId)) {
      setOpenId(defaultOpenId);
    }
  }, [defaultOpenId, openId, rows]);

  useEffect(() => {
    if (!subjectId || !sourceIds) return;
    const employeeId = Number(subjectId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) return;
    for (const row of rows) {
      void ensurePersonGoalsHydrated(row.sourceCycleId, employeeId);
    }
  }, [rows, sourceIds, subjectId]);

  if (rows.length === 0) return null;

  return (
    <section className="pd-reviews-scorecard__card" aria-label="Goals by quarter">
      <header className="pd-reviews-scorecard__card-head">
        <h2 className="pd-reviews-scorecard__section-title">
          <Target size={18} strokeWidth={1.75} aria-hidden />
          Goals
        </h2>
        {showAnnualGrade ? (
          <div className="pd-reviews-quarters__grade-field">
            <span className="pd-reviews-quarters__grade-label">Overall grade</span>
            {showAnnualGradeEditor ? (
              <ListboxSelect
                className={gradeSelectClass(annualGoalsGrade)}
                id="scorecard-annual-goals-grade"
                aria-label={annualGradeLabel}
                value={annualGoalsGrade ?? ""}
                disabled={annualGoalsGradeLocked}
                placeholder="Select a grade"
                emptyLabel="Select a grade"
                onValueChange={(next) =>
                  onAnnualGoalsGradeChange?.(next as GradeBandId | "")
                }
                options={GRADE_LISTBOX_OPTIONS}
              />
            ) : annualGoalsGrade ? (
              <GradeBadge grade={annualGoalsGrade} label="Overall grade" />
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="pd-reviews-quarters__list" aria-label="Quarter goals">
        {rows.map((row) => {
          const isProgress = row.kind === "progress";
          const open = openId === row.sourceCycleId;
          const triggerId = `${baseId}-trigger-${row.sourceCycleId}`;
          const panelId = `${baseId}-panel-${row.sourceCycleId}`;
          const goals =
            goalsByCycleId[row.sourceCycleId] ??
            (isProgress ? q4Goals : undefined) ??
            [];
          const cycleId =
            row.sourceCycleId || (isProgress ? q4CycleId : undefined);
          const goalsHref =
            q4Href && row.sourceCycleId === q4CycleId
              ? q4Href
              : cycleId && subjectId
                ? goalsDetailPath(cycleId, subjectId)
                : undefined;
          const showQ4GradeEditor =
            isProgress && Boolean(onQ4GradeChange);
          const quarterGrade = isProgress ? q4Grade : row.grade;
          const leaveBusy =
            row.packetId != null && leaveBusyPacketId === row.packetId;
          const canToggleLeave =
            canMarkLeave && Boolean(row.packetId) && Boolean(onLeaveChange);
          const outcomeValue = row.leave
            ? LEAVE_OPTION_VALUE
            : (quarterGrade ?? "");
          const outcomeOptions = canToggleLeave
            ? GRADE_OR_LEAVE_OPTIONS
            : GRADE_LISTBOX_OPTIONS;

          return (
            <article
              key={row.sourceCycleId}
              className={[
                "pd-reviews-quarters__item",
                open ? "is-open" : "",
                row.leave ? "is-leave" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="pd-reviews-quarters__bar">
                <button
                  id={triggerId}
                  type="button"
                  className="pd-reviews-quarters__toggle"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpenId((current) =>
                      current === row.sourceCycleId ? "" : row.sourceCycleId,
                    )
                  }
                >
                  <ChevronDown
                    className="pd-reviews-quarters__chevron"
                    size={16}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  <span className="pd-reviews-quarters__quarter-label">
                    {row.label}
                  </span>
                  {isQ12026TransitionQuarter(row) ? (
                    <Tooltip content={TRANSITION_QUARTER_TOOLTIP} side="top">
                      <span className="pd-reviews-quarters__quarter-meta pd-reviews-quarters__quarter-meta--transition">
                        {TRANSITION_QUARTER_BADGE}
                      </span>
                    </Tooltip>
                  ) : null}
                  {row.excluded ? (
                    <span className="pd-reviews-quarters__quarter-meta">
                      Excluded
                    </span>
                  ) : null}
                  {row.leave ? (
                    <span className="pd-reviews-quarters__quarter-meta">
                      Leave (O)
                    </span>
                  ) : null}
                </button>
                <div className="pd-reviews-quarters__bar-grade">
                  {(canToggleLeave && row.packetId) || showQ4GradeEditor ? (
                    <ListboxSelect
                      className={gradeSelectClass(outcomeValue)}
                      id={`scorecard-goals-grade-${row.sourceCycleId}`}
                      aria-label={`${row.label} grade or leave`}
                      value={outcomeValue}
                      disabled={
                        leaveBusy ||
                        (showQ4GradeEditor && q4GradeLocked && !canToggleLeave)
                      }
                      placeholder="Select grade"
                      emptyLabel="Select grade"
                      onValueChange={(next) => {
                        if (next === LEAVE_OPTION_VALUE) {
                          if (row.packetId) {
                            void onLeaveChange?.(row.packetId, true);
                          }
                          return;
                        }
                        if (row.leave && row.packetId) {
                          void onLeaveChange?.(row.packetId, false);
                        }
                        if (showQ4GradeEditor) {
                          onQ4GradeChange?.(next as GradeBandId | "");
                        }
                      }}
                      options={outcomeOptions}
                    />
                  ) : row.leave ? (
                    <LeaveBadge label={`${row.label} leave`} />
                  ) : quarterGrade ? (
                    <GradeBadge
                      grade={quarterGrade}
                      label={`${row.label} grade`}
                    />
                  ) : (
                    <span className="pd-reviews-quarters__grade-empty">—</span>
                  )}
                </div>
              </div>
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="pd-reviews-quarters__panel"
                hidden={!open}
              >
                {open ? (
                  <>
                    {row.leave ? (
                      <p className="pd-reviews-flow__hint">
                        Full-quarter leave. This quarter is excluded from the
                        annual goals average.
                      </p>
                    ) : null}
                    <ScorecardGoalsCard
                      cycleId={cycleId}
                      personId={subjectId}
                      owner={owner}
                      cycleLabel={row.label}
                      title="Goals"
                      embedded
                      hideTitle
                      goals={goals}
                      overallPercent={row.progressPercent}
                      overallBand={null}
                      goalsHref={goalsHref}
                    />
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
