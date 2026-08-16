import { NOTIFICATION_EVENTS } from './catalogue'
import { emitNotification } from './store'

export function notifyAccessChanged({
  actorId,
  actorName,
  employeeId,
  accessProfile,
  isGranted,
}: {
  actorId?: string
  actorName: string
  employeeId: string
  accessProfile: string
  isGranted: boolean
}): void {
  emitNotification({
    eventKey: isGranted
      ? NOTIFICATION_EVENTS.ACCESS_GRANTED
      : NOTIFICATION_EVENTS.ACCESS_REMOVED,
    recipientId: employeeId,
    actorId,
    dedupeKey: `access-change:${employeeId}:${Date.now()}`,
    destination: '/settings',
    personId: employeeId,
    variables: {
      administrator: actorName,
      accessProfile,
    },
  })
}

export function notifyManagerChanged({
  actorId,
  employeeId,
  employeeName,
  managerId,
  managerName,
}: {
  actorId?: string
  employeeId: string
  employeeName: string
  managerId: string
  managerName: string
}): void {
  emitNotification({
    eventKey: NOTIFICATION_EVENTS.ORG_MANAGER_CHANGED_EMPLOYEE,
    recipientId: employeeId,
    actorId,
    dedupeKey: `manager-change:${employeeId}:${managerId}`,
    destination: `/people/${encodeURIComponent(employeeId)}`,
    personId: employeeId,
    variables: { newManager: managerName },
  })
  emitNotification({
    eventKey: NOTIFICATION_EVENTS.ORG_MANAGER_CHANGED_MANAGER,
    recipientId: managerId,
    actorId,
    dedupeKey: `new-report:${managerId}:${employeeId}`,
    destination: `/people/${encodeURIComponent(employeeId)}`,
    personId: employeeId,
    variables: { employee: employeeName },
  })
}
