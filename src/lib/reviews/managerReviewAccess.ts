import { hasSystemPermission, type SystemPermission } from '@/lib/accessControl/types'
import { isEffectiveDirectReport } from '@/lib/delegations/roles'
import type { PlatformEmployee } from '@/lib/employees/types'

/**
 * Who may save a manager review.
 * All read access can look. Only the real manager, the person covering that
 * manager during the delegation window, or All read + write access can change it.
 */
export function canWriteManagerReview(input: {
  viewerEmployeeId: number | null
  subjectEmployeeId: number
  subject?: PlatformEmployee | null
  directory?: readonly PlatformEmployee[]
  permissions?: readonly SystemPermission[]
}): boolean {
  const viewerId = input.viewerEmployeeId
  if (viewerId == null || viewerId === input.subjectEmployeeId) return false
  if (hasSystemPermission(input.permissions, 'platform.write_all')) return true
  const subject = input.subject
  const viewer = input.directory?.find(
    (person) => person.employeeId === viewerId,
  )
  if (!subject || !viewer) return false
  return isEffectiveDirectReport(subject, viewer, input.directory ?? [])
}
