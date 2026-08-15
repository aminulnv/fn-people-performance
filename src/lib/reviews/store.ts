import {
  buildDefaultStagesConfig,
  createInitialReviewsSnapshot,
  DEFAULT_CALIBRATION,
  DEFAULT_CYCLE_SETTINGS,
} from './demoData'
import { findPeriod } from './periods'
import type {
  CalibrationLogic,
  CycleSettings,
  CycleStagesConfig,
  ReviewCycle,
  ReviewCycleType,
  ReviewsSnapshot,
} from './types'

/** Bumped when seed was reduced to Q3 2026 only. */
const STORAGE_KEY = 'pd-reviews-cycles-v4'

let memory: ReviewsSnapshot | null = null
const listeners = new Set<() => void>()

function clone<T>(value: T): T {
  return structuredClone(value)
}

function readStorage(): ReviewsSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ReviewsSnapshot
  } catch {
    return null
  }
}

function writeStorage(snapshot: ReviewsSnapshot): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    /* ignore quota */
  }
}

function getState(): ReviewsSnapshot {
  if (!memory) {
    memory = readStorage() ?? createInitialReviewsSnapshot()
  }
  return memory
}

function commit(next: ReviewsSnapshot): ReviewsSnapshot {
  memory = next
  writeStorage(next)
  listeners.forEach((listener) => listener())
  return clone(next)
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

export function subscribeReviewsStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Test helper — clears in-memory + session state. */
export function resetReviewsStoreForTests(): void {
  memory = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Stable snapshot for `useSyncExternalStore` — same reference until `commit`.
 * Do not mutate the returned object; use the update helpers instead.
 */
export function getReviewsSnapshot(): ReviewsSnapshot {
  return getState()
}

export function listReviewCycles(): ReviewCycle[] {
  return getState().cycles
}

export function getReviewCycle(cycleId: string): ReviewCycle | null {
  const decoded = decodeURIComponent(cycleId)
  return (
    getState().cycles.find(
      (cycle) => cycle.id === decoded || cycle.id === cycleId,
    ) ?? null
  )
}

export function newCycleId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`
}

export type CreateReviewCycleInput = {
  type: ReviewCycleType
  periodKey?: string
  name?: string
  startDate?: string
  endDate?: string
}

export function createReviewCycle(
  input: CreateReviewCycleInput,
): ReviewCycle {
  const createdAt = new Date().toISOString()

  let cycle: ReviewCycle
  if (input.type === 'regular') {
    const period = input.periodKey ? findPeriod(input.periodKey) : undefined
    if (!period) {
      throw new Error('Select a cycle period before confirming.')
    }
    const existing = getState().cycles.some(
      (item) => item.periodKey === period.key && item.type === 'regular',
    )
    if (existing) {
      throw new Error(`${period.label} already exists.`)
    }
    cycle = {
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
  } else {
    const name = input.name?.trim() || 'Ad-hoc cycle'
    const startDate = input.startDate ?? new Date().toISOString().slice(0, 10)
    const endDate = input.endDate ?? startDate
    cycle = {
      id: newCycleId('adhoc'),
      name,
      type: 'ad-hoc',
      startDate,
      endDate,
      stagesConfig: buildDefaultStagesConfig(startDate, endDate),
      settings: cloneSettings(),
      calibration: cloneCalibration(),
      createdAt,
    }
  }

  const state = getState()
  commit({ cycles: [cycle, ...state.cycles] })
  return clone(cycle)
}

export function createTestCycle(sourceId: string): ReviewCycle {
  const source = getReviewCycle(sourceId)
  if (!source) throw new Error('Cycle not found.')

  const test: ReviewCycle = {
    ...clone(source),
    id: newCycleId(`test-${source.id}`),
    name: `${source.name} (Test)`,
    type: 'ad-hoc',
    periodKey: undefined,
    isTest: true,
    createdAt: new Date().toISOString(),
  }

  const state = getState()
  commit({ cycles: [test, ...state.cycles] })
  return test
}

export function updateCycleSettings(
  cycleId: string,
  patch: Partial<CycleSettings> & {
    name?: string
    startDate?: string
    endDate?: string
  },
): ReviewCycle {
  const state = getState()
  const index = state.cycles.findIndex((c) => c.id === cycleId)
  if (index < 0) throw new Error('Cycle not found.')

  const current = state.cycles[index]
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
      excludedEmployeeIds:
        patch.excludedEmployeeIds ?? current.settings.excludedEmployeeIds,
      autoScorecardGeneration:
        patch.autoScorecardGeneration ??
        current.settings.autoScorecardGeneration,
    },
  }

  const cycles = [...state.cycles]
  cycles[index] = next
  commit({ cycles })
  return clone(next)
}

export function updateCalibrationLogic(
  cycleId: string,
  patch: Partial<CalibrationLogic>,
): ReviewCycle {
  const state = getState()
  const index = state.cycles.findIndex((c) => c.id === cycleId)
  if (index < 0) throw new Error('Cycle not found.')

  const current = state.cycles[index]
  const next: ReviewCycle = {
    ...current,
    calibration: {
      ...current.calibration,
      ...patch,
      gradeDistribution: patch.gradeDistribution
        ? { ...patch.gradeDistribution }
        : current.calibration.gradeDistribution,
    },
  }

  const cycles = [...state.cycles]
  cycles[index] = next
  commit({ cycles })
  return clone(next)
}

export function updateCycleStagesConfig(
  cycleId: string,
  stagesConfig: CycleStagesConfig,
): ReviewCycle {
  const state = getState()
  const index = state.cycles.findIndex((c) => c.id === cycleId)
  if (index < 0) throw new Error('Cycle not found.')

  const next: ReviewCycle = {
    ...state.cycles[index],
    stagesConfig: clone(stagesConfig),
  }
  const cycles = [...state.cycles]
  cycles[index] = next
  commit({ cycles })
  return clone(next)
}

export function deleteReviewCycle(cycleId: string): void {
  const state = getState()
  const decoded = decodeURIComponent(cycleId)
  const nextCycles = state.cycles.filter(
    (cycle) => cycle.id !== cycleId && cycle.id !== decoded,
  )
  if (nextCycles.length === state.cycles.length) {
    throw new Error('Cycle not found.')
  }
  commit({ cycles: nextCycles })
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
  }
  return [...cycles].sort((a, b) => {
    const ra = rank[statusOf(a)] ?? 9
    const rb = rank[statusOf(b)] ?? 9
    if (ra !== rb) return ra - rb
    return b.startDate.localeCompare(a.startDate)
  })
}
