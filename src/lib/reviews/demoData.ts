import { buildPeriod } from './periods'
import type {
  CalibrationLogic,
  CycleSettings,
  CycleStagesConfig,
  DateTimeValue,
  ReviewCycle,
  ReviewsSnapshot,
} from './types'

const DEFAULT_TIME = '14:00'

function at(date: string, time = DEFAULT_TIME): DateTimeValue {
  return { date, time }
}

export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  reviewTypes: {
    line_manager: true,
    self: false,
    upwards: false,
    peer: false,
    functional_manager: false,
  },
  excludedEmployeeIds: [],
  autoScorecardGeneration: false,
}

export const DEFAULT_CALIBRATION: CalibrationLogic = {
  calibrationMode: 'manual',
  gradeRecommendation: 'none',
  gradeDistribution: {
    exceptional: 2,
    exceeding: 25,
    performing: 40,
    developing: 28,
    unsatisfactory: 5,
  },
}

/** Default stage windows relative to a quarter timeframe. */
export function buildDefaultStagesConfig(
  startDate: string,
  endDate: string,
): CycleStagesConfig {
  const start = parseIso(startDate)
  const end = parseIso(endDate)
  if (!start || !end) {
    return {
      processMode: 'schedule',
      goals: {
        department: { startDate, endDate },
        team: { startDate, endDate },
        employee: { startDate, endDate },
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
    }
  }

  const goalsStart = addDays(start, -25)
  const goalsEnd = addDays(start, 9)
  const employeeGoalsEnd = addDays(start, 0)
  const reviewStart = addDays(end, -9)
  const reviewEnd = addDays(end, 8)
  const calStart = reviewEnd
  const calEnd = addDays(calStart, 7)
  const publishManagers = addDays(calEnd, 3)
  const publishEmployees = addDays(publishManagers, 7)

  return {
    processMode: 'schedule',
    goals: {
      department: {
        startDate: toIso(goalsStart),
        endDate: toIso(goalsEnd),
      },
      team: {
        startDate: toIso(goalsStart),
        endDate: toIso(goalsEnd),
      },
      employee: {
        startDate: toIso(goalsStart),
        endDate: toIso(employeeGoalsEnd),
      },
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
  }
}

/** @deprecated Prefer buildDefaultStagesConfig — kept name for call-site clarity. */
export function buildDefaultStages(startDate: string, endDate: string) {
  return buildDefaultStagesConfig(startDate, endDate)
}

function parseIso(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function toIso(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function cloneSettings(): CycleSettings {
  return {
    ...DEFAULT_CYCLE_SETTINGS,
    reviewTypes: { ...DEFAULT_CYCLE_SETTINGS.reviewTypes },
    excludedEmployeeIds: [...DEFAULT_CYCLE_SETTINGS.excludedEmployeeIds],
  }
}

function cloneCalibration(): CalibrationLogic {
  return {
    ...DEFAULT_CALIBRATION,
    gradeDistribution: { ...DEFAULT_CALIBRATION.gradeDistribution },
  }
}

function regularCycle(
  period: ReturnType<typeof buildPeriod>,
  createdAt: string,
): ReviewCycle {
  return {
    id: period.key,
    name: period.label,
    type: 'regular',
    startDate: period.startDate,
    endDate: period.endDate,
    periodKey: period.key,
    stagesConfig: buildDefaultStagesConfig(period.startDate, period.endDate),
    settings: cloneSettings(),
    calibration: cloneCalibration(),
    createdAt,
  }
}

export function createInitialReviewsSnapshot(): ReviewsSnapshot {
  const createdAt = '2026-01-15T10:00:00.000Z'
  const q1_2027 = buildPeriod(2027, 1)
  const q4_2026 = buildPeriod(2026, 4)
  const q3_2026 = buildPeriod(2026, 3)
  const q2_2026 = buildPeriod(2026, 2)
  const q1_2026 = buildPeriod(2026, 1)
  const q4_2025 = buildPeriod(2025, 4)

  const adHoc: ReviewCycle = {
    id: 'adhoc-sri-lanka-2025',
    name: 'Sri Lankan Cycle (2025)',
    type: 'ad-hoc',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    stagesConfig: buildDefaultStagesConfig('2025-06-01', '2025-08-31'),
    settings: cloneSettings(),
    calibration: cloneCalibration(),
    createdAt: '2025-05-20T10:00:00.000Z',
  }

  return {
    cycles: [
      regularCycle(q1_2027, createdAt),
      regularCycle(q4_2026, createdAt),
      adHoc,
      regularCycle(q3_2026, createdAt),
      regularCycle(q2_2026, createdAt),
      regularCycle(q1_2026, createdAt),
      regularCycle(q4_2025, createdAt),
    ],
  }
}
