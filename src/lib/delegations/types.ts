export type ManagerDelegationStatus =
  | 'scheduled'
  | 'active'
  | 'ended'
  | 'revoked'

export type ManagerDelegation = {
  id: string
  absentEmployeeId: number
  absentName: string
  absentAvatarUrl?: string
  delegateEmployeeId: number
  delegateName: string
  delegateAvatarUrl?: string
  startsOn: string
  endsOn: string
  assignedByEmployeeId: number
  assignedByName: string
  revokedAt?: string
  status: ManagerDelegationStatus
}

export type AssignManagerDelegationInput = {
  absentEmployeeId: number
  delegateEmployeeId: number
  startsOn: string
  endsOn: string
}
