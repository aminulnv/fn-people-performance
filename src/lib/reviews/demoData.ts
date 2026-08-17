import { buildPeriod } from "./periods";
import type {
  CalibrationLogic,
  CycleSettings,
  CycleStagesConfig,
  DateTimeValue,
  ReviewCycle,
  ReviewsSnapshot,
} from "./types";

const DEFAULT_TIME = "14:00";

function at(date: string, time = DEFAULT_TIME): DateTimeValue {
  return { date, time };
}

export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  reviewTypes: {
    line_manager: true,
    self: false,
    upwards: false,
    peer: false,
    functional_manager: false,
  },
  goalCountPolicy: {
    minimumRequired: 2,
    recommendedMinimum: 3,
    recommendedMaximum: 5,
    maximumAllowed: null,
  },
  postWindowGoalPolicy: "two_tier_approval",
  excludedEmployeeIds: [],
  autoScorecardGeneration: false,
};

export function normalizeCycleSettings(
  settings?: Partial<CycleSettings>,
): CycleSettings {
  return {
    ...DEFAULT_CYCLE_SETTINGS,
    ...settings,
    reviewTypes: {
      ...DEFAULT_CYCLE_SETTINGS.reviewTypes,
      ...settings?.reviewTypes,
      line_manager: true,
    },
    goalCountPolicy: {
      ...DEFAULT_CYCLE_SETTINGS.goalCountPolicy,
      ...settings?.goalCountPolicy,
    },
    excludedEmployeeIds: [...(settings?.excludedEmployeeIds ?? [])],
  };
}

export const DEFAULT_CALIBRATION: CalibrationLogic = {
  calibrationMode: "manual",
  gradeRecommendation: "none",
  gradeDistribution: {
    exceptional: 2,
    exceeding: 25,
    performing: 40,
    developing: 28,
    unsatisfactory: 5,
  },
};

/** Strip legacy department/team goal windows and fill any missing fields. */
export function normalizeStagesConfig(
  config?: Partial<CycleStagesConfig>,
  quarter?: { startDate: string; endDate: string },
): CycleStagesConfig {
  const defaults = buildDefaultStagesConfig(
    quarter?.startDate ?? "2026-07-01",
    quarter?.endDate ?? "2026-09-30",
  );
  if (!config) return defaults;

  return {
    processMode: config.processMode ?? defaults.processMode,
    goals: {
      employee: config.goals?.employee ?? defaults.goals.employee,
      extensions: config.goals?.extensions ?? [],
    },
    performance: {
      ...defaults.performance,
      ...config.performance,
      employeeStart: {
        ...defaults.performance.employeeStart,
        ...config.performance?.employeeStart,
      },
      employeeEnd: {
        ...defaults.performance.employeeEnd,
        ...config.performance?.employeeEnd,
      },
      managerStart: {
        ...defaults.performance.managerStart,
        ...config.performance?.managerStart,
      },
      managerEnd: {
        ...defaults.performance.managerEnd,
        ...config.performance?.managerEnd,
      },
    },
    calibration: {
      ...defaults.calibration,
      ...config.calibration,
      start: {
        ...defaults.calibration.start,
        ...config.calibration?.start,
      },
      end: {
        ...defaults.calibration.end,
        ...config.calibration?.end,
      },
      manualStart: {
        ...defaults.calibration.manualStart,
        ...config.calibration?.manualStart,
      },
    },
    publish: {
      ...defaults.publish,
      ...config.publish,
      toManager: {
        ...defaults.publish.toManager,
        ...config.publish?.toManager,
      },
      toAll: {
        ...defaults.publish.toAll,
        ...config.publish?.toAll,
      },
    },
  };
}

/** Default stage windows relative to a quarter timeframe. */
export function buildDefaultStagesConfig(
  startDate: string,
  endDate: string,
): CycleStagesConfig {
  const start = parseIso(startDate);
  const end = parseIso(endDate);
  if (!start || !end) {
    return {
      processMode: "schedule",
      goals: {
        employee: { startDate, endDate },
        extensions: [],
      },
      performance: {
        employeeStart: at(startDate),
        employeeEnd: at(endDate),
        managerStart: at(startDate),
        managerEnd: at(endDate),
      },
      calibration: {
        enabled: true,
        start: at(endDate),
        end: at(endDate),
        manualStart: at(endDate),
      },
      publish: {
        toManager: at(endDate),
        toAll: at(endDate),
      },
    };
  }

  const goalsStart = addDays(start, -25);
  const employeeGoalsEnd = addDays(start, 0);
  const reviewStart = addDays(end, -9);
  const reviewEnd = addDays(end, 8);
  const calStart = reviewEnd;
  const calEnd = addDays(calStart, 7);
  const publishManagers = addDays(calEnd, 3);
  const publishEmployees = addDays(publishManagers, 7);

  return {
    processMode: "schedule",
    goals: {
      employee: {
        startDate: toIso(goalsStart),
        endDate: toIso(employeeGoalsEnd),
      },
      extensions: [],
    },
    performance: {
      employeeStart: at(toIso(reviewStart)),
      employeeEnd: at(toIso(reviewEnd)),
      managerStart: at(toIso(reviewStart)),
      managerEnd: at(toIso(reviewEnd)),
    },
    calibration: {
      enabled: true,
      start: at(toIso(calStart)),
      end: at(toIso(calEnd)),
      manualStart: at(toIso(calStart)),
    },
    publish: {
      toManager: at(toIso(publishManagers)),
      toAll: at(toIso(publishEmployees)),
    },
  };
}

/** @deprecated Prefer buildDefaultStagesConfig — kept name for call-site clarity. */
export function buildDefaultStages(startDate: string, endDate: string) {
  return buildDefaultStagesConfig(startDate, endDate);
}

function parseIso(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function cloneSettings(): CycleSettings {
  return normalizeCycleSettings();
}

function cloneCalibration(): CalibrationLogic {
  return {
    ...DEFAULT_CALIBRATION,
    gradeDistribution: { ...DEFAULT_CALIBRATION.gradeDistribution },
  };
}

function regularCycle(
  period: ReturnType<typeof buildPeriod>,
  createdAt: string,
): ReviewCycle {
  return {
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
  };
}

export function createInitialReviewsSnapshot(): ReviewsSnapshot {
  const createdAt = "2026-01-15T10:00:00.000Z";
  const q3_2026 = buildPeriod(2026, 3);

  return {
    cycles: [regularCycle(q3_2026, createdAt)],
  };
}
