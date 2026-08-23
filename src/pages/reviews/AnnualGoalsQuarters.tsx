import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Target } from "lucide-react";
import { Button, CycleSelect } from "@/components/ui";
import type { Goal } from "@/lib/goalsApi";
import { goalsDetailPath } from "@/pages/goals/goalHelpers";
import type { AnnualQuarterRow } from "@/lib/reviews/annualQuarters";
import type { GradeBandId } from "@/lib/reviews/types";
import { ScorecardGoalsCard } from "./ScorecardGoalsCard";

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
}) {
  const defaultId =
    rows.find((row) => row.kind === "progress")?.sourceCycleId ??
    rows.at(-1)?.sourceCycleId ??
    "";
  const [selectedId, setSelectedId] = useState(defaultId);

  useEffect(() => {
    if (!rows.some((row) => row.sourceCycleId === selectedId)) {
      setSelectedId(defaultId);
    }
  }, [defaultId, rows, selectedId]);

  const selectedIndex = Math.max(
    0,
    rows.findIndex((row) => row.sourceCycleId === selectedId),
  );
  const selected = rows[selectedIndex] ?? rows[0];
  const subjectId = personId ?? q4PersonId;
  const options = useMemo(
    () =>
      rows.map((row) => ({
        id: row.sourceCycleId,
        label: row.label,
      })),
    [rows],
  );

  if (!selected) return null;

  const goals =
    goalsByCycleId[selected.sourceCycleId] ??
    (selected.kind === "progress" ? q4Goals : undefined) ??
    [];
  const cycleId =
    selected.sourceCycleId ||
    (selected.kind === "progress" ? q4CycleId : undefined);
  const goalsHref =
    q4Href && selected.sourceCycleId === q4CycleId
      ? q4Href
      : cycleId && subjectId
        ? goalsDetailPath(cycleId, subjectId)
        : undefined;
  const isProgress = selected.kind === "progress";

  return (
    <section className="pd-reviews-scorecard__card" aria-label="Goals by quarter">
      <header className="pd-reviews-scorecard__card-head">
        <div className="pd-reviews-quarters__heading">
          <h2 className="pd-reviews-scorecard__section-title">
            <Target size={18} strokeWidth={1.75} aria-hidden />
            Goals
          </h2>
          <nav className="pd-reviews-quarters__nav" aria-label="Goal quarter">
            <Button
              variant="ghost"
              size="sm"
              className="pd-reviews-quarters__step"
              aria-label="Previous quarter"
              disabled={selectedIndex <= 0}
              onClick={() =>
                setSelectedId(rows[selectedIndex - 1]?.sourceCycleId ?? selectedId)
              }
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden />
            </Button>
            <CycleSelect
              className="pd-reviews-quarters__cycle"
              label="Goal quarter"
              options={options}
              value={selected.sourceCycleId}
              onChange={setSelectedId}
            />
            <Button
              variant="ghost"
              size="sm"
              className="pd-reviews-quarters__step"
              aria-label="Next quarter"
              disabled={selectedIndex >= rows.length - 1}
              onClick={() =>
                setSelectedId(rows[selectedIndex + 1]?.sourceCycleId ?? selectedId)
              }
            >
              <ChevronRight size={16} strokeWidth={2} aria-hidden />
            </Button>
          </nav>
        </div>
      </header>
      {isProgress ? (
        <p className="pd-reviews-flow__hint">
          Progress only — the manager sets this grade in the annual review.
        </p>
      ) : null}
      <ScorecardGoalsCard
        cycleId={cycleId}
        personId={subjectId}
        owner={owner}
        cycleLabel={selected.label}
        title="Goals"
        embedded
        hideTitle
        goals={goals}
        overallPercent={selected.progressPercent}
        overallBand={isProgress ? null : selected.grade}
        goalsHref={goalsHref}
        editing={isProgress && Boolean(onQ4GradeChange)}
        goalsGrade={isProgress ? q4Grade : selected.grade}
        onGoalsGradeChange={isProgress ? onQ4GradeChange : undefined}
        gradeLocked={isProgress ? q4GradeLocked : true}
      />
    </section>
  );
}
