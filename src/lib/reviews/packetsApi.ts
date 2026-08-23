import { apiFetch } from '@/lib/apiClient'
import { readSession } from '@/lib/authApi'
import { packetForViewer, packetsForViewer } from './packetVisibility'
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

function sessionEmployeeId(): number | null {
  const employeeId = readSession()?.user.employeeId
  return typeof employeeId === 'number' ? employeeId : null
}

function visiblePacket(packet: ReviewPacket): ReviewPacket {
  return packetForViewer(packet, sessionEmployeeId())
}

function visiblePackets(packets: ReviewPacket[]): ReviewPacket[] {
  return packetsForViewer(packets, sessionEmployeeId())
}

export async function fetchReviewPackets(cycleId: string): Promise<ReviewPacket[]> {
  if (useLocalReviewPackets()) return visiblePackets(listLocalPackets(cycleId))
  const response = await apiFetch<{ packets: ReviewPacket[] }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/packets`,
  )
  return visiblePackets(response.packets)
}

export async function fetchReviewPacket(
  cycleId: string,
  employeeId: number,
): Promise<ReviewPacket> {
  if (useLocalReviewPackets()) {
    return visiblePacket(getLocalPacket(cycleId, employeeId))
  }
  const response = await apiFetch<{ packet: ReviewPacket }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/packets/${employeeId}`,
  )
  return visiblePacket(response.packet)
}

export async function saveReviewPacket(
  packetId: string,
  body: Record<string, unknown>,
): Promise<ReviewPacket> {
  if (useLocalReviewPackets()) {
    return visiblePacket(
      saveLocalPacket(packetId, {
        actorRole: body.actorRole === 'manager' ? 'manager' : 'self',
        answers: body.answers as never,
        pillarScores: body.pillarScores as never,
        overallGrade: (body.overallGrade as ReviewPacket['selfOverallGrade']) ?? null,
        overrideReason: body.overrideReason as string | undefined,
        submit: Boolean(body.submit),
      }),
    )
  }
  const response = await apiFetch<{ packet: ReviewPacket }>(
    `/api/platform/review-packets/${encodeURIComponent(packetId)}`,
    { method: 'PATCH', body },
  )
  return visiblePacket(response.packet)
}

export async function calibrateReviewPacket(
  packetId: string,
  body: Record<string, unknown>,
): Promise<ReviewPacket> {
  if (useLocalReviewPackets()) {
    return visiblePacket(
      calibrateLocalPacket(packetId, {
        toGrade: body.toGrade as ReviewPacket['calibratedOverallGrade'],
        reason: String(body.reason ?? ''),
        stageId: body.stageId as string | undefined,
      }),
    )
  }
  const response = await apiFetch<{ packet: ReviewPacket }>(
    `/api/platform/review-packets/${encodeURIComponent(packetId)}/calibrate`,
    { method: 'POST', body },
  )
  return visiblePacket(response.packet)
}

export async function releaseReviewCycle(
  cycleId: string,
  target: 'managers' | 'employees',
): Promise<ReviewPacket[]> {
  if (useLocalReviewPackets()) {
    return visiblePackets(releaseLocalPackets(cycleId, target))
  }
  const response = await apiFetch<{ packets: ReviewPacket[] }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/release`,
    { method: 'POST', body: { target } },
  )
  return visiblePackets(response.packets)
}

export async function appealReviewPacket(
  packetId: string,
  body: string,
): Promise<ReviewPacket> {
  if (useLocalReviewPackets()) return visiblePacket(appealLocalPacket(packetId, body))
  const response = await apiFetch<{ packet: ReviewPacket }>(
    `/api/platform/review-packets/${encodeURIComponent(packetId)}/appeals`,
    { method: 'POST', body: { body } },
  )
  return visiblePacket(response.packet)
}
