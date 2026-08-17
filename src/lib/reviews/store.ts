import {
  buildDefaultStagesConfig,
  createInitialReviewsSnapshot,
  DEFAULT_CALIBRATION,
  normalizeCycleSettings,
  normalizeStagesConfig,
} from "./demoData";
import { findPeriod } from "./periods";
import type {
  CalibrationLogic,
  CycleSettings,
  CycleStagesConfig,
  GoalCycleExtension,
  ReviewCycle,
  ReviewCycleType,
  ReviewsSnapshot,
} from "./types";
import {
  createReviewCycleRemote,
  createTestCycleRemote,
  deleteReviewCycleRemote,
  fetchReviewCyclesRemote,
  updateCalibrationRemote,
  updateCycleSettingsRemote,
  updateCycleStagesRemote,
} from "./remoteApi";

/** Bumped when seed was reduced to Q3 2026 only. */
const STORAGE_KEY = "pd-reviews-cycles-v4";

let memory: ReviewsSnapshot | null = null;
let remoteHydrated = false;
const listeners = new Set<() => void>();

function useLocalReviews(): boolean {
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota */
  }
}

function getState(): ReviewsSnapshot {
  if (!memory) {
    if (!useLocalReviews()) {
      memory = { cycles: [] };
      return memory;
    }
    const stored = readStorage() ?? createInitialReviewsSnapshot();
    memory = {
      ...stored,
      cycles: stored.cycles.map((cycle) => ({
        ...cycle,
        settings: normalizeCycleSettings(cycle.settings),
        stagesConfig: normalizeStagesConfig(cycle.stagesConfig, {
          startDate: cycle.startDate,
          endDate: cycle.endDate,
        }),
      })),
    };
  }
  return memory;
}

function commit(next: ReviewsSnapshot): ReviewsSnapshot {
  memory = next;
  writeStorage(next);
  listeners.forEach((listener) => listener());
  return clone(next);
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

function cloneSettings(): CycleSettings {
  return normalizeCycleSettings();
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
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
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

export function newCycleId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

function replaceCycleInMemory(cycle: ReviewCycle): ReviewCycle {
  const normalizedCycle: ReviewCycle = {
    ...cycle,
    settings: normalizeCycleSettings(cycle.settings),
    stagesConfig: normalizeStagesConfig(cycle.stagesConfig, {
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    }),
  };
  const state = getState();
  const index = state.cycles.findIndex((item) => item.id === cycle.id);
  const cycles =
    index >= 0
      ? state.cycles.map((item, i) => (i === index ? normalizedCycle : item))
      : [normalizedCycle, ...state.cycles];
  commit({ cycles });
  return clone(normalizedCycle);
}

/** Hydrate the in-memory cache from the platform API when not in local mode. */
export async function ensureReviewCyclesLoaded(): Promise<void> {
  if (useLocalReviews() || remoteHydrated) return;
  const cycles = await fetchReviewCyclesRemote();
  memory = {
    cycles: cycles.map((cycle) => ({
      ...cycle,
      stagesConfig: normalizeStagesConfig(cycle.stagesConfig, {
        startDate: cycle.startDate,
        endDate: cycle.endDate,
      }),
    })),
  };
  remoteHydrated = true;
  listeners.forEach((listener) => listener());
}

export type CreateReviewCycleInput = {
  type: ReviewCycleType;
  periodKey?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
};

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
    cycle = {
      id: period.key,
      name: period.label,
      type: "regular",
      startDate: period.startDate,
      endDate: period.endDate,
      periodKey: period.key,
      stagesConfig: buildDefaultStagesConfig(period.startDate, period.endDate),
      settings: cloneSettings(),
      calibration: cloneCalibration(),
      createdAt,
      version: 1,
    };
  } else {
    const name = input.name?.trim() || "Ad-hoc cycle";
    const startDate = input.startDate ?? new Date().toISOString().slice(0, 10);
    const endDate = input.endDate ?? startDate;
    cycle = {
      id: newCycleId("adhoc"),
      name,
      type: "ad-hoc",
      startDate,
      endDate,
      stagesConfig: buildDefaultStagesConfig(startDate, endDate),
      settings: cloneSettings(),
      calibration: cloneCalibration(),
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

  const test: ReviewCycle = {
    ...clone(source),
    id: newCycleId(`test-${source.id}`),
    name: `${source.name} (Test)`,
    type: "ad-hoc",
    periodKey: undefined,
    isTest: true,
    createdAt: new Date().toISOString(),
    version: 1,
  };

  const state = getState();
  commit({ cycles: [test, ...state.cycles] });
  return test;
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
  const ranges = [
    [
      "Goal setting",
      config.goals.employee.startDate,
      config.goals.employee.endDate,
    ],
    [
      "Performance review",
      config.performance.employeeStart.date,
      config.performance.employeeEnd.date,
    ],
    [
      "Performance review",
      config.performance.managerStart.date,
      config.performance.managerEnd.date,
    ],
  ] as const;

  for (const [label, startDate, endDate] of ranges) {
    if (!startDate || !endDate) {
      throw new Error(`${label} requires a start and end date.`);
    }
    if (startDate > endDate) {
      throw new Error(`${label} must end on or after its start date.`);
    }
  }

  if (config.goals.employee.endDate >= config.performance.employeeStart.date) {
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
