import { useEffect, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { ensurePersonGoalsHydrated } from "@/lib/goalsApi";
import { getGoalsSnapshotForCycle } from "@/lib/goals/store";
import { PACKET_STALE_MS, queryKeys } from "@/lib/queryClient";
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
  /** When false, skip network work (e.g. wait for main packet first). */
  enabled?: boolean;
}) {
  const { cycles: availableCycles } = useReviewsSnapshot();
  const links = annualSourceLinks(input.cycle, availableCycles);
  const sourceIds = links.map((link) => link.sourceCycleId).join("|");
  const enabled =
    input.enabled !== false &&
    usesAnnualLinkedQuarters(
      input.cycle,
      input.goalsPillar?.pullLinkedQuarters !== false,
      availableCycles,
    );
  const employeeReady =
    enabled && Number.isInteger(input.employeeId) && input.employeeId > 0;

  const packetQueries = useQueries({
    queries: links.map((link) => ({
      queryKey: queryKeys.reviewPacket(link.sourceCycleId, input.employeeId),
      queryFn: () => fetchReviewPacket(link.sourceCycleId, input.employeeId),
      enabled: employeeReady,
      staleTime: PACKET_STALE_MS,
      refetchOnMount: false as const,
    })),
  });

  const packetsByCycleId = useMemo(() => {
    const map: Record<string, ReviewPacket | null> = {};
    links.forEach((link, index) => {
      map[link.sourceCycleId] = packetQueries[index]?.data ?? null;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sourceIds,
    input.employeeId,
    packetQueries.map((query) => query.dataUpdatedAt).join("|"),
  ]);

  useEffect(() => {
    if (!employeeReady) return;
    for (const link of links) {
      void ensurePersonGoalsHydrated(link.sourceCycleId, input.employeeId);
    }
  }, [employeeReady, input.employeeId, sourceIds]);

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
