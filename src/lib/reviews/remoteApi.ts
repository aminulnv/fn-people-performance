import { apiFetch } from '@/lib/apiClient'
import type {
  CalibrationLogic,
  CycleSettings,
  CycleStagesConfig,
  ReviewCycle,
} from './types'

export async function fetchReviewCyclesRemote(): Promise<ReviewCycle[]> {
  const response = await apiFetch<{ cycles: ReviewCycle[] }>(
    '/api/platform/review-cycles',
  )
  return response.cycles
}

export async function createReviewCycleRemote(
  body: Record<string, unknown>,
): Promise<ReviewCycle> {
  const response = await apiFetch<{ cycle: ReviewCycle }>(
    '/api/platform/review-cycles',
    { method: 'POST', body },
  )
  return response.cycle
}

export async function createTestCycleRemote(
  cycleId: string,
): Promise<ReviewCycle> {
  const response = await apiFetch<{ cycle: ReviewCycle }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/test-copies`,
    { method: 'POST', body: {} },
  )
  return response.cycle
}

export async function updateCycleSettingsRemote(
  cycleId: string,
  patch: Partial<CycleSettings> & {
    name?: string
    startDate?: string
    endDate?: string
    expectedVersion?: number
  },
): Promise<ReviewCycle> {
  const response = await apiFetch<{ cycle: ReviewCycle }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/settings`,
    { method: 'PATCH', body: patch },
  )
  return response.cycle
}

export async function updateCycleStagesRemote(
  cycleId: string,
  body: {
    stagesConfig: CycleStagesConfig
    postWindowGoalPolicy?: CycleSettings['postWindowGoalPolicy']
    expectedVersion?: number
  },
): Promise<ReviewCycle> {
  const response = await apiFetch<{ cycle: ReviewCycle }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/stages`,
    { method: 'PATCH', body },
  )
  return response.cycle
}

export async function updateCalibrationRemote(
  cycleId: string,
  patch: Partial<CalibrationLogic> & { expectedVersion?: number },
): Promise<ReviewCycle> {
  const response = await apiFetch<{ cycle: ReviewCycle }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/calibration`,
    { method: 'PATCH', body: patch },
  )
  return response.cycle
}

export async function deleteReviewCycleRemote(
  cycleId: string,
  expectedVersion?: number,
): Promise<void> {
  await apiFetch(`/api/platform/review-cycles/${encodeURIComponent(cycleId)}`, {
    method: 'DELETE',
    body: { expectedVersion },
  })
}

export async function importReviewCyclesRemote(
  cycles: ReviewCycle[],
  fingerprint: string,
): Promise<ReviewCycle[]> {
  const response = await apiFetch<{ cycles: ReviewCycle[] }>(
    '/api/platform/review-cycle-imports',
    { method: 'POST', body: { cycles, fingerprint } },
  )
  return response.cycles
}
