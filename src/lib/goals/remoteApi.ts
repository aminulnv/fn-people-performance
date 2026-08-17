import { apiFetch } from '@/lib/apiClient'
import type {
  Goal,
  PersonGoals,
  QuarterRating,
  SubmissionStatus,
} from './types'

export type RemotePersonSubmission = {
  personId: string
  status: SubmissionStatus
  goals: Goal[]
  version?: number
  postWindowApprovalStage?: PersonGoals['postWindowApprovalStage']
  sendBackReason?: string
  sendBackBy?: PersonGoals['sendBackBy']
  approvedBy?: PersonGoals['approvedBy']
  rating?: PersonGoals['rating']
}

function toPersonGoals(submission: RemotePersonSubmission): PersonGoals {
  return {
    personId: submission.personId,
    status: submission.status,
    goals: submission.goals ?? [],
    version: submission.version ?? 0,
    postWindowApprovalStage: submission.postWindowApprovalStage,
    sendBackReason: submission.sendBackReason,
    sendBackBy: submission.sendBackBy,
    approvedBy: submission.approvedBy,
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
  options: { goals?: Goal[]; expectedVersion: number },
): Promise<PersonGoals> {
  const response = await apiFetch<{ submission: RemotePersonSubmission }>(
    `/api/platform/goal-cycles/${encodeURIComponent(cycleId)}/people/${encodeURIComponent(String(employeeId))}/submit`,
    {
      method: 'POST',
      body: {
        goals: options.goals,
        expectedVersion: options.expectedVersion,
      },
    },
  )
  return toPersonGoals(response.submission)
}

export async function approvePersonGoalsRemote(
  cycleId: string,
  employeeId: number | string,
  goals: Goal[] | undefined,
  expectedVersion: number,
): Promise<PersonGoals> {
  const response = await apiFetch<{ submission: RemotePersonSubmission }>(
    `/api/platform/goal-cycles/${encodeURIComponent(cycleId)}/people/${encodeURIComponent(String(employeeId))}/approve`,
    {
      method: 'POST',
      body: { goals, expectedVersion },
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

export async function copyPreviousCycleGoalsRemote(
  cycleId: string,
  employeeId: number | string,
  expectedVersion: number,
): Promise<PersonGoals> {
  const response = await apiFetch<{ submission: RemotePersonSubmission }>(
    `/api/platform/goal-cycles/${encodeURIComponent(cycleId)}/people/${encodeURIComponent(String(employeeId))}/copy-previous`,
    {
      method: 'POST',
      body: { expectedVersion },
    },
  )
  return toPersonGoals(response.submission)
}

export async function cascadeGoalRemote(
  cycleId: string,
  sourceEmployeeId: number | string,
  goalId: string,
  recipientEmployeeIds: string[],
  expectedVersions: Record<string, number>,
): Promise<PersonGoals[]> {
  const response = await apiFetch<{
    submissions: RemotePersonSubmission[]
  }>(
    `/api/platform/goal-cycles/${encodeURIComponent(cycleId)}/people/${encodeURIComponent(String(sourceEmployeeId))}/goals/${encodeURIComponent(goalId)}/cascade`,
    {
      method: 'POST',
      body: {
        recipientEmployeeIds,
        expectedVersions,
      },
    },
  )
  return (response.submissions ?? []).map(toPersonGoals)
}

export async function submitPersonGoalRatingRemote(
  cycleId: string,
  employeeId: number | string,
  rating: Omit<QuarterRating, 'submittedAt'>,
  expectedVersion: number,
): Promise<PersonGoals> {
  const response = await apiFetch<{ submission: RemotePersonSubmission }>(
    `/api/platform/goal-cycles/${encodeURIComponent(cycleId)}/people/${encodeURIComponent(String(employeeId))}/rating`,
    {
      method: 'POST',
      body: { rating, expectedVersion },
    },
  )
  return toPersonGoals(response.submission)
}
