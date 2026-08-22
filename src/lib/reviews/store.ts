import {
  buildDefaultStagesConfig,
  createInitialReviewsSnapshot,
  DEFAULT_CALIBRATION,
  normalizeCycleSettings,
  normalizeStagesConfig,
} from "./demoData";
import { inferPurpose, inferYearKey, suggestedSourceLinks } from "./purpose";
import {
  assignMembersExclusively,
  cloneCycleSettingsIntoGroup,
  cycleGroupsOf,
} from "./cycleGroups";
import { findPeriod } from "./periods";
import { applyCycleModules } from "./reviewStages";
import type {
  CalibrationLogic,
  CycleGroup,
  CycleModules,
  CyclePurpose,
  CycleSettings,
  CycleSourceLink,
  CycleStagesConfig,
  GoalCycleExtension,
  ReviewCycle,
  ReviewCycleType,
  ReviewsMutationError,
  ReviewsSnapshot,
} from "./types";
import { ApiError } from "@/lib/apiClient";
import {
  createCycleGroupRemote,
  createReviewCycleRemote,
  createTestCycleRemote,
  deleteCycleGroupRemote,
  deleteReviewCycleRemote,
  fetchReviewCyclesRemote,
  updateCalibrationRemote,
  updateCycleGroupRemote,
  updateCycleSettingsRemote,
  updateCycleStagesRemote,
  updateReviewCycleRemote,
} from "./remoteApi";

/** Bumped when seed was reduced to Q3 2026 only. */
const STORAGE_KEY = "pd-reviews-cycles-v4";

let memory: ReviewsSnapshot | null = null;
let remoteHydrated = false;
let localModeOverride: boolean | null = null;
const listeners = new Set<() => void>();
const pendingCycleSaves = new Map<string, Promise<ReviewCycle>>();

function useLocalReviews(): boolean {
  if (localModeOverride !== null) return localModeOverride;
  return (
    import.meta.env.MODE === "test" ||
    import.meta.env.VITE_REVIEWS_BACKEND === "local" ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === "local"
  );
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function readStorage(): ReviewsSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReviewsSnapshot;
  } catch {
    return null;
  }
}

function writeStorage(snapshot: ReviewsSnapshot): void {
  if (!useLocalReviews()) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cycles: snapshot.cycles }),
    );
  } catch {
    /* ignore quota */
  }
}

function getState(): ReviewsSnapshot {
  if (!memory) {
    if (!useLocalReviews()) {
      memory = { cycles: [], mutationError: null };
      return memory;
    }
    const stored = readStorage() ?? createInitialReviewsSnapshot();
    memory = {
      cycles: stored.cycles.map((cycle) => normalizeStoredCycle(cycle)),
      mutationError: null,
    };
  }
  return memory;
}

function commit(next: {
  cycles: ReviewCycle[];
  mutationError?: ReviewsMutationError | null;
}): ReviewsSnapshot {
  memory = {
    cycles: next.cycles,
    mutationError:
      next.mutationError !== undefined
        ? next.mutationError
        : (memory?.mutationError ?? null),
  };
  writeStorage(memory);
  listeners.forEach((listener) => listener());
  return clone(memory);
}

function validateGoalCountPolicy(
  policy: CycleSettings["goalCountPolicy"],
): void {
  const values = [
    policy.minimumRequired,
    policy.recommendedMinimum,
    policy.recommendedMaximum,
  ];
  if (values.some((value) => !Number.isInteger(value) || value < 1)) {
    throw new Error(
      "Goal-count values must be whole numbers greater than zero.",
    );
  }
  if (policy.recommendedMinimum < policy.minimumRequired) {
    throw new Error(
      "Recommended minimum cannot be lower than the required minimum.",
    );
  }
  if (policy.recommendedMaximum < policy.recommendedMinimum) {
    throw new Error(
      "Recommended maximum cannot be lower than the recommended minimum.",
    );
  }
  if (
    policy.maximumAllowed !== null &&
    (!Number.isInteger(policy.maximumAllowed) ||
      policy.maximumAllowed < policy.recommendedMaximum)
  ) {
    throw new Error(
      "Maximum allowed must be at least the recommended maximum, or left empty.",
    );
  }
}

/** Production API still validates legacy department/team goal windows until redeployed. */
function compatStagesConfigForRemote(config: CycleStagesConfig) {
  const employee = config.goals.employee;
  return {
    ...config,
    goals: {
      ...config.goals,
      department: employee,
      team: employee,
    },
  };
}

function cloneCalibration(): CalibrationLogic {
  return {
    ...DEFAULT_CALIBRATION,
    gradeDistribution: { ...DEFAULT_CALIBRATION.gradeDistribution },
    sltMemberIds: [...(DEFAULT_CALIBRATION.sltMemberIds ?? [])],
  };
}

export function subscribeReviewsStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper — clears in-memory + session state. */
export function resetReviewsStoreForTests(): void {
  memory = null;
  remoteHydrated = false;
  localModeOverride = null;
  pendingCycleSaves.clear();
  cycleIdSeq = 0;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Test helper — force the remote persist path without leaving Vitest. */
export function setReviewsLocalModeForTests(local: boolean | null): void {
  localModeOverride = local;
}

export function clearReviewsMutationError(): void {
  const state = getState();
  if (!state.mutationError) return;
  commit({ cycles: state.cycles, mutationError: null });
}

/**
 * Stable snapshot for `useSyncExternalStore` — same reference until `commit`.
 * Do not mutate the returned object; use the update helpers instead.
 */
export function getReviewsSnapshot(): ReviewsSnapshot {
  return getState();
}

export function listReviewCycles(): ReviewCycle[] {
  return getState().cycles;
}

export function getReviewCycle(cycleId: string): ReviewCycle | null {
  const decoded = decodeURIComponent(cycleId);
  return (
    getState().cycles.find(
      (cycle) => cycle.id === decoded || cycle.id === cycleId,
    ) ?? null
  );
}

let cycleIdSeq = 0;

export function newCycleId(prefix: string): string {
  cycleIdSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${cycleIdSeq.toString(36)}`;
}

function normalizeStoredCycle(cycle: ReviewCycle): ReviewCycle {
  const purpose =
    cycle.purpose ??
    inferPurpose(
      cycle.periodKey,
      cycle.type === "ad-hoc" ? "custom" : "quarterly_checkin",
    );
  return {
    ...cycle,
    purpose,
    yearKey: cycle.yearKey ?? inferYearKey(cycle.periodKey, cycle.startDate),
    sourceLinks: cycle.sourceLinks ?? [],
    settings: normalizeCycleSettings(cycle.settings, purpose),
    stagesConfig: normalizeStagesConfig(cycle.stagesConfig, {
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      purpose,
    }),
    groups: cycleGroupsOf(cycle).map((group) => ({
      ...group,
      cycleId: group.cycleId || cycle.id,
      settings: normalizeCycleSettings(group.settings, purpose),
      stagesConfig: normalizeStagesConfig(group.stagesConfig, {
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        purpose,
      }),
      memberIds: [...group.memberIds],
    })),
  };
}

function replaceCycleInMemory(cycle: ReviewCycle): ReviewCycle {
  const normalizedCycle = normalizeStoredCycle(cycle);
  const state = getState();
  const index = state.cycles.findIndex((item) => item.id === cycle.id);
  const cycles =
    index >= 0
      ? state.cycles.map((item, i) => (i === index ? normalizedCycle : item))
      : [normalizedCycle, ...state.cycles];
  commit({ cycles, mutationError: null });
  return clone(normalizedCycle);
}

/** Hydrate the in-memory cache from the platform API when not in local mode. */
export async function ensureReviewCyclesLoaded(): Promise<void> {
  if (useLocalReviews() || remoteHydrated) return;
  const cycles = await fetchReviewCyclesRemote();
  memory = {
    cycles: cycles.map((cycle) => normalizeStoredCycle(cycle)),
    mutationError: null,
  };
  remoteHydrated = true;
  listeners.forEach((listener) => listener());
}

export type CreateReviewCycleInput = {
  type: ReviewCycleType;
  purpose?: CyclePurpose;
  periodKey?: string;
  yearKey?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  sourceLinks?: CycleSourceLink[];
  modules?: CycleModules;
};

function applyCreateModules(
  config: CycleStagesConfig,
  modules: CycleModules | undefined,
  purpose: CyclePurpose,
  periodKey?: string,
): CycleStagesConfig {
  return modules
    ? applyCycleModules(config, modules, purpose, periodKey)
    : config
}

export async function createReviewCycle(
  input: CreateReviewCycleInput,
): Promise<ReviewCycle> {
  const createdAt = new Date().toISOString();

  let cycle: ReviewCycle;
  if (input.type === "regular") {
    const period = input.periodKey ? findPeriod(input.periodKey) : undefined;
    if (!period) {
      throw new Error("Select a cycle period before confirming.");
    }
    const existing = getState().cycles.some(
      (item) => item.periodKey === period.key && item.type === "regular",
    );
    if (existing && useLocalReviews()) {
      throw new Error(`${period.label} already exists.`);
    }
    const purpose =
      input.purpose ?? inferPurpose(period.key, "quarterly_checkin");
    cycle = {
      id: period.key,
      name: period.label,
      type: "regular",
      purpose,
      startDate: period.startDate,
      endDate: period.endDate,
      periodKey: period.key,
      yearKey: input.yearKey ?? inferYearKey(period.key, period.startDate),
      sourceLinks:
        input.sourceLinks ??
        (purpose === "annual_appraisal"
          ? suggestedSourceLinks(period.key.slice(-4), getState().cycles)
          : []),
      stagesConfig: applyCreateModules(
        buildDefaultStagesConfig(
          period.startDate,
          period.endDate,
          purpose,
          period.key,
        ),
        input.modules,
        purpose,
        period.key,
      ),
      settings: normalizeCycleSettings(undefined, purpose),
      calibration: cloneCalibration(),
      groups: [],
      createdAt,
      version: 1,
    };
  } else {
    const name = input.name?.trim() || "Ad-hoc cycle";
    const startDate = input.startDate ?? new Date().toISOString().slice(0, 10);
    const endDate = input.endDate ?? startDate;
    const purpose = input.purpose ?? "custom";
    cycle = {
      id: newCycleId("adhoc"),
      name,
      type: "ad-hoc",
      purpose,
      startDate,
      endDate,
      yearKey: input.yearKey ?? inferYearKey(undefined, startDate),
      sourceLinks: input.sourceLinks ?? [],
      stagesConfig: applyCreateModules(
        buildDefaultStagesConfig(startDate, endDate, purpose),
        input.modules,
        purpose,
      ),
      settings: normalizeCycleSettings(undefined, purpose),
      calibration: cloneCalibration(),
      groups: [],
      createdAt,
      version: 1,
    };
  }

  if (!useLocalReviews()) {
    const remote = await createReviewCycleRemote(cycle);
    return replaceCycleInMemory(remote);
  }

  const state = getState();
  commit({ cycles: [cycle, ...state.cycles] });
  return clone(cycle);
}

export async function createTestCycle(sourceId: string): Promise<ReviewCycle> {
  if (!useLocalReviews()) {
    const remote = await createTestCycleRemote(sourceId);
    return replaceCycleInMemory(remote);
  }

  const source = getReviewCycle(sourceId);
  if (!source) throw new Error("Cycle not found.");

  const testId = newCycleId(`test-${source.id}`);
  const test: ReviewCycle = {
    ...clone(source),
    id: testId,
    name: `${source.name} (Test)`,
    type: "ad-hoc",
    periodKey: undefined,
    isTest: true,
    createdAt: new Date().toISOString(),
    version: 1,
    groups: cycleGroupsOf(source).map((group) => ({
      ...clone(group),
      id: newCycleId("group"),
      cycleId: testId,
      version: 1,
    })),
  };

  const state = getState();
  commit({ cycles: [test, ...state.cycles] });
  return test;
}

export type UpdateReviewCycleInput = {
  name?: string;
  startDate?: string;
  endDate?: string;
  purpose?: CyclePurpose;
  yearKey?: string;
  sourceLinks?: CycleSourceLink[];
  settings?: Partial<CycleSettings>;
  stagesConfig?: CycleStagesConfig;
  calibration?: Partial<CalibrationLogic>;
};

function mergeCyclePatch(
  current: ReviewCycle,
  patch: UpdateReviewCycleInput,
): ReviewCycle {
  const settings = patch.settings;
  const goalCountPolicy = {
    ...current.settings.goalCountPolicy,
    ...settings?.goalCountPolicy,
  };
  if (settings?.goalCountPolicy) validateGoalCountPolicy(goalCountPolicy);

  const purpose = patch.purpose ?? current.purpose;
  const stagesConfig = patch.stagesConfig
    ? normalizeStagesConfig(patch.stagesConfig, {
        startDate: patch.startDate ?? current.startDate,
        endDate: patch.endDate ?? current.endDate,
        purpose,
      })
    : current.stagesConfig;
  if (patch.stagesConfig) validateCycleStagesConfig(stagesConfig);

  return {
    ...current,
    name: patch.name?.trim() || current.name,
    startDate: patch.startDate ?? current.startDate,
    endDate: patch.endDate ?? current.endDate,
    purpose,
    yearKey: patch.yearKey ?? current.yearKey,
    sourceLinks: patch.sourceLinks ?? current.sourceLinks,
    settings: {
      ...current.settings,
      reviewTypes: settings?.reviewTypes
        ? { ...settings.reviewTypes, line_manager: true }
        : current.settings.reviewTypes,
      goalCountPolicy,
      postWindowGoalPolicy:
        settings?.postWindowGoalPolicy ?? current.settings.postWindowGoalPolicy,
      excludedEmployeeIds:
        settings?.excludedEmployeeIds ?? current.settings.excludedEmployeeIds,
      autoScorecardGeneration:
        settings?.autoScorecardGeneration ??
        current.settings.autoScorecardGeneration,
      reviewPolicy: settings?.reviewPolicy ?? current.settings.reviewPolicy,
    },
    stagesConfig,
    calibration: patch.calibration
      ? {
          ...current.calibration,
          ...patch.calibration,
          gradeDistribution: patch.calibration.gradeDistribution
            ? { ...patch.calibration.gradeDistribution }
            : current.calibration.gradeDistribution,
        }
      : current.calibration,
  };
}

function cyclePatchIsNoop(current: ReviewCycle, next: ReviewCycle): boolean {
  return (
    current.name === next.name &&
    current.startDate === next.startDate &&
    current.endDate === next.endDate &&
    JSON.stringify(current.settings) === JSON.stringify(next.settings) &&
    JSON.stringify(current.stagesConfig) === JSON.stringify(next.stagesConfig) &&
    JSON.stringify(current.calibration) === JSON.stringify(next.calibration)
  );
}

function mutationErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | null;
    return body?.error ?? err.message;
  }
  return err instanceof Error ? err.message : "Could not save cycle settings.";
}

function buildReviewCycleRemoteBody(
  current: ReviewCycle,
  patch: UpdateReviewCycleInput,
  merged: ReviewCycle,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    expectedVersion: current.version,
  };
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.startDate !== undefined) body.startDate = patch.startDate;
  if (patch.endDate !== undefined) body.endDate = patch.endDate;
  if (patch.purpose !== undefined) body.purpose = patch.purpose;
  if (patch.yearKey !== undefined) body.yearKey = patch.yearKey;
  if (patch.sourceLinks !== undefined) body.sourceLinks = patch.sourceLinks;
  if (patch.settings) Object.assign(body, patch.settings);
  if (patch.stagesConfig) {
    body.stagesConfig = compatStagesConfigForRemote(merged.stagesConfig);
  }
  if (patch.calibration) body.calibration = patch.calibration;
  return body;
}

function applyReviewCycleUpdate(
  cycleId: string,
  patch: UpdateReviewCycleInput,
): Promise<ReviewCycle> {
  const state = getState();
  const index = state.cycles.findIndex((cycle) => cycle.id === cycleId);
  if (index < 0) throw new Error("Cycle not found.");

  const current = state.cycles[index];
  const merged = mergeCyclePatch(current, patch);
  if (cyclePatchIsNoop(current, merged)) return Promise.resolve(clone(current));

  const updatedAt = new Date().toISOString();
  if (useLocalReviews()) {
    const next: ReviewCycle = {
      ...merged,
      version: (current.version ?? 1) + 1,
      updatedAt,
    };
    const cycles = [...state.cycles];
    cycles[index] = next;
    commit({ cycles, mutationError: null });
    return Promise.resolve(clone(next));
  }

  const optimistic: ReviewCycle = { ...merged, updatedAt };
  const cycles = [...state.cycles];
  cycles[index] = optimistic;
  commit({ cycles, mutationError: null });

  return updateReviewCycleRemote(
    cycleId,
    buildReviewCycleRemoteBody(current, patch, merged),
  )
    .then((remote) =>
      replaceCycleInMemory({
        ...remote,
        stagesConfig: normalizeStagesConfig(remote.stagesConfig, {
          startDate: remote.startDate,
          endDate: remote.endDate,
        }),
      }),
    )
    .catch((err: unknown) => {
      const latest = getState();
      const revertIndex = latest.cycles.findIndex(
        (cycle) => cycle.id === cycleId,
      );
      const reverted =
        revertIndex >= 0
          ? latest.cycles.map((cycle, i) =>
              i === revertIndex ? current : cycle,
            )
          : latest.cycles;
      commit({
        cycles: reverted,
        mutationError: {
          cycleId,
          message: mutationErrorMessage(err),
        },
      });
      throw err;
    });
}

function trackPendingCycleSave(
  cycleId: string,
  run: Promise<ReviewCycle>,
): Promise<ReviewCycle> {
  pendingCycleSaves.set(cycleId, run);
  void run
    .finally(() => {
      if (pendingCycleSaves.get(cycleId) === run) {
        pendingCycleSaves.delete(cycleId);
      }
    })
    .catch(() => {
      /* Failures are stored on the snapshot for the cycle page. */
    });
  return run;
}

/**
 * Applies the patch locally immediately, then confirms with the API.
 * Validation throws synchronously so the editor can stay open.
 */
export function updateReviewCycle(
  cycleId: string,
  patch: UpdateReviewCycleInput,
): Promise<ReviewCycle> {
  const prior = pendingCycleSaves.get(cycleId);
  if (prior) {
    return trackPendingCycleSave(
      cycleId,
      prior.then(
        () => applyReviewCycleUpdate(cycleId, patch),
        () => applyReviewCycleUpdate(cycleId, patch),
      ),
    );
  }

  return trackPendingCycleSave(cycleId, applyReviewCycleUpdate(cycleId, patch));
}

function replaceGroupOnCycle(
  cycle: ReviewCycle,
  group: CycleGroup,
): ReviewCycle {
  const groups = assignMembersExclusively(
    cycleGroupsOf(cycle).some((item) => item.id === group.id)
      ? cycleGroupsOf(cycle).map((item) =>
          item.id === group.id ? group : item,
        )
      : [...cycleGroupsOf(cycle), group],
    group.id,
    group.memberIds,
  );
  return { ...cycle, groups };
}

export function createCycleGroup(
  cycleId: string,
  input: { name: string; memberIds?: number[] },
): Promise<CycleGroup> {
  const cycle = getReviewCycle(cycleId);
  if (!cycle) throw new Error("Cycle not found.");
  const group = cloneCycleSettingsIntoGroup(cycle, {
    id: newCycleId("group"),
    name: input.name,
    memberIds: input.memberIds,
  });

  if (!useLocalReviews()) {
    replaceCycleInMemory(replaceGroupOnCycle(cycle, group));
    return createCycleGroupRemote(cycleId, {
      name: group.name,
      memberIds: group.memberIds,
    })
      .then((remote) => {
        const latest = getReviewCycle(cycleId) ?? cycle;
        const withoutTemp = {
          ...latest,
          groups: cycleGroupsOf(latest).filter((item) => item.id !== group.id),
        };
        replaceCycleInMemory(replaceGroupOnCycle(withoutTemp, remote));
        return remote;
      })
      .catch((err: unknown) => {
        replaceCycleInMemory(cycle);
        commit({
          cycles: getState().cycles,
          mutationError: {
            cycleId,
            message: mutationErrorMessage(err),
          },
        });
        throw err;
      });
  }

  replaceCycleInMemory(replaceGroupOnCycle(cycle, group));
  return Promise.resolve(clone(group));
}

export type UpdateCycleGroupInput = {
  name?: string;
  memberIds?: number[];
  settings?: Partial<CycleSettings>;
  stagesConfig?: CycleStagesConfig;
  calibration?: Partial<CalibrationLogic>;
};

export function updateCycleGroup(
  cycleId: string,
  groupId: string,
  patch: UpdateCycleGroupInput,
): Promise<CycleGroup> {
  const cycle = getReviewCycle(cycleId);
  if (!cycle) throw new Error("Cycle not found.");
  const current = cycleGroupsOf(cycle).find((group) => group.id === groupId);
  if (!current) throw new Error("Group not found.");

  const next: CycleGroup = {
    ...current,
    name: patch.name?.trim() || current.name,
    memberIds:
      patch.memberIds != null
        ? [...new Set(patch.memberIds.map(Number).filter(Number.isInteger))]
        : current.memberIds,
    settings: patch.settings
      ? {
          ...current.settings,
          ...patch.settings,
          reviewTypes: patch.settings.reviewTypes
            ? { ...patch.settings.reviewTypes, line_manager: true }
            : current.settings.reviewTypes,
          goalCountPolicy: {
            ...current.settings.goalCountPolicy,
            ...patch.settings.goalCountPolicy,
          },
        }
      : current.settings,
    stagesConfig: patch.stagesConfig
      ? normalizeStagesConfig(patch.stagesConfig, {
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          purpose: cycle.purpose,
        })
      : current.stagesConfig,
    calibration: patch.calibration
      ? {
          ...current.calibration,
          ...patch.calibration,
          gradeDistribution: patch.calibration.gradeDistribution
            ? { ...patch.calibration.gradeDistribution }
            : current.calibration.gradeDistribution,
        }
      : current.calibration,
    updatedAt: new Date().toISOString(),
    version: (current.version ?? 1) + 1,
  };
  if (patch.settings?.goalCountPolicy) {
    validateGoalCountPolicy(next.settings.goalCountPolicy);
  }
  if (patch.stagesConfig) validateCycleStagesConfig(next.stagesConfig);

  if (!useLocalReviews()) {
    const body: Record<string, unknown> = {
      expectedVersion: current.version,
    };
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.memberIds !== undefined) body.memberIds = next.memberIds;
    if (patch.settings) Object.assign(body, patch.settings);
    if (patch.stagesConfig) body.stagesConfig = next.stagesConfig;
    if (patch.calibration) body.calibration = patch.calibration;
    replaceCycleInMemory(replaceGroupOnCycle(cycle, next));
    return updateCycleGroupRemote(cycleId, groupId, body)
      .then((remote) => {
        const latest = getReviewCycle(cycleId) ?? cycle;
        replaceCycleInMemory(replaceGroupOnCycle(latest, remote));
        return remote;
      })
      .catch((err: unknown) => {
        replaceCycleInMemory(cycle);
        commit({
          cycles: getState().cycles,
          mutationError: {
            cycleId,
            message: mutationErrorMessage(err),
          },
        });
        throw err;
      });
  }

  replaceCycleInMemory(replaceGroupOnCycle(cycle, next));
  return Promise.resolve(clone(next));
}

export function deleteCycleGroup(
  cycleId: string,
  groupId: string,
): Promise<void> {
  const cycle = getReviewCycle(cycleId);
  if (!cycle) throw new Error("Cycle not found.");
  if (!cycleGroupsOf(cycle).some((group) => group.id === groupId)) {
    throw new Error("Group not found.");
  }

  const next: ReviewCycle = {
    ...cycle,
    groups: cycleGroupsOf(cycle).filter((group) => group.id !== groupId),
  };

  if (!useLocalReviews()) {
    replaceCycleInMemory(next);
    return deleteCycleGroupRemote(cycleId, groupId).catch((err: unknown) => {
      replaceCycleInMemory(cycle);
      commit({
        cycles: getState().cycles,
        mutationError: {
          cycleId,
          message: mutationErrorMessage(err),
        },
      });
      throw err;
    });
  }

  replaceCycleInMemory(next);
  return Promise.resolve();
}

export async function updateCycleSettings(
  cycleId: string,
  patch: Partial<CycleSettings> & {
    name?: string;
    startDate?: string;
    endDate?: string;
  },
): Promise<ReviewCycle> {
  const state = getState();
  const index = state.cycles.findIndex((c) => c.id === cycleId);
  if (index < 0) throw new Error("Cycle not found.");

  const current = state.cycles[index];
  if (!useLocalReviews()) {
    const remote = await updateCycleSettingsRemote(cycleId, {
      ...patch,
      expectedVersion: current.version,
    });
    return replaceCycleInMemory(remote);
  }

  const goalCountPolicy = {
    ...current.settings.goalCountPolicy,
    ...patch.goalCountPolicy,
  };
  validateGoalCountPolicy(goalCountPolicy);
  const next: ReviewCycle = {
    ...current,
    name: patch.name?.trim() || current.name,
    startDate: patch.startDate ?? current.startDate,
    endDate: patch.endDate ?? current.endDate,
    settings: {
      ...current.settings,
      reviewTypes: patch.reviewTypes
        ? { ...patch.reviewTypes, line_manager: true }
        : current.settings.reviewTypes,
      goalCountPolicy,
      postWindowGoalPolicy:
        patch.postWindowGoalPolicy ?? current.settings.postWindowGoalPolicy,
      excludedEmployeeIds:
        patch.excludedEmployeeIds ?? current.settings.excludedEmployeeIds,
      autoScorecardGeneration:
        patch.autoScorecardGeneration ??
        current.settings.autoScorecardGeneration,
    },
    version: (current.version ?? 1) + 1,
    updatedAt: new Date().toISOString(),
  };

  const cycles = [...state.cycles];
  cycles[index] = next;
  commit({ cycles });
  return clone(next);
}

export async function updateCalibrationLogic(
  cycleId: string,
  patch: Partial<CalibrationLogic>,
): Promise<ReviewCycle> {
  const state = getState();
  const index = state.cycles.findIndex((c) => c.id === cycleId);
  if (index < 0) throw new Error("Cycle not found.");
  const current = state.cycles[index];

  if (!useLocalReviews()) {
    const remote = await updateCalibrationRemote(cycleId, {
      ...patch,
      expectedVersion: current.version,
    });
    return replaceCycleInMemory(remote);
  }

  const next: ReviewCycle = {
    ...current,
    calibration: {
      ...current.calibration,
      ...patch,
      gradeDistribution: patch.gradeDistribution
        ? { ...patch.gradeDistribution }
        : current.calibration.gradeDistribution,
    },
    version: (current.version ?? 1) + 1,
    updatedAt: new Date().toISOString(),
  };

  const cycles = [...state.cycles];
  cycles[index] = next;
  commit({ cycles });
  return clone(next);
}

export async function updateCycleStagesConfig(
  cycleId: string,
  stagesConfig: CycleStagesConfig,
  options?: { postWindowGoalPolicy?: CycleSettings["postWindowGoalPolicy"] },
): Promise<ReviewCycle> {
  const state = getState();
  const index = state.cycles.findIndex((c) => c.id === cycleId);
  if (index < 0) throw new Error("Cycle not found.");
  const current = state.cycles[index];
  const normalized = normalizeStagesConfig(stagesConfig, {
    startDate: current.startDate,
    endDate: current.endDate,
  });
  validateCycleStagesConfig(normalized);

  if (!useLocalReviews()) {
    const remote = await updateCycleStagesRemote(cycleId, {
      stagesConfig: compatStagesConfigForRemote(normalized),
      postWindowGoalPolicy: options?.postWindowGoalPolicy,
      expectedVersion: current.version,
    });
    return replaceCycleInMemory({
      ...remote,
      stagesConfig: normalizeStagesConfig(remote.stagesConfig, {
        startDate: remote.startDate,
        endDate: remote.endDate,
      }),
    });
  }

  const next: ReviewCycle = {
    ...current,
    stagesConfig: clone(normalized),
    settings: {
      ...current.settings,
      postWindowGoalPolicy:
        options?.postWindowGoalPolicy ?? current.settings.postWindowGoalPolicy,
    },
    version: (current.version ?? 1) + 1,
    updatedAt: new Date().toISOString(),
  };
  const cycles = [...state.cycles];
  cycles[index] = next;
  commit({ cycles });
  return clone(next);
}

function validateGoalExtensions(
  extensions: GoalCycleExtension[],
  baseEndDate: string,
  performanceStartDate: string,
): void {
  for (const extension of extensions) {
    if (!extension.endDate || extension.endDate <= baseEndDate) {
      throw new Error("An extension deadline must be after the standard goal deadline.");
    }
    if (extension.endDate >= performanceStartDate) {
      throw new Error("An extension deadline must be before performance review starts.");
    }

    const scope = extension.scope;
    const hasValidScope =
      (scope.type === "department" &&
        Number.isInteger(scope.departmentId) &&
        Boolean(scope.departmentName.trim())) ||
      (scope.type === "team" &&
        Number.isInteger(scope.teamId) &&
        Boolean(scope.teamName.trim())) ||
      (scope.type === "people" &&
        scope.employeeIds.length > 0 &&
        scope.employeeIds.every(Number.isInteger));
    if (!hasValidScope) {
      throw new Error("Each extension requires a valid team, department, or people selection.");
    }
  }
}

function validateCycleStagesConfig(config: CycleStagesConfig): void {
  const enabled = new Map(
    (config.reviewStages ?? []).map((stage) => [stage.id, stage.enabled]),
  );
  const hasStages = (config.reviewStages ?? []).length > 0;
  const goalsOn = hasStages ? enabled.get("goals") === true : true;
  const selfOn = enabled.get("self_review") === true;
  const managerOn = hasStages
    ? enabled.get("manager_review") === true
    : true;
  const reviewOn = selfOn || managerOn;

  const ranges: Array<[string, string, string]> = [];
  if (goalsOn) {
    ranges.push([
      "Goal setting",
      config.goals.employee.startDate,
      config.goals.employee.endDate,
    ]);
  }
  if (selfOn) {
    ranges.push([
      "Self-review",
      config.performance.employeeStart.date,
      config.performance.employeeEnd.date,
    ]);
  }
  if (managerOn) {
    ranges.push([
      "Manager review",
      config.performance.managerStart.date,
      config.performance.managerEnd.date,
    ]);
  }

  for (const [label, startDate, endDate] of ranges) {
    if (!startDate || !endDate) {
      throw new Error(`${label} requires a start and end date.`);
    }
    if (startDate > endDate) {
      throw new Error(`${label} must end on or after its start date.`);
    }
  }

  if (
    goalsOn &&
    reviewOn &&
    config.goals.employee.endDate >= config.performance.employeeStart.date
  ) {
    throw new Error(
      "Performance review must start after the employee goal lock date.",
    );
  }
  validateGoalExtensions(
    config.goals.extensions ?? [],
    config.goals.employee.endDate,
    config.performance.employeeStart.date,
  );
}

export async function deleteReviewCycle(cycleId: string): Promise<void> {
  const state = getState();
  const decoded = decodeURIComponent(cycleId);
  const current = state.cycles.find(
    (cycle) => cycle.id === cycleId || cycle.id === decoded,
  );
  if (!current) throw new Error("Cycle not found.");

  if (!useLocalReviews()) {
    await deleteReviewCycleRemote(current.id, current.version);
  }

  const nextCycles = state.cycles.filter(
    (cycle) => cycle.id !== cycleId && cycle.id !== decoded,
  );
  commit({ cycles: nextCycles });
}

/** Sort: Future → Current → Manual → Previous, then by start date desc. */
export function sortCyclesForList(
  cycles: ReviewCycle[],
  statusOf: (cycle: ReviewCycle) => string,
): ReviewCycle[] {
  const rank: Record<string, number> = {
    future: 0,
    current: 1,
    manual: 2,
    previous: 3,
  };
  return [...cycles].sort((a, b) => {
    const ra = rank[statusOf(a)] ?? 9;
    const rb = rank[statusOf(b)] ?? 9;
    if (ra !== rb) return ra - rb;
    return b.startDate.localeCompare(a.startDate);
  });
}
