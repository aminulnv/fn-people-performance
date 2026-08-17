import { apiFetch } from '@/lib/apiClient'
import type { Goal, PersonGoals, SubmissionStatus } from './types'

export type RemotePersonSubmission = {
  personId: string
  status: SubmissionStatus
  goals: Goal[]
  version?: number
  postWindowApprovalStage?: PersonGoals['postWindowApprovalStage']
  sendBackReason?: string
  sendBackBy?: PersonGoals['sendBackBy']
  rating?: PersonGoals['rating']
}

function toPersonGoals(submission: RemotePersonSubmission): PersonGoals {
  return {
    personId: submission.personId,
    status: submission.status,
    goals: submission.goals ?? [],
    postWindowApprovalStage: submission.postWindowApprovalStage,
    sendBackReason: submission.sendBackReason,
    sendBackBy: submission.sendBackBy,
    rating: submission.rating,
  }
}

export async function fetchPersonGoalsRemote(
  cycleId: string,
  employeeId: number | string,
): Promise<PersonGoals> {
  const response = await apiFetch<{ submission: RemotePersonSubmission }>(
    `/api/platform/goal-cycles/${encodeURIComponent(cycleId)}/people/${encodeURIComponent(String(employeeId))}`,
  )
  return toPersonGoals(response.submission)
}

export async function savePersonGoalsDraftRemote(
  cycleId: string,
  employeeId: number | string,
  goals: Goal[],
  expectedVersion?: number,
): Promise<PersonGoals> {
  const response = await apiFetch<{ submission: RemotePersonSubmission }>(
    `/api/platform/goal-cycles/${encodeURIComponent(cycleId)}/people/${encodeURIComponent(String(employeeId))}/draft`,
    {
      method: 'PUT',
      body: { goals, expectedVersion },
    },
  )
  return toPersonGoals(response.submission)
}

export async function submitPersonGoalsRemote(
  cycleId: string,
  employeeId: number | string,
  options?: { late?: boolean; expectedVersion?: number },
): Promise<PersonGoals> {
  const response = await apiFetch<{ submission: RemotePersonSubmission }>(
    `/api/platform/goal-cycles/${encodeURIComponent(cycleId)}/people/${encodeURIComponent(String(employeeId))}/submit`,
    {
      method: 'POST',
      body: {
        late: Boolean(options?.late),
        expectedVersion: options?.expectedVersion,
      },
    },
  )
  return toPersonGoals(response.submission)
}

export async function approvePersonGoalsRemote(
  cycleId: string,
  employeeId: number | string,
  expectedVersion?: number,
): Promise<PersonGoals> {
  const response = await apiFetch<{ submission: RemotePersonSubmission }>(
    `/api/platform/goal-cycles/${encodeURIComponent(cycleId)}/people/${encodeURIComponent(String(employeeId))}/approve`,
    {
      method: 'POST',
      body: { expectedVersion },
    },
  )
  return toPersonGoals(response.submission)
}

export async function sendBackPersonGoalsRemote(
  cycleId: string,
  employeeId: number | string,
  reason: string,
  expectedVersion?: number,
): Promise<PersonGoals> {
  const response = await apiFetch<{ submission: RemotePersonSubmission }>(
    `/api/platform/goal-cycles/${encodeURIComponent(cycleId)}/people/${encodeURIComponent(String(employeeId))}/send-back`,
    {
      method: 'POST',
      body: { reason, expectedVersion },
    },
  )
  return toPersonGoals(response.submission)
}

export async function fetchCycleGoalSubmissionsRemote(
  cycleId: string,
): Promise<PersonGoals[]> {
  const response = await apiFetch<{
    cycleId: string
    submissions: RemotePersonSubmission[]
  }>(`/api/platform/goal-cycles/${encodeURIComponent(cycleId)}`)
  return (response.submissions ?? []).map(toPersonGoals)
}
