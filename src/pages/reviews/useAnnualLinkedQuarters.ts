import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ensurePersonGoalsHydrated } from "@/lib/goalsApi";
import { getGoalsSnapshotForCycle } from "@/lib/goals/store";
import { PACKET_STALE_MS, queryClient, queryKeys } from "@/lib/queryClient";
import {
  annualSourceLinks,
  buildAnnualQuarterRows,
  usesAnnualLinkedQuarters,
} from "@/lib/reviews/annualQuarters";
import { fetchReviewPacketSummary } from "@/lib/reviews/packetsApi";
import { useReviewsSnapshot } from "@/lib/reviews/useReviews";
import type { ReviewCycle, ReviewPacket, ScorecardPillar } from "@/lib/reviews/types";

function cachedLinkedPacket(cycleId: string, employeeId: number) {
  return (
    queryClient.getQueryData<ReviewPacket>(
      queryKeys.reviewPacketSummary(cycleId, employeeId),
    ) ??
    queryClient.getQueryData<ReviewPacket>(
      queryKeys.reviewPacket(cycleId, employeeId),
    ) ??
    null
  );
}

export function useAnnualLinkedQuarters(input: {
  cycle: ReviewCycle | null | undefined;
  employeeId: number;
  goalsPillar?: ScorecardPillar;
  goalsRevision?: number;
  /** When false, skip network work (e.g. wait for main packet first). */
  enabled?: boolean;
}) {
  const { cycles: availableCycles } = useReviewsSnapshot();
  const links = useMemo(
    () => annualSourceLinks(input.cycle, availableCycles),
    [input.cycle, availableCycles],
  );
  const sourceIds = useMemo(
    () => links.map((link) => link.sourceCycleId).join("|"),
    [links],
  );
  const enabled =
    input.enabled !== false &&
    usesAnnualLinkedQuarters(
      input.cycle,
      input.goalsPillar?.pullLinkedQuarters !== false,
      availableCycles,
    );
  const employeeReady =
    enabled && Number.isInteger(input.employeeId) && input.employeeId > 0;

  // Let the annual packet + goals paint first; linked quarters are secondary UI.
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  useEffect(() => {
    if (!employeeReady) {
      setSecondaryOpen(false);
      return;
    }
    const cached = links.every((link) =>
      cachedLinkedPacket(link.sourceCycleId, input.employeeId),
    );
    if (cached) {
      setSecondaryOpen(true);
      return;
    }
    const timer = window.setTimeout(() => setSecondaryOpen(true), 150);
    return () => window.clearTimeout(timer);
  }, [employeeReady, input.employeeId, sourceIds, links]);

  const packetQueries = useQueries({
    queries: links.map((link) => ({
      queryKey: queryKeys.reviewPacketSummary(
        link.sourceCycleId,
        input.employeeId,
      ),
      queryFn: () =>
        fetchReviewPacketSummary(link.sourceCycleId, input.employeeId),
      enabled: employeeReady && secondaryOpen,
      staleTime: PACKET_STALE_MS,
      refetchOnMount: false as const,
    })),
  });

  const packetsStamp = packetQueries
    .map((query) => query.dataUpdatedAt)
    .join("|");

  const packetsByCycleId = useMemo(() => {
    const map: Record<string, ReviewPacket | null> = {};
    links.forEach((link, index) => {
      map[link.sourceCycleId] =
        packetQueries[index]?.data ??
        cachedLinkedPacket(link.sourceCycleId, input.employeeId);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceIds, input.employeeId, secondaryOpen, packetsStamp]);

  // Hydrate goals for every linked quarter — the annual scorecard shows them all.
  useEffect(() => {
    if (!employeeReady || !secondaryOpen) return;
    for (const link of links) {
      void ensurePersonGoalsHydrated(link.sourceCycleId, input.employeeId);
    }
  }, [
    employeeReady,
    secondaryOpen,
    input.employeeId,
    sourceIds,
    links,
  ]);

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
