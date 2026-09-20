/**
 * Who may receive a live update. The browser only hears a change it is
 * allowed to see. Person ids used for that check are not sent onward.
 */

import { permissionsForPlatformUser } from '../auth.mjs'
import { listEmployeesManagedBy } from '../delegations.mjs'
import { listVisibleGoalSubjectIds } from '../goals/policy.mjs'

function idOf(value) {
  if (value == null || value === '') return null
  const id = Number(value)
  return Number.isInteger(id) ? id : null
}

function permissionSet(viewer) {
  if (viewer.permissions instanceof Set) return viewer.permissions
  return new Set(viewer.permissions ?? [])
}

function hearsSubject(viewer, event, subjectIds) {
  if (subjectIds == null) return true
  const subjectId = idOf(event.employeeId)
  const actorId = idOf(event.actorEmployeeId)
  const viewerId = idOf(viewer.employeeId)
  if (subjectId == null) return false
  if (viewerId != null && (subjectId === viewerId || actorId === viewerId)) return true
  return subjectIds.has(subjectId)
}

/**
 * @param {{
 *   employeeId?: number | null
 *   permissions?: Set<string> | string[]
 *   goalSubjectIds?: Set<number> | null
 *   packetSubjectIds?: Set<number> | null
 * }} viewer
 * @param {{
 *   topic: string
 *   employeeId?: string | number
 *   actorEmployeeId?: string | number
 *   audienceEmployeeIds?: number[]
 * }} event
 */
export function viewerMayHearEvent(viewer, event) {
  if (!viewer || !event?.topic) return false
  const permissions = permissionSet(viewer)
  const seesAllPeople =
    permissions.has('platform.read_all') || permissions.has('platform.write_all')
  const viewerId = idOf(viewer.employeeId)
  const subjectId = idOf(event.employeeId)

  switch (event.topic) {
    case 'employees':
      return true
    case 'reviews':
      if (subjectId == null) return true
      return hearsSubject(viewer, event, seesAllPeople ? null : viewer.packetSubjectIds ?? new Set())
    case 'goals':
      if (subjectId == null) return true
      return hearsSubject(viewer, event, seesAllPeople ? null : viewer.goalSubjectIds ?? new Set())
    case 'packets':
      if (subjectId == null) return seesAllPeople
      return hearsSubject(viewer, event, seesAllPeople ? null : viewer.packetSubjectIds ?? new Set())
    case 'notifications':
      return viewerId != null && subjectId === viewerId
    case 'access':
      if (permissions.has('access.manage')) return true
      return viewerId != null && subjectId === viewerId
    case 'activity':
      if (
        permissions.has('activity.read_all') ||
        permissions.has('platform.read_all')
      ) {
        return true
      }
      if (subjectId == null) return false
      return hearsSubject(viewer, event, viewer.goalSubjectIds ?? new Set())
    case 'delegations':
      if (seesAllPeople) return true
      if (viewerId == null) return false
      if (subjectId === viewerId) return true
      return (event.audienceEmployeeIds ?? []).map(Number).includes(viewerId)
    default:
      return false
  }
}

export async function loadRealtimeViewer(user) {
  const permissions = new Set(await permissionsForPlatformUser(user ?? {}))
  const employeeId = idOf(user?.employeeId)
  const seesAllPeople =
    permissions.has('platform.read_all') || permissions.has('platform.write_all')
  if (seesAllPeople || employeeId == null) {
    return {
      employeeId,
      permissions,
      goalSubjectIds: seesAllPeople ? null : new Set(),
      packetSubjectIds: seesAllPeople ? null : new Set(),
    }
  }

  const [goalIds, managedIds] = await Promise.all([
    listVisibleGoalSubjectIds(user),
    listEmployeesManagedBy(employeeId),
  ])
  return {
    employeeId,
    permissions,
    goalSubjectIds: new Set((goalIds ?? []).map(Number)),
    packetSubjectIds: new Set([employeeId, ...managedIds.map(Number)]),
  }
}
