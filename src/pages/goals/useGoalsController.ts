import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  approveGoals,
  cascadeGoalToReports,
  copyPreviousGoals as copyPreviousGoalsFromCycle,
  fetchGoalsSnapshot,
  ratePerson,
  saveGoals,
  saveProgress,
  sendBackGoals,
  submitGoals,
  watchGoalsSnapshot,
  type GoalMutationContext,
} from "@/lib/goalsApi";
import { isEligibleForCycle } from "@/lib/goals/demoData";
import {
  buildOwnerOptions,
  duplicateGoal,
  cascadeRecipients,
  lineManagerCascade,
  removeGoal,
  replaceGoal,
  resolveGoalOwner,
  type GoalOwnerOption,
  type CascadeRecipient,
  type LineManagerCascade,
  type ResolvedGoalOwner,
} from "@/lib/goals/operations";
import {
  deriveGoalCapabilities,
  orderManagerReports,
  selectManagerApprovalQueue,
  selectManagerReports,
  type GoalCapabilities,
} from "@/lib/goals/permissions";
import {
  getGoalsSnapshotForCycle,
  setActiveCycle,
  setActivePerson,
} from "@/lib/goals/store";
import type {
  DemoPerson,
  Goal,
  GoalsSnapshot,
  PersonGoals,
  QuarterRating,
} from "@/lib/goals/types";
import { newId } from "@/lib/goals/weightage";
import { useCurrentPerson } from "@/lib/useCurrentPerson";

export type GoalsControllerActions = {
  saveGoals: (subjectId: string, goals: Goal[]) => Promise<void>;
  saveGoal: (subjectId: string, goal: Goal) => Promise<void>;
  saveProgress: (subjectId: string, goals: Goal[]) => Promise<void>;
  addComment: (
    subjectId: string,
    goalId: string,
    text: string,
  ) => Promise<void>;
  removeGoal: (subjectId: string, goalId: string) => Promise<void>;
  copyPreviousGoals: (subjectId: string) => Promise<Goal | null>;
  duplicateGoal: (subjectId: string, goalId: string) => Promise<Goal | null>;
  cascadeGoal: (
    subjectId: string,
    goalId: string,
    reportIds: string[],
  ) => Promise<void>;
  saveAndSubmit: (subjectId: string, goals: Goal[]) => Promise<void>;
  approve: (subjectId: string, goals?: Goal[]) => Promise<void>;
  sendBack: (subjectId: string, reason: string) => Promise<void>;
  rate: (
    subjectId: string,
    rating: Omit<QuarterRating, "submittedAt">,
  ) => Promise<void>;
};

export type GoalsController = {
  snapshot: GoalsSnapshot | null;
  actor: DemoPerson | null;
  subject: DemoPerson | null;
  subjectGoals: PersonGoals | null;
  previousCycle: { id: string; label: string; goalCount: number } | null;
  /** Direct reports of `subject`, not of the signed-in actor. */
  reports: { person: DemoPerson; row: PersonGoals }[];
  ownerOptions: GoalOwnerOption[];
  /** Line manager goals the page subject can cascade from. */
  cascadeFrom: LineManagerCascade;
  cascadeFromFor: (subjectId: string) => LineManagerCascade;
  cascadeRecipientsFor: (goalId: string) => CascadeRecipient[];
  capabilities: GoalCapabilities | null;
  capabilitiesFor: (subjectId: string) => GoalCapabilities | null;
  resolveOwner: (goal: Goal, subjectId: string) => ResolvedGoalOwner | null;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  actions: GoalsControllerActions;
};

export function useGoalsController({
  cycleId,
  subjectId,
}: {
  cycleId?: string;
  subjectId: string;
}): GoalsController {
  const actor = useCurrentPerson();
  const [snapshot, setSnapshot] = useState<GoalsSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutationQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingMutationCountRef = useRef(0);

  const refresh = useCallback(async () => {
    setSnapshot(await fetchGoalsSnapshot());
  }, []);

  useEffect(() => {
    if (cycleId) setActiveCycle(cycleId);
    setActivePerson(subjectId);
  }, [cycleId, subjectId]);

  useEffect(() => {
    void refresh();
    return watchGoalsSnapshot(() => {
      void refresh();
    });
  }, [refresh]);

  const subject = useMemo(() => {
    if (!snapshot) return null;
    return snapshot.people.find((person) => person.id === subjectId) ?? null;
  }, [snapshot, subjectId]);

  const subjectGoals = subject
    ? (snapshot?.byPerson[subject.id] ?? null)
    : null;
  const previousCycle = useMemo(() => {
    if (!snapshot || !subject) return null;
    const cycle = [...snapshot.availableCycles]
      .filter((candidate) => candidate.day1 < snapshot.cycle.day1)
      .sort((left, right) => right.day1.localeCompare(left.day1))[0];
    if (!cycle) return null;
    const goalCount =
      getGoalsSnapshotForCycle(cycle.id).byPerson[subject.id]?.goals.length ??
      0;
    return goalCount > 0
      ? { id: cycle.id, label: cycle.label, goalCount }
      : null;
  }, [snapshot, subject]);

  /** Reports of the person being viewed, so another profile never lists ours. */
  const reports = useMemo(() => {
    if (!snapshot || !subject) return [];
    const visibleReports =
      actor?.id === subject.id
        ? selectManagerApprovalQueue(
            subject,
            snapshot.people,
            snapshot.byPerson,
          )
        : selectManagerReports(subject, snapshot.people, snapshot.byPerson);
    return orderManagerReports(visibleReports);
  }, [actor?.id, snapshot, subject]);

  const ownerOptions = useMemo(
    () => (snapshot ? buildOwnerOptions(snapshot.people) : []),
    [snapshot],
  );

  const cascadeFromFor = useCallback(
    (targetSubjectId: string): LineManagerCascade => {
      if (!snapshot) return { managerName: null, options: [] };
      const target = snapshot.people.find(
        (person) => person.id === targetSubjectId,
      );
      return lineManagerCascade(target ?? null, snapshot);
    },
    [snapshot],
  );

  const cascadeFrom = subject
    ? cascadeFromFor(subject.id)
    : { managerName: null, options: [] };

  const cascadeRecipientsFor = useCallback(
    (goalId: string) => cascadeRecipients(goalId, snapshot),
    [snapshot],
  );

  const capabilitiesFor = useCallback(
    (targetSubjectId: string): GoalCapabilities | null => {
      if (!snapshot || !actor) return null;
      const target = snapshot.people.find(
        (person) => person.id === targetSubjectId,
      );
      const row = snapshot.byPerson[targetSubjectId];
      if (!target || !row) return null;
      return deriveGoalCapabilities({
        actor,
        subject: target,
        row,
        cycle: snapshot.cycle,
        cycleStatus: snapshot.cycleStatus,
      });
    },
    [snapshot, actor],
  );

  const capabilities = subject ? capabilitiesFor(subject.id) : null;

  const resolveOwner = useCallback(
    (goal: Goal, ownerSubjectId: string): ResolvedGoalOwner | null => {
      if (!snapshot) return null;
      const ownerSubject =
        snapshot.people.find((person) => person.id === ownerSubjectId) ?? null;
      if (!ownerSubject) return null;
      return resolveGoalOwner(goal, ownerSubject, snapshot.people);
    },
    [snapshot],
  );

  const mutationContext = useCallback(
    (targetSubjectId: string): GoalMutationContext => {
      if (!snapshot || !actor) {
        throw new Error("Goals are still loading.");
      }
      return {
        cycleId: snapshot.cycle.id,
        actorId: actor.id,
        subjectId: targetSubjectId,
      };
    },
    [snapshot, actor],
  );

  const run = useCallback(
    async <Result>(fn: () => Promise<Result>): Promise<Result | undefined> => {
      pendingMutationCountRef.current += 1;
      setBusy(true);
      setError(null);
      const operation = mutationQueueRef.current.then(fn);
      mutationQueueRef.current = operation.then(
        () => undefined,
        () => undefined,
      );
      try {
        const result = await operation;
        await refresh();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        return undefined;
      } finally {
        pendingMutationCountRef.current -= 1;
        if (pendingMutationCountRef.current === 0) setBusy(false);
      }
    },
    [refresh],
  );

  const actions = useMemo<GoalsControllerActions>(() => {
    return {
      async saveGoals(targetSubjectId, goals) {
        await run(() => saveGoals(mutationContext(targetSubjectId), goals));
      },
      async saveGoal(targetSubjectId, goal) {
        const row = snapshot?.byPerson[targetSubjectId];
        if (!row) throw new Error("Unknown goals subject.");
        await run(() =>
          saveGoals(
            mutationContext(targetSubjectId),
            replaceGoal(row.goals, goal),
          ),
        );
      },
      async saveProgress(targetSubjectId, goals) {
        await run(() => saveProgress(mutationContext(targetSubjectId), goals));
      },
      async addComment(targetSubjectId, goalId, text) {
        if (!actor) throw new Error("Not signed in.");
        const row = snapshot?.byPerson[targetSubjectId];
        if (!row) throw new Error("Unknown goals subject.");
        const trimmed = text.trim();
        if (!trimmed) return;
        const nextGoals = row.goals.map((goal) => {
          if (goal.id !== goalId) return goal;
          return {
            ...goal,
            updatedAt: new Date().toISOString(),
            comments: [
              ...(goal.comments ?? []),
              {
                id: newId("comment"),
                authorId: actor.id,
                authorName: actor.name,
                text: trimmed,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        });
        await run(() =>
          saveProgress(mutationContext(targetSubjectId), nextGoals),
        );
      },
      async removeGoal(targetSubjectId, goalId) {
        const row = snapshot?.byPerson[targetSubjectId];
        if (!row) throw new Error("Unknown goals subject.");
        await run(() =>
          saveGoals(
            mutationContext(targetSubjectId),
            removeGoal(row.goals, goalId),
          ),
        );
      },
      async copyPreviousGoals(targetSubjectId) {
        const result = await run(() =>
          copyPreviousGoalsFromCycle(mutationContext(targetSubjectId)),
        );
        return result?.byPerson[targetSubjectId]?.goals[0] ?? null;
      },
      async duplicateGoal(targetSubjectId, goalId) {
        const row = snapshot?.byPerson[targetSubjectId];
        if (!row) throw new Error("Unknown goals subject.");
        const source = row.goals.find((goal) => goal.id === goalId);
        if (!source) return null;
        const sourceTitle = source.description.trim() || `Untitled goal`;
        const copy = duplicateGoal(source, {
          ownerId: targetSubjectId,
          sourceTitle,
        });
        await run(() =>
          saveGoals(mutationContext(targetSubjectId), [...row.goals, copy]),
        );
        return copy;
      },
      async cascadeGoal(targetSubjectId, goalId, reportIds) {
        if (!actor || !snapshot) throw new Error("Goals are still loading.");
        const chosenIds = [...new Set(reportIds)].filter((reportId) =>
          actor.reportIds.includes(reportId),
        );
        if (chosenIds.length === 0) {
          throw new Error(
            "Select at least one report to cascade this goal to.",
          );
        }
        await run(() =>
          cascadeGoalToReports(
            mutationContext(targetSubjectId),
            goalId,
            chosenIds,
          ),
        );
      },
      async saveAndSubmit(targetSubjectId, goals) {
        await run(() =>
          submitGoals(mutationContext(targetSubjectId), goals),
        );
      },
      async approve(targetSubjectId, goals) {
        await run(() => approveGoals(mutationContext(targetSubjectId), goals));
      },
      async sendBack(targetSubjectId, reason) {
        await run(() =>
          sendBackGoals(mutationContext(targetSubjectId), reason),
        );
      },
      async rate(targetSubjectId, rating) {
        await run(() => ratePerson(mutationContext(targetSubjectId), rating));
      },
    };
  }, [actor, mutationContext, run, snapshot]);

  return {
    snapshot,
    actor,
    subject,
    subjectGoals,
    previousCycle,
    reports,
    ownerOptions,
    cascadeFrom,
    cascadeFromFor,
    cascadeRecipientsFor,
    capabilities,
    capabilitiesFor,
    resolveOwner,
    busy,
    error,
    clearError: () => setError(null),
    actions,
  };
}

export function subjectIsEligible(
  subject: DemoPerson | null,
  snapshot: GoalsSnapshot | null,
): boolean {
  if (!subject || !snapshot) return false;
  return isEligibleForCycle(subject, snapshot.cycle);
}
