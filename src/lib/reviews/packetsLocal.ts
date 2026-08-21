import { cycleGroupsOf } from './cycleGroups'
import { getReviewCycle } from './store'
import type {
  ReviewActorRole,
  ReviewPacket,
  ReviewPacketStatus,
} from './types'

const packets = new Map<string, ReviewPacket>()

function packetKey(cycleId: string, employeeId: number): string {
  return `${cycleId}:${employeeId}`
}

function emptyPacket(cycleId: string, employeeId: number): ReviewPacket {
  return {
    id: `pkt-${cycleId}-${employeeId}`,
    cycleId,
    groupId: null,
    employeeId,
    managerEmployeeId: null,
    status: 'not_started',
    selfOverallGrade: null,
    managerOverallGrade: null,
    calibratedOverallGrade: null,
    publishedOverallGrade: null,
    managerOverrideReason: '',
    goalsComponent: null,
    answers: [],
    pillarScores: [],
    calibrationEvents: [],
    appeals: [],
    version: 1,
  }
}

export function listLocalPackets(cycleId: string): ReviewPacket[] {
  const cycle = getReviewCycle(cycleId)
  for (const group of cycleGroupsOf(cycle ?? { groups: [] })) {
    for (const employeeId of group.memberIds) {
      getLocalPacket(cycleId, employeeId)
    }
  }
  return [...packets.values()]
    .filter((packet) => packet.cycleId === cycleId)
    .map((packet) => structuredClone(packet))
}

export function getLocalPacket(
  cycleId: string,
  employeeId: number,
): ReviewPacket {
  const key = packetKey(cycleId, employeeId)
  const existing = packets.get(key)
  if (existing) return structuredClone(existing)
  const created = emptyPacket(cycleId, employeeId)
  packets.set(key, created)
  return structuredClone(created)
}

export function saveLocalPacket(
  packetId: string,
  input: {
    actorRole: ReviewActorRole
    answers?: Array<{ questionId: string; body: string }>
    pillarScores?: Array<{
      pillarId: string
      grade: ReviewPacket['selfOverallGrade']
      comment?: string
    }>
    overallGrade?: ReviewPacket['selfOverallGrade']
    overrideReason?: string
    submit?: boolean
  },
): ReviewPacket {
  const current = [...packets.values()].find((packet) => packet.id === packetId)
  if (!current) throw new Error('Review not found')
  const next: ReviewPacket = {
    ...current,
    answers: [
      ...current.answers.filter((answer) => answer.actorRole !== input.actorRole),
      ...(input.answers ?? []).map((answer) => ({
        ...answer,
        actorRole: input.actorRole,
      })),
    ],
    pillarScores: [
      ...current.pillarScores.filter((score) => score.actorRole !== input.actorRole),
      ...(input.pillarScores ?? []).map((score) => ({
        pillarId: score.pillarId,
        actorRole: input.actorRole,
        grade: score.grade ?? null,
        comment: score.comment ?? '',
      })),
    ],
    version: current.version + 1,
  }
  if (input.actorRole === 'self') {
    next.selfOverallGrade = input.overallGrade ?? current.selfOverallGrade
    next.status = input.submit ? 'self_submitted' : 'self_in_progress'
  } else {
    next.managerOverallGrade = input.overallGrade ?? current.managerOverallGrade
    next.managerOverrideReason = input.overrideReason ?? current.managerOverrideReason
    next.status = input.submit ? 'manager_submitted' : 'manager_in_progress'
  }
  packets.set(packetKey(current.cycleId, current.employeeId), next)
  return structuredClone(next)
}

export function calibrateLocalPacket(
  packetId: string,
  input: { toGrade: ReviewPacket['calibratedOverallGrade']; reason: string; stageId?: string },
): ReviewPacket {
  const current = [...packets.values()].find((packet) => packet.id === packetId)
  if (!current) throw new Error('Review not found')
  const next: ReviewPacket = {
    ...current,
    calibratedOverallGrade: input.toGrade,
    status: 'in_calibration',
    calibrationEvents: [
      ...current.calibrationEvents,
      {
        id: `cal-${current.version + 1}`,
        stageId: (input.stageId ?? 'calibration_hod_hrbp') as ReviewPacket['calibrationEvents'][number]['stageId'],
        fromGrade: current.calibratedOverallGrade ?? current.managerOverallGrade,
        toGrade: input.toGrade!,
        reason: input.reason,
        actorEmployeeId: null,
        actorName: '',
        createdAt: new Date().toISOString(),
      },
    ],
    version: current.version + 1,
  }
  packets.set(packetKey(current.cycleId, current.employeeId), next)
  return structuredClone(next)
}

export function releaseLocalPackets(
  cycleId: string,
  target: 'managers' | 'employees',
): ReviewPacket[] {
  const status: ReviewPacketStatus =
    target === 'managers' ? 'released_to_managers' : 'released_to_employees'
  for (const [key, packet] of packets) {
    if (packet.cycleId !== cycleId) continue
    packets.set(key, {
      ...packet,
      publishedOverallGrade:
        packet.calibratedOverallGrade ?? packet.managerOverallGrade,
      status,
      releasedToManagerAt:
        target === 'managers'
          ? new Date().toISOString()
          : packet.releasedToManagerAt,
      releasedToEmployeeAt:
        target === 'employees'
          ? new Date().toISOString()
          : packet.releasedToEmployeeAt,
      version: packet.version + 1,
    })
  }
  return listLocalPackets(cycleId)
}

export function appealLocalPacket(packetId: string, body: string): ReviewPacket {
  const current = [...packets.values()].find((packet) => packet.id === packetId)
  if (!current) throw new Error('Review not found')
  const next: ReviewPacket = {
    ...current,
    status: 'appealed',
    appeals: [
      ...current.appeals,
      {
        id: `apl-${current.version + 1}`,
        body,
        status: 'open',
        createdAt: new Date().toISOString(),
        createdByEmployeeId: null,
      },
    ],
    version: current.version + 1,
  }
  packets.set(packetKey(current.cycleId, current.employeeId), next)
  return structuredClone(next)
}

export function useLocalReviewPackets(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_REVIEWS_BACKEND === 'local' ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === 'local'
  )
}
