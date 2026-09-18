import { apiFetch } from '@/lib/apiClient'
import { readSession } from '@/lib/authApi'
import { resolveCyclePolicyForPerson } from './cycleGroups'
import { packetForViewer, packetsForViewer, sessionReviewAccess } from './packetVisibility'
import { listScorecardForms } from './scorecardFormsStore'
import { getReviewCycle } from './store'
import type { ReviewPacket } from './types'
import {
  appealLocalPacket,
  calibrateLocalPacket,
  getLocalPacket,
  listLocalPackets,
  releaseLocalPackets,
  resolveLocalAppeal,
  saveLocalPacket,
  useLocalReviewPackets,
} from './packetsLocal'

function sessionEmployeeId(): number | null {
  const employeeId = readSession()?.user.employeeId
  return typeof employeeId === 'number' ? employeeId : null
}

function visiblePacket(packet: ReviewPacket): ReviewPacket {
  if (!useLocalReviewPackets()) return packet
  const cycle = getReviewCycle(packet.cycleId)
  const questions = cycle
    ? resolveCyclePolicyForPerson(
        cycle,
        packet.employeeId,
        listScorecardForms(),
      ).settings.reviewPolicy?.scorecard.questions ?? []
    : []
  return packetForViewer(
    packet,
    sessionEmployeeId(),
    questions,
    sessionReviewAccess(),
  )
}

function visiblePackets(packets: ReviewPacket[]): ReviewPacket[] {
  if (!useLocalReviewPackets()) return packets
  return packetsForViewer(
    packets,
    sessionEmployeeId(),
    (packet) => {
      const cycle = getReviewCycle(packet.cycleId)
      return cycle
        ? resolveCyclePolicyForPerson(
            cycle,
            packet.employeeId,
            listScorecardForms(),
          ).settings.reviewPolicy?.scorecard.questions ?? []
        : []
    },
    sessionReviewAccess(),
  )
}

export async function fetchReviewPackets(cycleId: string): Promise<ReviewPacket[]> {
  if (useLocalReviewPackets()) return visiblePackets(listLocalPackets(cycleId))
  const response = await apiFetch<{ packets: ReviewPacket[] }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/packets`,
  )
  return visiblePackets(response.packets)
}

/** Grades + status only — skips answers / events / appeals payloads. */
export async function fetchReviewPacketSummaries(
  cycleId: string,
): Promise<ReviewPacket[]> {
  if (useLocalReviewPackets()) return visiblePackets(listLocalPackets(cycleId))
  const response = await apiFetch<{ packets: ReviewPacket[] }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/packets?summary=1`,
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
        goalsComponent:
          body.goalsComponent === undefined
            ? undefined
            : (body.goalsComponent as ReviewPacket['goalsComponent']),
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

export async function releaseReviewGroup(
  cycleId: string,
  groupId: string,
  target: 'managers' | 'employees',
): Promise<ReviewPacket[]> {
  if (useLocalReviewPackets()) {
    return visiblePackets(releaseLocalPackets(cycleId, groupId, target))
  }
  const response = await apiFetch<{ packets: ReviewPacket[] }>(
    `/api/platform/review-cycles/${encodeURIComponent(cycleId)}/groups/${encodeURIComponent(groupId)}/release`,
    { method: 'POST', body: { target } },
  )
  return visiblePackets(response.packets)
}

export async function appealReviewPacket(
  packetId: string,
  body: string,
): Promise<ReviewPacket> {
  if (useLocalReviewPackets()) {
    return visiblePacket(
      appealLocalPacket(packetId, body, sessionEmployeeId()),
    )
  }
  const response = await apiFetch<{ packet: ReviewPacket }>(
    `/api/platform/review-packets/${encodeURIComponent(packetId)}/appeals`,
    { method: 'POST', body: { body } },
  )
  return visiblePacket(response.packet)
}

export async function resolveReviewAppeal(
  packetId: string,
  appealId: string,
  body: {
    toGrade: NonNullable<ReviewPacket['publishedOverallGrade']>
    justification: string
  },
): Promise<ReviewPacket> {
  if (useLocalReviewPackets()) {
    return visiblePacket(resolveLocalAppeal(packetId, appealId, body))
  }
  const response = await apiFetch<{ packet: ReviewPacket }>(
    `/api/platform/review-packets/${encodeURIComponent(packetId)}/appeals/${encodeURIComponent(appealId)}/resolve`,
    { method: 'POST', body },
  )
  return visiblePacket(response.packet)
}
