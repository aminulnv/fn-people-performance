import { buildPeriod } from "./periods";
import { inferPurpose, inferYearKey } from "./purpose";
import { defaultReviewPolicy, normalizeReviewPolicy } from "./reviewPolicy";
import {
  applyNestedWindowsToReviewStages,
  defaultReviewStages,
  deriveReviewStagesFromLegacy,
  mergeReviewStages,
  syncLegacyStageWindows,
} from "./reviewStages";
import type {
  CalibrationLogic,
  CyclePurpose,
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
  reviewPolicy: defaultReviewPolicy("quarterly_checkin"),
};

export function normalizeCycleSettings(
  settings?: Partial<CycleSettings>,
  purpose: CyclePurpose = "quarterly_checkin",
): CycleSettings {
  const reviewTypes = {
    ...DEFAULT_CYCLE_SETTINGS.reviewTypes,
    ...settings?.reviewTypes,
    line_manager: true,
    ...(purpose === "annual_appraisal" ? { self: true } : {}),
  };
  if (settings?.reviewTypes?.self != null) {
    reviewTypes.self = settings.reviewTypes.self;
  }
  return {
    ...DEFAULT_CYCLE_SETTINGS,
    ...settings,
    reviewTypes,
    goalCountPolicy: {
      ...DEFAULT_CYCLE_SETTINGS.goalCountPolicy,
      ...settings?.goalCountPolicy,
    },
    excludedEmployeeIds: [...(settings?.excludedEmployeeIds ?? [])],
    reviewPolicy: normalizeReviewPolicy(settings?.reviewPolicy, purpose),
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
  sltMemberIds: [],
};

export function normalizeCalibration(
  calibration?: Partial<CalibrationLogic>,
): CalibrationLogic {
  const sltMemberIds = [
    ...new Set(
      (calibration?.sltMemberIds ?? []).filter(
        (id) => Number.isInteger(id) && id > 0,
      ),
    ),
  ];
  return {
    ...DEFAULT_CALIBRATION,
    ...calibration,
    gradeDistribution: {
      ...DEFAULT_CALIBRATION.gradeDistribution,
      ...calibration?.gradeDistribution,
    },
    sltMemberIds,
  };
}

/** Strip legacy department/team goal windows and fill any missing fields. */
export function normalizeStagesConfig(
  config?: Partial<CycleStagesConfig>,
  quarter?: { startDate: string; endDate: string; purpose?: CyclePurpose },
): CycleStagesConfig {
  const defaults = buildDefaultStagesConfig(
    quarter?.startDate ?? "2026-07-01",
    quarter?.endDate ?? "2026-09-30",
    quarter?.purpose,
  );
  if (!config) return defaults;

  const merged: CycleStagesConfig = {
    processMode: "schedule",
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
  const purpose = quarter?.purpose ?? "quarterly_checkin";
  merged.reviewStages = mergeReviewStages(
    config.reviewStages,
    config.reviewStages?.length
      ? defaultReviewStages(purpose, merged)
      : deriveReviewStagesFromLegacy(purpose, merged),
  );
  return syncLegacyStageWindows(applyNestedWindowsToReviewStages(merged));
}

/** Default stage windows relative to a quarter timeframe. */
export function buildDefaultStagesConfig(
  startDate: string,
  endDate: string,
  purpose: CyclePurpose = "quarterly_checkin",
  periodKey?: string,
): CycleStagesConfig {
  const start = parseIso(startDate);
  const end = parseIso(endDate);
  if (!start || !end) {
    const fallback = {
      processMode: "schedule" as const,
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
        enabled: purpose !== "quarterly_checkin",
        start: at(endDate),
        end: at(endDate),
        manualStart: at(endDate),
      },
      publish: {
        toManager: at(endDate),
        toAll: at(endDate),
      },
    };
    return syncLegacyStageWindows({
      ...fallback,
      reviewStages: defaultReviewStages(purpose, fallback, periodKey),
    });
  }

  const goalsStart = addDays(start, -25);
  const employeeGoalsEnd = addDays(start, 0);
  const reviewStart = addDays(end, -9);
  const reviewEnd = addDays(end, 8);
  const calStart = reviewEnd;
  const calEnd = addDays(calStart, 7);
  const publishManagers = addDays(calEnd, 3);
  const publishEmployees = addDays(publishManagers, 7);

  const built = {
    processMode: "schedule" as const,
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
      enabled: purpose !== "quarterly_checkin",
      start: at(toIso(calStart)),
      end: at(toIso(calEnd)),
      manualStart: at(toIso(calStart)),
    },
    publish: {
      toManager: at(toIso(publishManagers)),
      toAll: at(toIso(publishEmployees)),
    },
  };
  return syncLegacyStageWindows({
    ...built,
    reviewStages: defaultReviewStages(purpose, built, periodKey),
  });
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
  return normalizeCalibration();
}

function regularCycle(
  period: ReturnType<typeof buildPeriod>,
  createdAt: string,
): ReviewCycle {
  const purpose = inferPurpose(period.key, "quarterly_checkin");
  return {
    id: period.key,
    name: period.label,
    type: "regular",
    purpose,
    startDate: period.startDate,
    endDate: period.endDate,
    periodKey: period.key,
    yearKey: inferYearKey(period.key, period.startDate),
    sourceLinks: [],
    stagesConfig: buildDefaultStagesConfig(
      period.startDate,
      period.endDate,
      purpose,
      period.key,
    ),
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
