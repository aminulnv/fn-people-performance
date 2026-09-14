import { overallCompletion } from "@/lib/goals/weightage";
import type { Goal } from "@/lib/goals/types";
import {
  cyclePurposeOf,
  inferYearKey,
  quarterLabelForCycle,
  suggestedSourceLinks,
} from "./purpose";
import type { QuarterOutcome } from "./rollup";
import { isGoalsOnlyQuarter } from "./reviewStages";
import type {
  CycleSourceLink,
  GradeBandId,
  ReviewCycle,
  ReviewPacket,
} from "./types";

const GRADE_BANDS: GradeBandId[] = [
  "exceptional",
  "exceeding",
  "performing",
  "developing",
  "unsatisfactory",
];

function isGradeBand(value: unknown): value is GradeBandId {
  return typeof value === "string" && GRADE_BANDS.includes(value as GradeBandId);
}

export type AnnualQuarterKind = "graded" | "progress";

export type AnnualQuarterRow = {
  sourceCycleId: string;
  label: string;
  periodKey?: string;
  excluded: boolean;
  kind: AnnualQuarterKind;
  grade: GradeBandId | null;
  progressPercent: number;
  goalCount: number;
};

export function annualSourceLinks(
  cycle: ReviewCycle | null | undefined,
  cycles: ReviewCycle[] = [],
) {
  if (!cycle || cyclePurposeOf(cycle) !== "annual_appraisal") return [];
  const stored = (cycle.sourceLinks ?? []).filter((link) => !link.excluded);
  if (stored.length > 0) return stored;
  const yearKey = cycle.yearKey ?? inferYearKey(cycle.periodKey, cycle.startDate);
  return yearKey ? suggestedSourceLinks(yearKey, cycles) : [];
}

export function usesAnnualLinkedQuarters(
  cycle: ReviewCycle | null | undefined,
  pullLinkedQuarters = true,
  cycles: ReviewCycle[] = [],
): boolean {
  return pullLinkedQuarters && annualSourceLinks(cycle, cycles).length > 0;
}

export function gradeFromLinkedPacket(
  packet: ReviewPacket | null | undefined,
): GradeBandId | null {
  if (!packet) return null;
  if (packet.publishedOverallGrade) return packet.publishedOverallGrade;
  if (packet.calibratedOverallGrade) return packet.calibratedOverallGrade;
  if (packet.managerOverallGrade) return packet.managerOverallGrade;
  const scores = packet.pillarScores.filter(
    (score) => score.pillarId === "goals" && score.grade != null,
  );
  return (
    scores.find((score) => score.actorRole === "manager")?.grade ??
    scores.find((score) => score.actorRole === "self")?.grade ??
    packet.selfOverallGrade ??
    null
  );
}

export function buildAnnualQuarterRows(input: {
  links: CycleSourceLink[];
  cycles: ReviewCycle[];
  packetsByCycleId: Record<string, ReviewPacket | null | undefined>;
  goalsByCycleId: Record<string, Goal[] | undefined>;
}): AnnualQuarterRow[] {
  return input.links.map((link) => {
    const source = input.cycles.find(
      (cycle) => cycle.id === link.sourceCycleId,
    );
    const goals = input.goalsByCycleId[link.sourceCycleId] ?? [];
    const kind: AnnualQuarterKind = isGoalsOnlyQuarter(source?.periodKey)
      ? "progress"
      : "graded";

    return {
      sourceCycleId: link.sourceCycleId,
      label: source ? quarterLabelForCycle(source) : link.sourceCycleId,
      periodKey: source?.periodKey,
      excluded: Boolean(link.excluded),
      kind,
      grade:
        kind === "progress"
          ? null
          : gradeFromLinkedPacket(input.packetsByCycleId[link.sourceCycleId]),
      progressPercent: Math.round(overallCompletion(goals)),
      goalCount: goals.length,
    };
  });
}

/**
 * Map a linked annual quarter into a rollup outcome.
 * - Leave / excluded / not yet scored → drop and renormalize
 * - No goals submitted (defaulter) → keep as unsatisfactory (zero)
 * - Q4 uses the grade set inside the annual review
 */
export function outcomeForAnnualQuarter(
  row: AnnualQuarterRow,
  q4Grade: GradeBandId | null = null,
): QuarterOutcome {
  if (row.excluded) return { kind: "inapplicable" };
  if (row.kind === "progress") {
    return q4Grade ? { kind: "grade", grade: q4Grade } : { kind: "inapplicable" };
  }
  if (row.grade) return { kind: "grade", grade: row.grade };
  // Defaulters stay in the average as unsatisfactory.
  if (row.goalCount === 0) return { kind: "zero" };
  // Has goals but no quarter grade yet — treat as inactive for now.
  return { kind: "inapplicable" };
}

/** Q4 input grade for annual packets (not the rolled-up Goals pillar). */
export function readAnnualQ4Grade(
  packet: ReviewPacket | null | undefined,
): GradeBandId | null {
  const component = packet?.goalsComponent;
  if (component && Object.prototype.hasOwnProperty.call(component, "q4Grade")) {
    return isGradeBand(component.q4Grade) ? component.q4Grade : null;
  }
  // Legacy: before rollup wiring, the manager Goals pillar held the Q4 input.
  return (
    packet?.pillarScores.find(
      (score) => score.pillarId === "goals" && score.actorRole === "manager",
    )?.grade ?? null
  );
}

export function annualGoalsComponent(q4Grade: GradeBandId | null) {
  return { q4Grade };
}
