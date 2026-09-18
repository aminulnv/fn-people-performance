import { apiFetch } from '@/lib/apiClient'
import type {
  CalibrationLogic,
  CycleGroup,
  CyclePurpose,
  CycleSettings,
  CycleStagesConfig,
  ReviewCycle,
  ReviewPolicy,
  ScorecardForm,
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

export async function updateReviewCycleRemote(
  cycleId: string,
  patch: Record<string, unknown>,
): Promise<ReviewCycle> {
  const response = await apiFetch<{ cycle: ReviewCycle }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}`,
    { method: 'PATCH', body: patch },
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

export async function createCycleGroupRemote(
  cycleId: string,
  body: Record<string, unknown>,
): Promise<CycleGroup> {
  const response = await apiFetch<{ group: CycleGroup }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/groups`,
    { method: 'POST', body },
  )
  return response.group
}

export async function updateCycleGroupRemote(
  cycleId: string,
  groupId: string,
  patch: Record<string, unknown>,
): Promise<CycleGroup> {
  const response = await apiFetch<{ group: CycleGroup }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/groups/${encodeURIComponent(groupId)}`,
    { method: 'PATCH', body: patch },
  )
  return response.group
}

export async function deleteCycleGroupRemote(
  cycleId: string,
  groupId: string,
): Promise<void> {
  await apiFetch(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/groups/${encodeURIComponent(groupId)}`,
    { method: 'DELETE' },
  )
}

export async function fetchScorecardFormsRemote(): Promise<ScorecardForm[]> {
  const response = await apiFetch<{ forms: ScorecardForm[] }>(
    '/api/platform/scorecard-forms',
  )
  return response.forms
}

export async function createScorecardFormRemote(body: {
  id?: string
  name: string
  description?: string
  cycleType?: CyclePurpose
  policy?: ReviewPolicy
}): Promise<ScorecardForm> {
  const response = await apiFetch<{ form: ScorecardForm }>(
    '/api/platform/scorecard-forms',
    { method: 'POST', body },
  )
  return response.form
}

export async function updateScorecardFormRemote(
  formId: string,
  patch: {
    name?: string
    description?: string | null
    cycleType?: CyclePurpose
    policy?: ReviewPolicy
    expectedVersion?: number
  },
): Promise<ScorecardForm> {
  const response = await apiFetch<{ form: ScorecardForm }>(
    `/api/platform/scorecard-forms/${encodeURIComponent(formId)}`,
    { method: 'PATCH', body: patch },
  )
  return response.form
}

export async function deleteScorecardFormRemote(formId: string): Promise<void> {
  await apiFetch(
    `/api/platform/scorecard-forms/${encodeURIComponent(formId)}`,
    { method: 'DELETE' },
  )
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
