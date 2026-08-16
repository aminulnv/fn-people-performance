import { isEligibleForCycle } from "./demoData";
import { hasSystemPermission } from "@/lib/accessControl/types";
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
  canRate: boolean;
  canViewAsManager: boolean;
};

const MUTABLE_STATUSES: SubmissionStatus[] = [
  "draft",
  "sent_back",
  "submitted",
  "approved",
];

export function isDirectManager(
  actor: DemoPerson,
  subject: DemoPerson,
): boolean {
  return subject.managerId === actor.id || actor.reportIds.includes(subject.id);
}

export function isManagerManager(
  actor: DemoPerson,
  subject: DemoPerson,
): boolean {
  return Boolean(
    subject.managerId && actor.reportIds.includes(subject.managerId),
  );
}

export function canMutateGoalStatus(status: SubmissionStatus): boolean {
  return MUTABLE_STATUSES.includes(status);
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
  const mutable = canMutateGoalStatus(row.status);
  const currentCycle = cycleStatus === "current" || cycleStatus === "manual";
  const windowOpen = cycle.phase === "window_open";
  const postWindowInputOpen =
    cycle.phase === "hard_lock" &&
    cycle.postWindowGoalPolicy === "two_tier_approval";
  const goalInputOpen = windowOpen || postWindowInputOpen;
  const selfOrManager = isSelfOrManager(actor, subject);
  const isSelf = actor.id === subject.id;
  const manager = isDirectManager(actor, subject);
  const managerManager = isManagerManager(actor, subject);
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
      ((isSelf && actor.reportIds.length > 0) ||
        (canWriteAll && subject.reportIds.length > 0)),
    canSubmit:
      (isSelf || canWriteAll) &&
      eligible &&
      goalInputOpen &&
      (row.status === "draft" || row.status === "sent_back"),
    canApprove:
      row.status === "submitted" &&
      (canWriteAll ||
        (isPostWindowManagerApproval && manager) ||
        (isPostWindowManagerManagerApproval && managerManager) ||
        (!row.postWindowApprovalStage && manager)),
    canSendBack:
      (canWriteAll ||
        (isPostWindowManagerManagerApproval ? managerManager : manager)) &&
      (row.status === "submitted" || row.status === "approved"),
    canRate:
      (manager || canWriteAll) &&
      currentCycle &&
      cycle.phase === "check_in" &&
      row.status === "approved" &&
      !row.rating,
    canViewAsManager: manager || canReadAll || canWriteAll,
  };
}

/**
 * Direct reports of `manager` — the person whose Reports section is on screen,
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
