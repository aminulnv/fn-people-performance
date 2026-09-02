import { isEligibleForCycle } from "./demoData";
import { isGoalWindowOpenForPerson } from "./goalExtensions";
import { hasSystemPermission } from "@/lib/accessControl/types";
import {
  delegationActingAs,
  effectiveReportIds,
  isDelegatingForEmployee,
} from "@/lib/delegations/roles";
import { listActiveDelegatedManagerIds } from "@/lib/delegations/store";
import type {
  DemoPerson,
  GoalsCycle,
  GoalsCycleStatus,
  PersonGoals,
  SubmissionStatus,
} from "./types";

export type GoalActionContext = {
  actor: DemoPerson;
  subject: DemoPerson;
  row: PersonGoals;
  cycle: GoalsCycle;
  cycleStatus: GoalsCycleStatus;
  people?: DemoPerson[];
  delegationAsDirectManager?: boolean;
  delegationAsSkipLevel?: boolean;
};

export type GoalCapabilities = {
  canEditStructure: boolean;
  canUpdateProgress: boolean;
  canCreate: boolean;
  canRemove: boolean;
  canDuplicate: boolean;
  canCascade: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canSendBack: boolean;
  canViewAsManager: boolean;
};

const MUTABLE_STATUSES: SubmissionStatus[] = [
  "draft",
  "sent_back",
  "submitted",
  "approved",
];

/** Late goal input after Day 30 when the cycle allows two-tier exception approval. */
export function isPostWindowGoalInputOpen(cycle: GoalsCycle): boolean {
  return (
    cycle.phase === "hard_lock" &&
    cycle.postWindowGoalPolicy === "two_tier_approval"
  );
}

/**
 * Incomplete only applies under hard_stop. Stored incomplete rows on two-tier
 * cycles (bad seed / old data) are treated as draft.
 */
export function normalizeGoalSubmissionStatus(
  status: SubmissionStatus,
  cycle: Pick<GoalsCycle, "postWindowGoalPolicy">,
): SubmissionStatus {
  if (
    status === "incomplete" &&
    cycle.postWindowGoalPolicy === "two_tier_approval"
  ) {
    return "draft";
  }
  return status;
}

/**
 * Incomplete is terminal under hard_stop. Under two-tier late input it stays
 * editable so people can still create, fix, and submit for exception approval.
 */
export function canMutateGoalStatus(
  status: SubmissionStatus,
  cycle?: GoalsCycle,
): boolean {
  if (MUTABLE_STATUSES.includes(status)) return true;
  return status === "incomplete" && Boolean(cycle && isPostWindowGoalInputOpen(cycle));
}

/** Still composing goals (not yet in the approval queue). */
export function isComposableGoalStatus(
  status: SubmissionStatus,
  cycle?: GoalsCycle,
): boolean {
  if (status === "draft" || status === "sent_back") return true;
  return status === "incomplete" && Boolean(cycle && isPostWindowGoalInputOpen(cycle));
}

export function isDirectManager(
  actor: DemoPerson,
  subject: DemoPerson,
): boolean {
  const actorId = String(actor.id)
  const subjectId = String(subject.id)
  return (
    (subject.managerId != null && String(subject.managerId) === actorId) ||
    actor.reportIds.some((id) => String(id) === subjectId)
  )
}

export function isManagerManager(
  actor: DemoPerson,
  subject: DemoPerson,
): boolean {
  return Boolean(
    subject.managerId && actor.reportIds.includes(subject.managerId),
  );
}

function isSelfOrManager(actor: DemoPerson, subject: DemoPerson): boolean {
  return actor.id === subject.id || isDirectManager(actor, subject);
}

/**
 * Corrected policy shared by V1 and V2. Actor identity comes from auth, not
 * the person in the URL.
 */
export function deriveGoalCapabilities(
  context: GoalActionContext,
): GoalCapabilities {
  const { actor, subject, row, cycle, cycleStatus } = context;
  const eligible = isEligibleForCycle(subject, cycle);
  const mutable = canMutateGoalStatus(row.status, cycle);
  const currentCycle = cycleStatus === "current";
  const windowOpen =
    cycle.phase === "window_open" ||
    (cycle.phase === "hard_lock" &&
      isGoalWindowOpenForPerson(cycle, subject));
  const postWindowInputOpen = isPostWindowGoalInputOpen(cycle);
  const goalInputOpen = windowOpen || postWindowInputOpen;
  const delegationRole =
    context.delegationAsDirectManager != null ||
    context.delegationAsSkipLevel != null
      ? {
          asDirectManager: Boolean(context.delegationAsDirectManager),
          asSkipLevel: Boolean(context.delegationAsSkipLevel),
        }
      : delegationActingAs(actor.id, subject, context.people ?? [], listActiveDelegatedManagerIds(actor.id));
  const selfOrManager =
    isSelfOrManager(actor, subject) || delegationRole.asDirectManager;
  const isSelf = actor.id === subject.id;
  const manager = isDirectManager(actor, subject) || delegationRole.asDirectManager;
  const managerManager =
    isManagerManager(actor, subject) || delegationRole.asSkipLevel;
  const isPostWindowManagerApproval = row.postWindowApprovalStage === "manager";
  const isPostWindowManagerManagerApproval =
    row.postWindowApprovalStage === "manager_manager";
  const canReadAll = hasSystemPermission(
    actor.permissions,
    "platform.read_all",
  );
  const canWriteAll = hasSystemPermission(
    actor.permissions,
    "platform.write_all",
  );
  const delegatingForSubject = isDelegatingForEmployee(actor.id, subject.id);
  const actorReportIds = effectiveReportIds(
    actor,
    context.people ?? [],
  );
  const canStructure =
    eligible &&
    mutable &&
    currentCycle &&
    goalInputOpen &&
    (selfOrManager || canWriteAll);

  const canProgress =
    eligible && mutable && currentCycle && (selfOrManager || canWriteAll);

  return {
    canEditStructure: canStructure,
    canUpdateProgress: canProgress,
    canCreate: canStructure,
    canRemove: canStructure,
    canDuplicate: canStructure,
    canCascade:
      canStructure &&
      ((isSelf && actorReportIds.length > 0) ||
        (delegatingForSubject && subject.reportIds.length > 0) ||
        (canWriteAll && subject.reportIds.length > 0)),
    canSubmit:
      (isSelf || canWriteAll) &&
      eligible &&
      goalInputOpen &&
      isComposableGoalStatus(row.status, cycle),
    canApprove:
      row.status === "submitted" &&
      (canWriteAll ||
        (isPostWindowManagerApproval && manager) ||
        (isPostWindowManagerManagerApproval && managerManager) ||
        (!row.postWindowApprovalStage && manager)),
    canSendBack:
      (canWriteAll ||
        (isPostWindowManagerManagerApproval ? managerManager : manager)) &&
      row.status === "submitted",
    canViewAsManager:
      manager || delegationRole.asSkipLevel || canReadAll || canWriteAll,
  };
}

/**
 * Direct reports of `manager` - the person whose Reports section is on screen,
 * which is not always the signed-in actor.
 */
export function selectManagerReports(
  manager: DemoPerson,
  people: DemoPerson[],
  byPerson: Record<string, PersonGoals>,
): { person: DemoPerson; row: PersonGoals }[] {
  return manager.reportIds
    .map((id) => {
      const person = people.find((candidate) => candidate.id === id);
      const row = byPerson[id];
      if (!person || !row) return null;
      return { person, row };
    })
    .filter(Boolean) as { person: DemoPerson; row: PersonGoals }[];
}

/** Merge this manager's queue with teams they are actively delegated for. */
export function selectActorApprovalQueue(
  actor: DemoPerson,
  people: DemoPerson[],
  byPerson: Record<string, PersonGoals>,
  coveredManagerIds = listActiveDelegatedManagerIds(actor.id),
): { person: DemoPerson; row: PersonGoals }[] {
  const queues = [
    selectManagerApprovalQueue(actor, people, byPerson),
    ...coveredManagerIds.flatMap((managerId) => {
      const manager = people.find((person) => person.id === managerId);
      return manager
        ? selectManagerApprovalQueue(manager, people, byPerson)
        : [];
    }),
  ];
  const seen = new Set<string>();
  const merged: { person: DemoPerson; row: PersonGoals }[] = [];
  for (const item of queues.flat()) {
    if (seen.has(item.person.id)) continue;
    seen.add(item.person.id);
    merged.push(item);
  }
  return merged;
}

/** Direct reports plus only skip-level late submissions awaiting this approver. */
export function selectManagerApprovalQueue(
  manager: DemoPerson,
  people: DemoPerson[],
  byPerson: Record<string, PersonGoals>,
): { person: DemoPerson; row: PersonGoals }[] {
  const directReports = selectManagerReports(manager, people, byPerson);
  const directReportIds = new Set(directReports.map(({ person }) => person.id));
  const lateSkipLevel = people
    .filter(
      (person) =>
        !directReportIds.has(person.id) &&
        Boolean(person.managerId) &&
        manager.reportIds.includes(person.managerId as string) &&
        byPerson[person.id]?.status === "submitted" &&
        byPerson[person.id]?.postWindowApprovalStage === "manager_manager",
    )
    .map((person) => ({ person, row: byPerson[person.id] }));

  return [...directReports, ...lateSkipLevel];
}

/** Reports whose goals are waiting on this manager to approve or send back. */
export function countPendingGoalApprovals(
  reports: readonly { row: PersonGoals }[],
): number {
  return reports.filter(({ row }) => row.status === "submitted").length;
}

/** Pending approvals in the signed-in manager’s My Reports queue. */
export function countPendingGoalApprovalsForManager(
  manager: DemoPerson,
  people: DemoPerson[],
  byPerson: Record<string, PersonGoals>,
): number {
  return countPendingGoalApprovals(
    selectActorApprovalQueue(manager, people, byPerson),
  );
}

/** Final late approvals first, then other pending, then the rest. */
export function orderManagerReports<T extends { row: PersonGoals }>(
  reports: T[],
): T[] {
  const isFinalLateApproval = (report: T) =>
    report.row.status === "submitted" &&
    report.row.postWindowApprovalStage === "manager_manager";
  const isPending = (report: T) =>
    report.row.status === "submitted" && !isFinalLateApproval(report);

  return [
    ...reports.filter(isFinalLateApproval),
    ...reports.filter(isPending),
    ...reports.filter((report) => report.row.status !== "submitted"),
  ];
}
