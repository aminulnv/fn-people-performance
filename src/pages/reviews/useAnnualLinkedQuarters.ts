import { useEffect, useMemo, useState } from "react";
import { selectGoalCycle } from "@/lib/goalsApi";
import { getGoalsSnapshotForCycle } from "@/lib/goals/store";
import {
  annualSourceLinks,
  buildAnnualQuarterRows,
  usesAnnualLinkedQuarters,
} from "@/lib/reviews/annualQuarters";
import { fetchReviewPacket } from "@/lib/reviews/packetsApi";
import { useReviewsSnapshot } from "@/lib/reviews/useReviews";
import type { ReviewCycle, ReviewPacket, ScorecardPillar } from "@/lib/reviews/types";

export function useAnnualLinkedQuarters(input: {
  cycle: ReviewCycle | null | undefined;
  employeeId: number;
  goalsPillar?: ScorecardPillar;
  goalsRevision?: number;
}) {
  const { cycles: availableCycles } = useReviewsSnapshot();
  const links = annualSourceLinks(input.cycle, availableCycles);
  const sourceIds = links.map((link) => link.sourceCycleId).join("|");
  const enabled = usesAnnualLinkedQuarters(
    input.cycle,
    input.goalsPillar?.pullLinkedQuarters !== false,
    availableCycles,
  );
  const [packetsByCycleId, setPacketsByCycleId] = useState<
    Record<string, ReviewPacket | null>
  >({});

  useEffect(() => {
    if (!enabled || !Number.isInteger(input.employeeId)) return;
    let cancelled = false;
    void Promise.all(
      links.map(async (link) => {
        try {
          const packet = await fetchReviewPacket(
            link.sourceCycleId,
            input.employeeId,
          );
          return [link.sourceCycleId, packet] as const;
        } catch {
          return [link.sourceCycleId, null] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setPacketsByCycleId(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, input.employeeId, sourceIds]);

  useEffect(() => {
    if (!enabled) return;
    for (const link of links) {
      void selectGoalCycle(link.sourceCycleId);
    }
  }, [enabled, sourceIds]);

  const rows = useMemo(() => {
    if (!enabled) return [];
    void input.goalsRevision;
    return buildAnnualQuarterRows({
      links,
      cycles: availableCycles,
      packetsByCycleId,
      goalsByCycleId: Object.fromEntries(
        links.map((link) => [
          link.sourceCycleId,
          getGoalsSnapshotForCycle(link.sourceCycleId).byPerson[
            String(input.employeeId)
          ]?.goals ?? [],
        ]),
      ),
    });
  }, [
    availableCycles,
    enabled,
    input.employeeId,
    input.goalsRevision,
    links,
    packetsByCycleId,
  ]);

  const progressRow = rows.find((row) => row.kind === "progress");
  const goalsByCycleId = Object.fromEntries(
    rows.map((row) => [
      row.sourceCycleId,
      getGoalsSnapshotForCycle(row.sourceCycleId).byPerson[
        String(input.employeeId)
      ]?.goals ?? [],
    ]),
  );
  const q4Goals = progressRow
    ? goalsByCycleId[progressRow.sourceCycleId] ?? []
    : [];

  return {
    enabled,
    rows,
    progressRow,
    goalsByCycleId,
    q4Goals,
  };
}
