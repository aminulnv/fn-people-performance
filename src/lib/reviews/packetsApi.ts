import { apiFetch } from '@/lib/apiClient'
import type { ReviewPacket } from './types'
import {
  appealLocalPacket,
  calibrateLocalPacket,
  getLocalPacket,
  listLocalPackets,
  releaseLocalPackets,
  saveLocalPacket,
  useLocalReviewPackets,
} from './packetsLocal'

export async function fetchReviewPackets(cycleId: string): Promise<ReviewPacket[]> {
  if (useLocalReviewPackets()) return listLocalPackets(cycleId)
  const response = await apiFetch<{ packets: ReviewPacket[] }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/packets`,
  )
  return response.packets
}

export async function fetchReviewPacket(
  cycleId: string,
  employeeId: number,
): Promise<ReviewPacket> {
  if (useLocalReviewPackets()) return getLocalPacket(cycleId, employeeId)
  const response = await apiFetch<{ packet: ReviewPacket }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/packets/${employeeId}`,
  )
  return response.packet
}

export async function saveReviewPacket(
  packetId: string,
  body: Record<string, unknown>,
): Promise<ReviewPacket> {
  if (useLocalReviewPackets()) {
    return saveLocalPacket(packetId, {
      actorRole: body.actorRole === 'manager' ? 'manager' : 'self',
      answers: body.answers as never,
      pillarScores: body.pillarScores as never,
      overallGrade: (body.overallGrade as ReviewPacket['selfOverallGrade']) ?? null,
      overrideReason: body.overrideReason as string | undefined,
      submit: Boolean(body.submit),
    })
  }
  const response = await apiFetch<{ packet: ReviewPacket }>(
    `/api/platform/review-packets/${encodeURIComponent(packetId)}`,
    { method: 'PATCH', body },
  )
  return response.packet
}

export async function calibrateReviewPacket(
  packetId: string,
  body: Record<string, unknown>,
): Promise<ReviewPacket> {
  if (useLocalReviewPackets()) {
    return calibrateLocalPacket(packetId, {
      toGrade: body.toGrade as ReviewPacket['calibratedOverallGrade'],
      reason: String(body.reason ?? ''),
      stageId: body.stageId as string | undefined,
    })
  }
  const response = await apiFetch<{ packet: ReviewPacket }>(
    `/api/platform/review-packets/${encodeURIComponent(packetId)}/calibrate`,
    { method: 'POST', body },
  )
  return response.packet
}

export async function releaseReviewCycle(
  cycleId: string,
  target: 'managers' | 'employees',
): Promise<ReviewPacket[]> {
  if (useLocalReviewPackets()) return releaseLocalPackets(cycleId, target)
  const response = await apiFetch<{ packets: ReviewPacket[] }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/release`,
    { method: 'POST', body: { target } },
  )
  return response.packets
}

export async function appealReviewPacket(
  packetId: string,
  body: string,
): Promise<ReviewPacket> {
  if (useLocalReviewPackets()) return appealLocalPacket(packetId, body)
  const response = await apiFetch<{ packet: ReviewPacket }>(
    `/api/platform/review-packets/${encodeURIComponent(packetId)}/appeals`,
    { method: 'POST', body: { body } },
  )
  return response.packet
}
