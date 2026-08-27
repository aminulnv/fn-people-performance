import { overallCompletion } from "@/lib/goals/weightage";
import type { Goal } from "@/lib/goals/types";
import {
  cyclePurposeOf,
  inferYearKey,
  quarterLabelForCycle,
  suggestedSourceLinks,
} from "./purpose";
import { isGoalsOnlyQuarter } from "./reviewStages";
import type {
  CycleSourceLink,
  GradeBandId,
  ReviewCycle,
  ReviewPacket,
} from "./types";

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
