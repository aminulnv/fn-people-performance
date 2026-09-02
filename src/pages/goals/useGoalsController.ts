import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { effectiveReportIds, isDelegatingForEmployee } from "@/lib/delegations/roles";
import { hydrateManagerDelegations } from "@/lib/delegations/store";
import { useReviewCyclesHydrated } from "@/lib/reviews/useReviews";
import { goalsCycleForPerson } from "@/lib/goals/cyclesFromReviews";
import {
  approveGoals,
  cascadeGoalToReports,
  linkExistingGoalAsCascade,
  unlinkCascadedGoal,
  copyPreviousGoals as copyPreviousGoalsFromCycle,
  ensureGoalCycleHydrated,
  saveGoals,
  saveProgress,
  selectGoalCycle,
  sendBackGoals,
  submitGoals,
  type GoalMutationContext,
} from "@/lib/goalsApi";
import { isEligibleForCycle } from "@/lib/goals/demoData";
import { mentionedIdsIn } from "@/lib/goals/mentions";
import {
  buildOwnerOptions,
  duplicateGoal,
  indexCascadeRecipients,
  isOwnGoalComment,
  lineManagerCascade,
  reportCascadeOptions,
  removeGoal,
  removeGoalComment,
  replaceGoal,
  replaceGoalComment,
  resolveGoalOwner,
  type GoalOwnerOption,
  type CascadeRecipient,
  type CascadeToOption,
  type LineManagerCascade,
  type ResolvedGoalOwner,
} from "@/lib/goals/operations";
import {
  deriveGoalCapabilities,
  orderManagerReports,
  selectActorApprovalQueue,
  selectManagerReports,
  type GoalCapabilities,
} from "@/lib/goals/permissions";
import {
  getGoalsSnapshotForCycle,
  setActivePerson,
} from "@/lib/goals/store";
import type {
  DemoPerson,
  Goal,
  GoalsSnapshot,
  PersonGoals,
} from "@/lib/goals/types";
import { newId } from "@/lib/goals/weightage";
import { hasSystemPermission } from "@/lib/accessControl/types";
import { useSharedGoalsSnapshot } from "@/lib/goals/useSharedGoalsSnapshot";
import { useCurrentPerson } from "@/lib/useCurrentPerson";

export type GoalsControllerActions = {
  saveGoals: (subjectId: string, goals: Goal[]) => Promise<boolean>;
  saveGoal: (subjectId: string, goal: Goal) => Promise<void>;
  saveProgress: (subjectId: string, goals: Goal[]) => Promise<boolean>;
  addComment: (
    subjectId: string,
    goalId: string,
    text: string,
  ) => Promise<void>;
  updateComment: (
    subjectId: string,
    goalId: string,
    commentId: string,
    text: string,
  ) => Promise<void>;
  removeComment: (
    subjectId: string,
    goalId: string,
    commentId: string,
  ) => Promise<void>;
  removeGoal: (subjectId: string, goalId: string) => Promise<void>;
  copyPreviousGoals: (subjectId: string) => Promise<Goal | null>;
  duplicateGoal: (
    subjectId: string,
    goalId: string,
    targetCycleId?: string,
  ) => Promise<Goal | null>;
  cascadeGoal: (
    subjectId: string,
    goalId: string,
    reportIds: string[],
  ) => Promise<void>;
  linkCascadeTo: (
    subjectId: string,
    goalId: string,
    child: CascadeToOption,
  ) => Promise<void>;
  unlinkCascadeTo: (
    subjectId: string,
    goalId: string,
    child: { personId: string; goalId: string },
  ) => Promise<void>;
  saveAndSubmit: (
    subjectId: string,
    goals: Goal[],
    lateJustification?: string,
  ) => Promise<boolean>;
  approve: (subjectId: string, goals?: Goal[]) => Promise<void>;
  sendBack: (subjectId: string, reason: string) => Promise<void>;
};

export type GoalsController = {
  snapshot: GoalsSnapshot | null;
  actor: DemoPerson | null;
  subject: DemoPerson | null;
  subjectGoals: PersonGoals | null;
  subjectCycle: GoalsSnapshot["cycle"] | null;
  /** False until review groups are loaded - do not treat unknown as eligible. */
  cycleMembershipReady: boolean;
  previousCycle: { id: string; label: string; goalCount: number } | null;
  /** Direct reports of `subject`, not of the signed-in actor. */
  reports: { person: DemoPerson; row: PersonGoals }[];
  ownerOptions: GoalOwnerOption[];
  /** Line manager goals the page subject can cascade from. */
  cascadeFrom: LineManagerCascade;
  cascadeFromFor: (subjectId: string) => LineManagerCascade;
  cascadeRecipientsFor: (goalId: string) => CascadeRecipient[];
  cascadeToOptionsFor: (goalId: string) => CascadeToOption[];
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
  syncActiveSelection = true,
}: {
  cycleId?: string;
  subjectId: string;
  /**
   * Overlay drawers already have a hydrated snapshot. Retargeting the store
   * here would refetch and delay edit actions on first paint.
   */
  syncActiveSelection?: boolean;
}): GoalsController {
  const actor = useCurrentPerson();
  const snapshot = useSharedGoalsSnapshot();
  const cycleMembershipReady = useReviewCyclesHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutationQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingMutationCountRef = useRef(0);

  useEffect(() => {
    if (!syncActiveSelection) return;
    if (cycleId) void selectGoalCycle(cycleId);
    setActivePerson(subjectId);
  }, [cycleId, subjectId, syncActiveSelection]);

  useEffect(() => {
    void hydrateManagerDelegations().catch(() => {
      /* Delegation list stays empty until the viewer can load it. */
    });
  }, []);

  const subject = useMemo(() => {
    if (!snapshot) return null;
    return snapshot.people.find((person) => person.id === subjectId) ?? null;
  }, [snapshot, subjectId]);

  const subjectGoals = subject
    ? (snapshot?.byPerson[subject.id] ?? null)
    : null;
  const subjectCycle = snapshot
    ? goalsCycleForPerson(snapshot.cycle, subjectId)
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
        ? selectActorApprovalQueue(
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

  const recipientsBySource = useMemo(
    () => indexCascadeRecipients(snapshot),
    [snapshot],
  );

  const cascadeRecipientsFor = useCallback(
    (goalId: string) => recipientsBySource.get(goalId) ?? [],
    [recipientsBySource],
  );

  const cascadeToOptionsFor = useCallback(
    (goalId: string) => reportCascadeOptions(subject, snapshot, goalId),
    [snapshot, subject],
  );

  const capabilitiesFor = useCallback(
    (targetSubjectId: string): GoalCapabilities | null => {
      if (!snapshot || !actor) return null;
      const target = snapshot.people.find(
        (person) => person.id === targetSubjectId,
      );
      const row = snapshot.byPerson[targetSubjectId];
      if (!target || !row) return null;
      const actorFromSnapshot = snapshot.people.find(
        (person) => person.id === actor.id || person.email === actor.email,
      );
      const actorForCaps = actorFromSnapshot
        ? {
            ...actor,
            reportIds: Array.from(
              new Set([...actor.reportIds, ...actorFromSnapshot.reportIds]),
            ),
            managerId: actor.managerId ?? actorFromSnapshot.managerId,
          }
        : actor;
      const personCycle = goalsCycleForPerson(snapshot.cycle, targetSubjectId);
      const capabilities = deriveGoalCapabilities({
        actor: actorForCaps,
        subject: target,
        row,
        cycle: personCycle,
        cycleStatus: snapshot.cycleStatus,
        people: snapshot.people,
      });
      if (!cycleMembershipReady) {
        return {
          ...capabilities,
          canEditStructure: false,
          canCreate: false,
          canRemove: false,
          canDuplicate: false,
          canCascade: false,
          canSubmit: false,
        };
      }
      return capabilities;
    },
    [actor, cycleMembershipReady, snapshot],
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
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        return undefined;
      } finally {
        pendingMutationCountRef.current -= 1;
        if (pendingMutationCountRef.current === 0) setBusy(false);
      }
    },
    [],
  );

  const actions = useMemo<GoalsControllerActions>(() => {
    return {
      async saveGoals(targetSubjectId, goals) {
        const result = await run(() =>
          saveGoals(mutationContext(targetSubjectId), goals),
        );
        return result !== undefined;
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
        const result = await run(() =>
          saveProgress(mutationContext(targetSubjectId), goals),
        );
        return result !== undefined;
      },
      async addComment(targetSubjectId, goalId, text) {
        if (!actor) throw new Error("Not signed in.");
        const row = snapshot?.byPerson[targetSubjectId];
        if (!row) throw new Error("Unknown goals subject.");
        const trimmed = text.trim();
        if (!trimmed) return;
        const mentionedIds = mentionedIdsIn(
          trimmed,
          snapshot?.people ?? [],
        );
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
                mentionedIds,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        });
        await run(() =>
          saveProgress(mutationContext(targetSubjectId), nextGoals),
        );
      },
      async updateComment(targetSubjectId, goalId, commentId, text) {
        if (!actor) throw new Error("Not signed in.");
        const row = snapshot?.byPerson[targetSubjectId];
        if (!row) throw new Error("Unknown goals subject.");
        const trimmed = text.trim();
        if (!trimmed) return;
        const comment = row.goals
          .find((goal) => goal.id === goalId)
          ?.comments?.find((entry) => entry.id === commentId);
        if (!comment) throw new Error("Unknown comment.");
        if (!isOwnGoalComment(comment, actor)) {
          throw new Error("You can only edit your own comments.");
        }
        await run(() =>
          saveProgress(
            mutationContext(targetSubjectId),
            replaceGoalComment(
              row.goals,
              goalId,
              commentId,
              trimmed,
              mentionedIdsIn(trimmed, snapshot?.people ?? []),
            ),
          ),
        );
      },
      async removeComment(targetSubjectId, goalId, commentId) {
        if (!actor) throw new Error("Not signed in.");
        const row = snapshot?.byPerson[targetSubjectId];
        if (!row) throw new Error("Unknown goals subject.");
        const comment = row.goals
          .find((goal) => goal.id === goalId)
          ?.comments?.find((entry) => entry.id === commentId);
        if (!comment) throw new Error("Unknown comment.");
        if (!isOwnGoalComment(comment, actor)) {
          throw new Error("You can only delete your own comments.");
        }
        await run(() =>
          saveProgress(
            mutationContext(targetSubjectId),
            removeGoalComment(row.goals, goalId, commentId),
          ),
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
      async duplicateGoal(targetSubjectId, goalId, targetCycleId) {
        if (!actor || !snapshot) throw new Error("Goals are still loading.");
        const sourceCycleId = cycleId ?? snapshot.cycle.id;
        await ensureGoalCycleHydrated(sourceCycleId);
        const sourceRow =
          getGoalsSnapshotForCycle(sourceCycleId).byPerson[targetSubjectId];
        if (!sourceRow) throw new Error("Unknown goals subject.");
        const source = sourceRow.goals.find((goal) => goal.id === goalId);
        if (!source) return null;
        const destCycleId = targetCycleId ?? sourceCycleId;
        await ensureGoalCycleHydrated(destCycleId);
        const destRow =
          getGoalsSnapshotForCycle(destCycleId).byPerson[targetSubjectId];
        if (!destRow) throw new Error("Unknown goals subject.");
        const sourceTitle =
          source.description.trim() || source.linkedGoalLabel?.trim() || 'Goal';
        const copy = duplicateGoal(source, {
          ownerId: targetSubjectId,
          sourceTitle,
        });
        await run(() =>
          saveGoals(
            {
              cycleId: destCycleId,
              actorId: actor.id,
              subjectId: targetSubjectId,
            },
            [...destRow.goals, copy],
          ),
        );
        return copy;
      },
      async cascadeGoal(targetSubjectId, goalId, reportIds) {
        if (!actor || !snapshot) throw new Error("Goals are still loading.");
        const subject = snapshot.people.find(
          (person) => person.id === targetSubjectId,
        );
        const allowedReportIds = hasSystemPermission(
          actor.permissions,
          "platform.write_all",
        )
          ? (subject?.reportIds ?? [])
          : isDelegatingForEmployee(actor.id, targetSubjectId)
            ? (subject?.reportIds ?? [])
            : effectiveReportIds(actor, snapshot.people);
        const chosenIds = [...new Set(reportIds)].filter((reportId) =>
          allowedReportIds.includes(reportId),
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
      async linkCascadeTo(targetSubjectId, goalId, child) {
        if (!actor || !snapshot) throw new Error("Goals are still loading.");
        const subjectPerson = snapshot.people.find(
          (person) => person.id === targetSubjectId,
        );
        const allowedReportIds = hasSystemPermission(
          actor.permissions,
          "platform.write_all",
        )
          ? (subjectPerson?.reportIds ?? [])
          : isDelegatingForEmployee(actor.id, targetSubjectId)
            ? (subjectPerson?.reportIds ?? [])
            : effectiveReportIds(actor, snapshot.people);
        if (!allowedReportIds.includes(child.personId)) {
          throw new Error("Select a report’s existing goal to cascade to.");
        }
        await run(() =>
          linkExistingGoalAsCascade(
            mutationContext(targetSubjectId),
            goalId,
            { personId: child.personId, goalId: child.id },
          ),
        );
      },
      async unlinkCascadeTo(targetSubjectId, goalId, child) {
        if (!actor || !snapshot) throw new Error("Goals are still loading.");
        await run(() =>
          unlinkCascadedGoal(mutationContext(targetSubjectId), goalId, child),
        );
      },
      async saveAndSubmit(targetSubjectId, goals, lateJustification) {
        const result = await run(() =>
          submitGoals(
            mutationContext(targetSubjectId),
            goals,
            lateJustification,
          ),
        );
        return result !== undefined;
      },
      async approve(targetSubjectId, goals) {
        await run(() => approveGoals(mutationContext(targetSubjectId), goals));
      },
      async sendBack(targetSubjectId, reason) {
        await run(() =>
          sendBackGoals(mutationContext(targetSubjectId), reason),
        );
      },
    };
  }, [actor, cycleId, mutationContext, run, snapshot]);

  return {
    snapshot,
    actor,
    subject,
    subjectGoals,
    subjectCycle,
    cycleMembershipReady,
    previousCycle,
    reports,
    ownerOptions,
    cascadeFrom,
    cascadeFromFor,
    cascadeRecipientsFor,
    cascadeToOptionsFor,
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
  return isEligibleForCycle(subject, goalsCycleForPerson(snapshot.cycle, subject.id));
}
