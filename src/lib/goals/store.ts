import { subscribeEmployeesStore } from "@/lib/employees/store";
import {
  notifyGoalApproved,
  notifyGoalCascaded,
  notifyGoalChangesRequireApproval,
  notifyGoalHardLock,
  notifyGoalProgressAdjusted,
  notifyGoalSentBack,
  notifyGoalsEditedByManager,
  notifyGoalSubmitted,
  withdrawGoalApprovalRequests,
} from "@/lib/notifications/goalEvents";
import { subscribeReviewsStore } from "@/lib/reviews/store";
import {
  listGoalCycleOptions,
  parseGoalsEmployeeId,
  pickDefaultCycleId,
  resolveGoalsCycle,
  resolveGoalsCycleStatus,
} from "./cyclesFromReviews";
import {
  createInitialSnapshot,
  FALLBACK_CYCLE,
  isEligibleForCycle,
} from "./demoData";
import { hasStructuralGoalChanges } from "./goalChanges";
import {
  emptyPersonGoals,
  mergePeopleIntoGoalsState,
} from "./peopleFromEmployees";
import { copyGoalToNewCycle } from "./operations";
import { delegationActingAs } from "@/lib/delegations/roles";
import { deriveGoalCapabilities, isDirectManager } from "./permissions";
import type {
  DemoPerson,
  DemoPhase,
  Goal,
  GoalsCycleOption,
  GoalsSnapshot,
  PersonGoals,
  SendBackAuthor,
} from "./types";

/** API snapshots store approver id/name only — fill photo from the live directory. */
function enrichApprovalActor(
  actor: SendBackAuthor | undefined,
  people: DemoPerson[],
): SendBackAuthor | undefined {
  if (!actor?.id) return actor;
  let next = actor;
  if (!actor.avatarUrl?.trim()) {
    const avatarUrl = people
      .find((person) => person.id === actor.id)
      ?.avatarUrl?.trim();
    if (avatarUrl) next = { ...next, avatarUrl };
  }
  const delegatedForName = actor.delegatingForName ?? actor.coveringForName;
  const delegatedForAvatar =
    actor.delegatingForAvatarUrl ?? actor.coveringForAvatarUrl;
  if (delegatedForName && !delegatedForAvatar?.trim()) {
    const delegatedAvatarUrl = people
      .find((person) => person.name === delegatedForName)
      ?.avatarUrl?.trim();
    if (delegatedAvatarUrl) {
      next = {
        ...next,
        delegatingForAvatarUrl: delegatedAvatarUrl,
        coveringForAvatarUrl: delegatedAvatarUrl,
      };
    }
  }
  return next;
}

function approvedByForActor(
  actor: DemoPerson,
  subject: DemoPerson,
  people: DemoPerson[],
): SendBackAuthor {
  const manager = delegationActingAs(actor.id, subject, people).asDirectManager
    ? people.find((person) => person.id === subject.managerId)
    : undefined;
  return {
    id: actor.id,
    name: actor.name,
    avatarUrl: actor.avatarUrl,
    delegatingForName: manager?.name,
    delegatingForAvatarUrl: manager?.avatarUrl,
    coveringForName: manager?.name,
    coveringForAvatarUrl: manager?.avatarUrl,
  };
}

function enrichPersonGoalsActors(
  row: PersonGoals,
  people: DemoPerson[],
): PersonGoals {
  const approvedBy = enrichApprovalActor(row.approvedBy, people);
  const sendBackBy = enrichApprovalActor(row.sendBackBy, people);
  if (approvedBy === row.approvedBy && sendBackBy === row.sendBackBy) {
    return row;
  }
  return { ...row, approvedBy, sendBackBy };
}
import { canSubmitGoals } from "./weightage";

/** Explicit cycle + actor so UI shells cannot mutate the wrong person or cycle. */
export type GoalMutationContext = {
  cycleId: string;
  actorId: string;
  subjectId: string;
};

/** v13: mixed seed measurements share 100% instead of parking it on the metric. */
const STORAGE_KEY = "pd-goals-demo-v13";
/** Skip v9 so uniform “all approved” demo rows are not carried over. */
const LEGACY_STORAGE_KEY = "pd-goals-demo-v8";
const OLDER_STORAGE_KEY = "pd-goals-demo-v7";

type GoalsPersisted = {
  activeCycleId: string;
  activePersonId: string;
  phaseByCycle: Record<string, DemoPhase>;
  byCycle: Record<string, Record<string, PersonGoals>>;
};

let memory: GoalsPersisted | null = null;
const listeners = new Set<() => void>();
let bridgesReady = false;
/** Pushed in by the auth layer — goals must not depend on auth. */
let signedInPersonId = "";
/** Reused until persist/directory/reviews change. Do not mutate. */
let snapshotCache: GoalsSnapshot | null = null;
let snapshotCacheDay = "";
let dateRefreshTimer: ReturnType<typeof setTimeout> | null = null;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function readRaw(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function useLocalGoalsPersistence(): boolean {
  return (
    import.meta.env.MODE === "test" ||
    import.meta.env.VITE_GOALS_BACKEND === "local" ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === "local"
  );
}

function writeStorage(state: GoalsPersisted): void {
  if (!useLocalGoalsPersistence()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function isPersisted(value: unknown): value is GoalsPersisted {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.activeCycleId === "string" &&
    typeof v.activePersonId === "string" &&
    typeof v.phaseByCycle === "object" &&
    v.phaseByCycle != null &&
    typeof v.byCycle === "object" &&
    v.byCycle != null
  );
}

/** Migrate v7 flat snapshot → per-cycle persistence. */
function migrateLegacy(value: unknown): GoalsPersisted | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const cycle = v.cycle as { id?: string; phase?: DemoPhase } | undefined;
  const byPerson = v.byPerson as Record<string, PersonGoals> | undefined;
  if (!cycle?.id || !byPerson) return null;
  return {
    activeCycleId: cycle.id,
    activePersonId:
      typeof v.activePersonId === "string" ? v.activePersonId : "",
    phaseByCycle: { [cycle.id]: cycle.phase ?? "window_open" },
    byCycle: { [cycle.id]: byPerson },
  };
}

function withoutEmptyDemoRows(state: GoalsPersisted): GoalsPersisted {
  const byCycle: GoalsPersisted["byCycle"] = {};
  for (const [cycleId, rows] of Object.entries(state.byCycle)) {
    byCycle[cycleId] = Object.fromEntries(
      Object.entries(rows).filter(([, row]) => {
        return row.goals.length > 0 || row.status !== "draft";
      }),
    );
  }
  return { ...state, byCycle };
}

function createInitialPersisted(): GoalsPersisted {
  const options = listGoalCycleOptions({});
  const activeCycleId = pickDefaultCycleId(options) ?? FALLBACK_CYCLE.id;
  return {
    activeCycleId,
    activePersonId: "",
    phaseByCycle: { [activeCycleId]: "window_open" },
    byCycle: {},
  };
}

function ensureBridges() {
  if (bridgesReady) return;
  bridgesReady = true;
  scheduleDateRefresh();
  subscribeEmployeesStore(() => {
    notify();
  });
  subscribeReviewsStore(() => {
    if (!memory) return;
    const options = listGoalCycleOptions(memory.phaseByCycle);
    if (options.length === 0) {
      notify();
      return;
    }
    if (!options.some((c) => c.id === memory!.activeCycleId)) {
      const nextId = pickDefaultCycleId(options);
      if (nextId) {
        memory = { ...memory, activeCycleId: nextId };
        writeStorage(memory);
      }
    }
    notify();
  });
}

function getPersisted(): GoalsPersisted {
  ensureBridges();
  if (!memory) {
    if (!useLocalGoalsPersistence()) {
      memory = createInitialPersisted();
      return memory;
    }
    const fresh = readRaw(STORAGE_KEY);
    if (isPersisted(fresh)) {
      memory = fresh;
    } else {
      const v8 = readRaw(LEGACY_STORAGE_KEY);
      const legacy = isPersisted(v8)
        ? withoutEmptyDemoRows(v8)
        : migrateLegacy(readRaw(OLDER_STORAGE_KEY));
      memory = legacy ?? createInitialPersisted();
      writeStorage(memory);
    }
  }
  return memory;
}

function emit(): void {
  listeners.forEach((l) => l());
}

function notify(): void {
  snapshotCache = null;
  snapshotCacheDay = "";
  emit();
}

function commit(next: GoalsPersisted): GoalsSnapshot {
  memory = next;
  writeStorage(next);
  snapshotCache = projectSnapshot(next);
  snapshotCacheDay = localDateKey();
  emit();
  return snapshotCache;
}

function localDateKey(now = new Date()): string {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function scheduleDateRefresh(): void {
  if (typeof window === "undefined" || dateRefreshTimer) return;
  const now = new Date();
  const nextDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  dateRefreshTimer = setTimeout(
    () => {
      dateRefreshTimer = null;
      notify();
      scheduleDateRefresh();
    },
    nextDay.getTime() - now.getTime() + 100,
  );
}

function phaseFor(state: GoalsPersisted, cycleId: string): DemoPhase {
  return state.phaseByCycle[cycleId] ?? "window_open";
}

function ensureCycleBucket(
  state: GoalsPersisted,
  cycleId: string,
): Record<string, PersonGoals> {
  return state.byCycle[cycleId] ?? {};
}

function projectSnapshot(state: GoalsPersisted): GoalsSnapshot {
  const options = listGoalCycleOptions(state.phaseByCycle);
  let activeCycleId = state.activeCycleId;

  if (options.length > 0 && !options.some((c) => c.id === activeCycleId)) {
    activeCycleId = pickDefaultCycleId(options) ?? options[0].id;
  }

  const phase = phaseFor(state, activeCycleId);
  const fromReviews = resolveGoalsCycle(
    activeCycleId,
    phase,
    new Date(),
    parseGoalsEmployeeId(state.activePersonId),
  );
  const option = options.find((c) => c.id === activeCycleId);

  const cycle = fromReviews ??
    option ?? {
      ...FALLBACK_CYCLE,
      phase,
    };

  const cycleStatus =
    resolveGoalsCycleStatus(cycle.id) ?? option?.status ?? "previous";

  const availableCycles: GoalsCycleOption[] =
    options.length > 0 ? options : [{ ...cycle, status: cycleStatus }];

  const bucket = ensureCycleBucket(state, cycle.id);
  const merged = mergePeopleIntoGoalsState({
    cycleId: cycle.id,
    byPerson: bucket,
    activePersonId: state.activePersonId,
    signedInPersonId,
    seedMissingPeople: useLocalGoalsPersistence(),
  });
  const enrichedByPerson = Object.fromEntries(
    Object.entries(merged.byPerson).map(([personId, row]) => [
      personId,
      enrichPersonGoalsActors(row, merged.people),
    ]),
  );
  const byPerson: Record<string, PersonGoals> = Object.fromEntries(
    Object.entries(enrichedByPerson).map(([personId, row]) => {
      const personCycle =
        resolveGoalsCycle(
          cycle.id,
          phase,
          new Date(),
          parseGoalsEmployeeId(personId),
        ) ?? cycle;
      const isPastGoalWindow =
        personCycle.postWindowGoalPolicy === "hard_stop" &&
        (personCycle.phase === "hard_lock" ||
          personCycle.phase === "check_in" ||
          personCycle.phase === "closed");
      const person = merged.people.find(
        (candidate) => candidate.id === personId,
      );
      const isIncomplete =
        isPastGoalWindow &&
        person &&
        isEligibleForCycle(person, personCycle) &&
        (row.status === "draft" || row.status === "sent_back");
      return [
        personId,
        isIncomplete ? { ...row, status: "incomplete" as const } : row,
      ];
    }),
  );

  return {
    cycle: {
      id: cycle.id,
      label: cycle.label,
      day1: cycle.day1,
      phase: cycle.phase,
      goalCountPolicy: cycle.goalCountPolicy,
      postWindowGoalPolicy: cycle.postWindowGoalPolicy,
      goalWindow: cycle.goalWindow,
      goalExtensions: cycle.goalExtensions,
      assignedGroupId: cycle.assignedGroupId,
    },
    cycleStatus,
    availableCycles,
    activePersonId: merged.activePersonId,
    people: merged.people,
    byPerson,
  };
}

export function subscribeGoalsStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function cachedSnapshot(state: GoalsPersisted = getPersisted()): GoalsSnapshot {
  const today = localDateKey();
  if (snapshotCache && snapshotCacheDay === today) return snapshotCache;
  snapshotCache = projectSnapshot(state);
  snapshotCacheDay = today;
  return snapshotCache;
}

export function getGoalsSnapshot(): GoalsSnapshot {
  return cachedSnapshot();
}

/**
 * Apply an authoritative remote submission into the local projection cache.
 * Used when `VITE_GOALS_BACKEND=api` so UI stays consistent after HTTP commands.
 */
export function mergeRemotePersonGoals(
  cycleId: string,
  personId: string,
  row: PersonGoals,
): GoalsSnapshot {
  return updatePersonGoals(cycleId, personId, () => ({
    ...row,
    personId,
  }));
}

function sameCycleRows(
  left: Record<string, PersonGoals> | undefined,
  right: Record<string, PersonGoals>,
): boolean {
  if (!left) return false;
  const leftIds = Object.keys(left);
  const rightIds = Object.keys(right);
  if (leftIds.length !== rightIds.length) return false;
  return leftIds.every(
    (personId) =>
      personId in right &&
      JSON.stringify(left[personId]) === JSON.stringify(right[personId]),
  );
}

/**
 * Replace one cycle's goal rows from the authoritative API response.
 * Production path: memory cache only — never writes browser storage.
 *
 * An unchanged response must not notify — otherwise every subscriber re-renders
 * for a payload that did not change.
 */
export function replaceCycleGoalsFromRemote(
  cycleId: string,
  submissions: PersonGoals[],
  options?: { activate?: boolean },
): GoalsSnapshot {
  const state = getPersisted();
  const existingBucket = state.byCycle[cycleId] ?? {};
  const byPerson: Record<string, PersonGoals> = {};
  for (const submission of submissions) {
    const existing = existingBucket[submission.personId];
    const incomingVersion = submission.version ?? 0;
    const existingVersion = existing?.version ?? 0;
    if (existing && existingVersion > incomingVersion) {
      byPerson[submission.personId] = existing;
      continue;
    }
    byPerson[submission.personId] = {
      ...submission,
      personId: submission.personId,
    };
  }
  for (const [personId, row] of Object.entries(existingBucket)) {
    if (!(personId in byPerson)) {
      byPerson[personId] = row;
    }
  }
  if (sameCycleRows(state.byCycle[cycleId], byPerson)) {
    return cachedSnapshot(state);
  }
  return commit({
    ...state,
    ...(options?.activate === false ? {} : { activeCycleId: cycleId }),
    byCycle: {
      ...state.byCycle,
      [cycleId]: byPerson,
    },
  });
}

export function getGoalsSnapshotForCycle(cycleId: string): GoalsSnapshot {
  const state = getPersisted();
  const options = listGoalCycleOptions(state.phaseByCycle);
  if (!options.some((cycle) => cycle.id === cycleId)) {
    return cachedSnapshot(state);
  }
  if (state.activeCycleId === cycleId) return cachedSnapshot(state);
  return projectSnapshot({ ...state, activeCycleId: cycleId });
}

export function resetGoalsDemo(): GoalsSnapshot {
  return commit(createInitialPersisted());
}

/** The signed-in person seeds in draft so goal setting stays reachable in demo data. */
export function setSignedInPerson(personId: string): void {
  if (signedInPersonId === personId) return;
  signedInPersonId = personId;
  notify();
}

export function getSignedInPersonId(): string {
  return signedInPersonId;
}

export function setActivePerson(personId: string): GoalsSnapshot {
  const state = getPersisted();
  if (!personId) return cachedSnapshot(state);
  if (state.activePersonId === personId) return cachedSnapshot(state);
  const snap = cachedSnapshot(state);
  if (!snap.people.some((p) => p.id === personId)) {
    return snap;
  }
  return commit({ ...state, activePersonId: personId });
}

export function setDemoPhase(phase: DemoPhase): GoalsSnapshot {
  const state = getPersisted();
  return commit({
    ...state,
    phaseByCycle: {
      ...state.phaseByCycle,
      [state.activeCycleId]: phase,
    },
  });
}

/** Switch the active review/goal cycle; goals are scoped per cycle. */
export function setActiveCycle(cycleId: string): GoalsSnapshot {
  const state = getPersisted();
  const options = listGoalCycleOptions(state.phaseByCycle);
  const next = options.find((c) => c.id === cycleId);
  if (!next || next.id === state.activeCycleId) {
    return cachedSnapshot(state);
  }
  return commit({
    ...state,
    activeCycleId: next.id,
    phaseByCycle: {
      ...state.phaseByCycle,
      [next.id]: state.phaseByCycle[next.id] ?? next.phase,
    },
  });
}

function updatePersonGoals(
  cycleId: string,
  personId: string,
  updater: (current: PersonGoals) => PersonGoals | null,
): GoalsSnapshot {
  const state = getPersisted();
  const snap = projectSnapshot({ ...state, activeCycleId: cycleId });
  if (snap.cycle.id !== cycleId) {
    throw new Error("Unknown goal cycle.");
  }
  const bucket = { ...ensureCycleBucket(state, cycleId) };
  for (const person of snap.people) {
    if (!bucket[person.id]) {
      bucket[person.id] =
        snap.byPerson[person.id] ?? emptyPersonGoals(person.id);
    }
  }
  const current = bucket[personId];
  if (!current) return clone(snap);
  const updated = updater(current);
  if (!updated) return clone(snap);
  bucket[personId] = updated;
  return commit({
    ...state,
    activeCycleId: cycleId,
    activePersonId: state.activePersonId,
    byCycle: { ...state.byCycle, [cycleId]: bucket },
  });
}

function requireMutationActors(context: GoalMutationContext): {
  snap: GoalsSnapshot;
  actor: NonNullable<GoalsSnapshot["people"][number]>;
  subject: NonNullable<GoalsSnapshot["people"][number]>;
  row: PersonGoals;
} {
  const snap = getGoalsSnapshotForCycle(context.cycleId);
  if (snap.cycle.id !== context.cycleId) {
    throw new Error("Unknown goal cycle.");
  }
  const actor = snap.people.find((person) => person.id === context.actorId);
  const subject = snap.people.find((person) => person.id === context.subjectId);
  const row = snap.byPerson[context.subjectId];
  if (!actor || !subject || !row) {
    throw new Error("Unknown actor or subject for this goal action.");
  }
  return { snap, actor, subject, row };
}

function capabilitiesFor(context: GoalMutationContext) {
  const { snap, actor, subject, row } = requireMutationActors(context);
  const cycle =
    resolveGoalsCycle(
      snap.cycle.id,
      snap.cycle.phase,
      new Date(),
      parseGoalsEmployeeId(subject.id),
    ) ?? snap.cycle;
  return {
    snap,
    actor,
    subject,
    row,
    cycle,
    capabilities: deriveGoalCapabilities({
      actor,
      subject,
      row,
      cycle,
      cycleStatus: snap.cycleStatus,
      people: snap.people,
    }),
  };
}

export function savePersonGoals(
  context: GoalMutationContext,
  goals: Goal[],
): GoalsSnapshot {
  const { actor, subject, row, cycle, capabilities } =
    capabilitiesFor(context);
  if (!capabilities.canEditStructure) {
    throw new Error("You do not have permission to edit these goals.");
  }
  const hasStructuralChanges = hasStructuralGoalChanges(row.goals, goals);
  const next = updatePersonGoals(context.cycleId, context.subjectId, (current) => {
    if (
      current.status !== "draft" &&
      current.status !== "sent_back" &&
      current.status !== "submitted" &&
      current.status !== "approved"
    ) {
      return null;
    }
    const ownerStartedRevision =
      actor.id === subject.id &&
      hasStructuralChanges &&
      (current.status === "submitted" || current.status === "approved");
    if (ownerStartedRevision) {
      return {
        ...current,
        status: "draft",
        postWindowApprovalStage: undefined,
        goals: clone(goals),
        managerNote: undefined,
        sendBackReason: undefined,
        sendBackBy: undefined,
        approvedBy: undefined,
        rating: undefined,
      };
    }
    if (
      current.status === "approved" &&
      hasStructuralChanges
    ) {
      return {
        ...current,
        status: "submitted",
        postWindowApprovalStage:
          cycle.phase === "hard_lock" &&
          cycle.postWindowGoalPolicy === "two_tier_approval"
            ? "manager"
            : undefined,
        goals: clone(goals),
        managerNote: undefined,
        approvedBy: undefined,
        rating: undefined,
      };
    }
    return { ...current, goals: clone(goals) };
  });
  if (
    hasStructuralChanges &&
    actor.id === subject.id &&
    (row.status === "submitted" || row.status === "approved")
  ) {
    withdrawGoalApprovalRequests({ snapshot: next, subject });
  }
  if (
    hasStructuralChanges &&
    row.status === "approved" &&
    actor.id !== subject.id
  ) {
    notifyGoalChangesRequireApproval({
      snapshot: next,
      actor,
      subject,
      row: next.byPerson[subject.id],
    });
  } else if (hasStructuralChanges && actor.id !== subject.id) {
    const previousIds = new Set(row.goals.map((goal) => goal.id));
    const cascadedGoal = goals.find(
      (goal) => !previousIds.has(goal.id) && Boolean(goal.cascadedFromGoalId),
    );
    if (cascadedGoal) {
      notifyGoalCascaded({
        snapshot: next,
        actor,
        subject,
        goal: cascadedGoal,
      });
    } else {
      notifyGoalsEditedByManager({ snapshot: next, actor, subject });
    }
  }
  return next;
}

/** Populate an empty current-cycle draft from the nearest earlier cycle. */
export function copyPreviousCycleGoals(
  context: GoalMutationContext,
): GoalsSnapshot {
  const { snap, row, capabilities } = capabilitiesFor(context);
  if (!capabilities.canEditStructure) {
    throw new Error(
      "You do not have permission to copy goals into this cycle.",
    );
  }
  if (row.status !== "draft" || row.goals.length > 0) {
    throw new Error("Previous goals can only be copied into an empty draft.");
  }

  const previousCycle = [...snap.availableCycles]
    .filter((cycle) => cycle.day1 < snap.cycle.day1)
    .sort((left, right) => right.day1.localeCompare(left.day1))[0];
  if (!previousCycle) {
    throw new Error("No previous cycle is available.");
  }

  const previousGoals =
    getGoalsSnapshotForCycle(previousCycle.id).byPerson[context.subjectId]
      ?.goals ?? [];
  if (previousGoals.length === 0) {
    throw new Error("No goals were found in the previous cycle.");
  }

  const copiedGoals = previousGoals.map((goal) =>
    copyGoalToNewCycle(goal, context.subjectId),
  );
  return updatePersonGoals(context.cycleId, context.subjectId, (current) => ({
    ...current,
    status: "draft",
    goals: copiedGoals,
    sendBackReason: undefined,
    sendBackBy: undefined,
    approvedBy: undefined,
    managerNote: undefined,
    rating: undefined,
  }));
}

export function submitPersonGoals(context: GoalMutationContext): GoalsSnapshot {
  const { actor, subject, row, cycle, capabilities } =
    capabilitiesFor(context);
  if (!capabilities.canSubmit) {
    throw new Error("You do not have permission to submit these goals.");
  }

  if (!isEligibleForCycle(subject, cycle)) {
    return updatePersonGoals(context.cycleId, context.subjectId, (current) => ({
      ...current,
      status: "not_eligible",
      goals: [],
    }));
  }
  if (row.status !== "draft" && row.status !== "sent_back") {
    throw new Error("Goals are not in a submittable state.");
  }
  const check = canSubmitGoals(row.goals, cycle.goalCountPolicy);
  if (!check.ok) throw new Error(check.reasons[0] ?? "Cannot submit.");

  const next = updatePersonGoals(context.cycleId, context.subjectId, (current) => ({
    ...current,
    status: "submitted",
    postWindowApprovalStage:
      cycle.phase === "hard_lock" &&
      cycle.postWindowGoalPolicy === "two_tier_approval"
        ? "manager"
        : undefined,
    sendBackReason: undefined,
    sendBackBy: undefined,
  }));
  notifyGoalSubmitted({
    snapshot: next,
    actor,
    subject,
    previousStatus: row.status,
    row: next.byPerson[subject.id],
  });
  return next;
}

export function sendBackSubmission(
  context: GoalMutationContext,
  reason: string,
): GoalsSnapshot {
  const { actor, subject, row, capabilities } = capabilitiesFor(context);
  if (!capabilities.canSendBack) {
    throw new Error("You do not have permission to send these goals back.");
  }
  const normalizedReason = reason.trim() || "Please revise and resubmit.";
  const next = updatePersonGoals(context.cycleId, context.subjectId, (current) => {
    if (current.status !== "submitted" && current.status !== "approved") {
      return null;
    }
    return {
      ...current,
      status: "sent_back",
      postWindowApprovalStage: undefined,
      sendBackReason: normalizedReason,
      sendBackBy: {
        id: actor.id,
        name: actor.name,
        ...(actor.avatarUrl ? { avatarUrl: actor.avatarUrl } : {}),
      },
      managerNote: undefined,
      approvedBy: undefined,
      rating: undefined,
    };
  });
  notifyGoalSentBack({
    snapshot: next,
    actor,
    subject,
    previousRow: row,
    reason: normalizedReason,
  });
  return next;
}

export function approveSubmission(
  context: GoalMutationContext,
  goals?: Goal[],
): GoalsSnapshot {
  const { actor, subject, row, capabilities, snap } = capabilitiesFor(context);
  if (!capabilities.canApprove) {
    throw new Error("You do not have permission to approve these goals.");
  }
  const next = updatePersonGoals(context.cycleId, context.subjectId, (current) => {
    if (current.status !== "submitted") return null;
    if (current.postWindowApprovalStage === "manager") {
      const manager = snap.people.find(
        (person) => person.id === subject.managerId,
      );
      const skipLevel = manager?.managerId
        ? snap.people.find((person) => person.id === manager.managerId)
        : undefined;
      return {
        ...current,
        postWindowApprovalStage: "manager_manager",
        goals: clone(goals ?? current.goals),
        sendBackReason: undefined,
        sendBackBy: undefined,
        approvedBy: undefined,
        managerNote: skipLevel
          ? `${actor.name} approved · awaiting ${skipLevel.name}`
          : `${actor.name} approved`,
      };
    }
    return {
      ...current,
      status: "approved",
      postWindowApprovalStage: undefined,
      goals: clone(goals ?? current.goals),
      sendBackReason: undefined,
      sendBackBy: undefined,
      approvedBy: approvedByForActor(actor, subject, snap.people),
      managerNote: "Approved",
    };
  });
  if (row.status === "submitted") {
    notifyGoalApproved({
      snapshot: next,
      actor,
      subject,
      previousRow: row,
    });
  }
  return next;
}

export function updateGoalProgress(
  context: GoalMutationContext,
  goals: Goal[],
): GoalsSnapshot {
  const { actor, subject, row, capabilities } = capabilitiesFor(context);
  if (!capabilities.canUpdateProgress) {
    throw new Error("You do not have permission to update progress.");
  }
  const next = updatePersonGoals(context.cycleId, context.subjectId, (current) => {
    if (
      current.status !== "draft" &&
      current.status !== "sent_back" &&
      current.status !== "submitted" &&
      current.status !== "approved"
    ) {
      throw new Error("Progress cannot be updated for these goals.");
    }
    if (hasStructuralGoalChanges(current.goals, goals)) {
      throw new Error("Structural goal changes must use the goal editor.");
    }
    return { ...current, goals: clone(goals) };
  });
  const previousById = new Map(row.goals.map((goal) => [goal.id, goal]));
  const changedGoalCount = goals.filter((goal) => {
    const previous = previousById.get(goal.id);
    if (!previous) return false;
    return JSON.stringify(previous.measurements) !== JSON.stringify(goal.measurements);
  }).length;
  notifyGoalProgressAdjusted({
    snapshot: next,
    actor,
    subject,
    changedGoalCount,
  });
  return next;
}

/** Mark incomplete when hard lock hits and still draft (demo helper). */
export function applyHardLockIncompletes(): GoalsSnapshot {
  const state = getPersisted();
  const snap = projectSnapshot(state);
  const cycleId = snap.cycle.id;
  const bucket = { ...ensureCycleBucket(state, cycleId) };
  const newlyIncomplete: DemoPerson[] = [];
  const phase = phaseFor(state, cycleId);

  for (const person of snap.people) {
    const row = snap.byPerson[person.id] ?? emptyPersonGoals(person.id);
    bucket[person.id] = row;
    const personCycle =
      resolveGoalsCycle(
        cycleId,
        phase,
        new Date(),
        parseGoalsEmployeeId(person.id),
      ) ?? snap.cycle;
    if (personCycle.postWindowGoalPolicy !== "hard_stop") continue;
    if (row.status === "draft" || row.status === "sent_back") {
      if (isEligibleForCycle(person, personCycle)) {
        bucket[person.id] = { ...row, status: "incomplete" };
        newlyIncomplete.push(person);
      }
    }
  }

  const next = commit({
    ...state,
    activeCycleId: cycleId,
    phaseByCycle: {
      ...state.phaseByCycle,
      [cycleId]: "hard_lock",
    },
    byCycle: { ...state.byCycle, [cycleId]: bucket },
  });
  for (const person of newlyIncomplete) notifyGoalHardLock(next, person);
  return next;
}

export function assertIsDirectManager(
  actorId: string,
  subjectId: string,
): boolean {
  const snap = getGoalsSnapshot();
  const actor = snap.people.find((person) => person.id === actorId);
  const subject = snap.people.find((person) => person.id === subjectId);
  if (!actor || !subject) return false;
  return (
    isDirectManager(actor, subject) ||
    delegationActingAs(actorId, subject, snap.people).asDirectManager
  );
}

/** Re-export for callers that still build an empty shell. */
export { createInitialSnapshot };
