import { apiFetch } from '@/lib/apiClient'
import type {
  AssignManagerDelegationInput,
  ManagerDelegation,
} from './types'

const STORAGE_KEY = 'pd-manager-delegations'

let memory: ManagerDelegation[] = []
let remoteHydrated = false
const listeners = new Set<() => void>()

function useLocalDelegations(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_AUTH_MODE === 'local' ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === 'local'
  )
}

function notify() {
  for (const listener of listeners) listener()
}

function readStorage(): ManagerDelegation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as ManagerDelegation[]) : []
  } catch {
    return []
  }
}

function writeStorage(delegations: ManagerDelegation[]) {
  memory = delegations
  if (useLocalDelegations() && import.meta.env.MODE !== 'test') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(delegations))
  }
  notify()
}

function allDelegations(): ManagerDelegation[] {
  if (
    useLocalDelegations() &&
    import.meta.env.MODE !== 'test' &&
    memory.length === 0
  ) {
    memory = readStorage()
  }
  return memory
}

export function subscribeManagerDelegations(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function listManagerDelegations(): ManagerDelegation[] {
  return allDelegations()
}

export function delegationStatusAt(
  delegation: Pick<ManagerDelegation, 'startsOn' | 'endsOn' | 'revokedAt'>,
  now = new Date(),
): ManagerDelegation['status'] {
  if (delegation.revokedAt) return 'revoked'
  const start = new Date(`${delegation.startsOn}T00:00:00.000Z`)
  const end = new Date(`${delegation.endsOn}T23:59:59.999Z`)
  if (now < start) return 'scheduled'
  if (now > end) return 'ended'
  return 'active'
}

function withLiveStatus(
  delegation: ManagerDelegation,
  now = new Date(),
): ManagerDelegation {
  return { ...delegation, status: delegationStatusAt(delegation, now) }
}

export function listDelegationsForEmployee(
  employeeId: number,
): ManagerDelegation[] {
  return allDelegations()
    .filter(
      (delegation) =>
        delegation.absentEmployeeId === employeeId ||
        delegation.delegateEmployeeId === employeeId,
    )
    .map((delegation) => withLiveStatus(delegation))
    .sort((left, right) => right.startsOn.localeCompare(left.startsOn))
}

export function listActiveDelegationForEmployee(
  employeeId: number,
): ManagerDelegation | undefined {
  return listDelegationsForEmployee(employeeId).find(
    (delegation) =>
      delegation.status === 'active' &&
      delegation.absentEmployeeId === employeeId,
  )
}

export function listActiveDelegatingAssignments(
  delegateEmployeeId: number,
): ManagerDelegation[] {
  return listDelegationsForEmployee(delegateEmployeeId).filter(
    (delegation) =>
      delegation.status === 'active' &&
      delegation.delegateEmployeeId === delegateEmployeeId,
  )
}

/** Manager ids the delegate is currently standing in for. */
export function listActiveDelegatedManagerIds(
  delegateEmployeeId: string,
): string[] {
  const id = Number(delegateEmployeeId)
  if (!Number.isInteger(id)) return []
  return listActiveDelegatingAssignments(id).map((delegation) =>
    String(delegation.absentEmployeeId),
  )
}

export function replaceManagerDelegations(
  delegations: ManagerDelegation[],
): void {
  writeStorage(delegations.map((delegation) => withLiveStatus(delegation)))
}

function nextLocalId(): string {
  const max = allDelegations().reduce((current, delegation) => {
    const value = Number(delegation.id)
    return Number.isInteger(value) ? Math.max(current, value) : current
  }, 0)
  return String(max + 1)
}

export function assignManagerDelegationLocal(
  input: AssignManagerDelegationInput & {
    absentName: string
    delegateName: string
    delegateAvatarUrl?: string
    absentAvatarUrl?: string
    assignedByEmployeeId: number
    assignedByName: string
  },
): ManagerDelegation {
  if (input.absentEmployeeId === input.delegateEmployeeId) {
    throw new Error('A manager cannot delegate to themselves')
  }
  if (input.endsOn < input.startsOn) {
    throw new Error('End date must be on or after the start date')
  }
  const overlap = listDelegationsForEmployee(input.absentEmployeeId).some(
    (delegation) =>
      (delegation.status === 'active' || delegation.status === 'scheduled') &&
      delegation.startsOn <= input.endsOn &&
      delegation.endsOn >= input.startsOn,
  )
  if (overlap) {
    throw new Error(
      'This manager already has a delegation for those dates. Revoke it first.',
    )
  }
  const delegation: ManagerDelegation = {
    id: nextLocalId(),
    absentEmployeeId: input.absentEmployeeId,
    absentName: input.absentName,
    absentAvatarUrl: input.absentAvatarUrl,
    delegateEmployeeId: input.delegateEmployeeId,
    delegateName: input.delegateName,
    delegateAvatarUrl: input.delegateAvatarUrl,
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    assignedByEmployeeId: input.assignedByEmployeeId,
    assignedByName: input.assignedByName,
    status: 'scheduled',
  }
  writeStorage([...allDelegations(), withLiveStatus(delegation)])
  return withLiveStatus(delegation)
}

export function revokeManagerDelegationLocal(
  delegationId: string,
  revokedAt = new Date().toISOString(),
): ManagerDelegation {
  const current = allDelegations()
  const existing = current.find((delegation) => delegation.id === delegationId)
  if (!existing) throw new Error('Delegation was not found')
  if (existing.revokedAt) throw new Error('This delegation is already revoked')
  const next = withLiveStatus({ ...existing, revokedAt, status: 'revoked' })
  writeStorage(
    current.map((delegation) => (delegation.id === delegationId ? next : delegation)),
  )
  return next
}

export async function hydrateManagerDelegations(options?: {
  employeeId?: number
}): Promise<ManagerDelegation[]> {
  if (useLocalDelegations()) {
    return options?.employeeId
      ? listDelegationsForEmployee(options.employeeId)
      : allDelegations().map((delegation) => withLiveStatus(delegation))
  }
  const query = options?.employeeId
    ? `?employeeId=${encodeURIComponent(String(options.employeeId))}`
    : ''
  const response = await apiFetch<{ delegations: ManagerDelegation[] }>(
    `/api/platform/manager-delegations${query}`,
  )
  const incoming = response.delegations ?? []
  if (options?.employeeId) {
    const remaining = allDelegations().filter(
      (delegation) =>
        delegation.absentEmployeeId !== options.employeeId &&
        delegation.delegateEmployeeId !== options.employeeId,
    )
    replaceManagerDelegations([...remaining, ...incoming])
  } else {
    const known = new Map(allDelegations().map((item) => [item.id, item]))
    for (const delegation of incoming) known.set(delegation.id, delegation)
    replaceManagerDelegations([...known.values()])
    remoteHydrated = true
  }
  return incoming.map((delegation) => withLiveStatus(delegation))
}

function useLocalDelegationWrites(): boolean {
  return useLocalDelegations()
}

export async function assignManagerDelegation(
  input: AssignManagerDelegationInput & {
    absentName: string
    delegateName: string
    delegateAvatarUrl?: string
    absentAvatarUrl?: string
    assignedByEmployeeId: number
    assignedByName: string
  },
): Promise<ManagerDelegation> {
  if (useLocalDelegationWrites()) return assignManagerDelegationLocal(input)
  return assignManagerDelegationRemote(input)
}

export async function revokeManagerDelegation(
  delegationId: string,
): Promise<ManagerDelegation> {
  if (useLocalDelegationWrites()) return revokeManagerDelegationLocal(delegationId)
  return revokeManagerDelegationRemote(delegationId)
}

export async function assignManagerDelegationRemote(
  input: AssignManagerDelegationInput,
): Promise<ManagerDelegation> {
  const response = await apiFetch<{ delegation: ManagerDelegation }>(
    '/api/platform/manager-delegations',
    { method: 'POST', body: input },
  )
  const delegation = withLiveStatus(response.delegation)
  replaceManagerDelegations([
    ...allDelegations().filter((item) => item.id !== delegation.id),
    delegation,
  ])
  return delegation
}

export async function revokeManagerDelegationRemote(
  delegationId: string,
): Promise<ManagerDelegation> {
  const response = await apiFetch<{ delegation: ManagerDelegation }>(
    `/api/platform/manager-delegations/${encodeURIComponent(delegationId)}/revoke`,
    { method: 'POST' },
  )
  const delegation = withLiveStatus(response.delegation)
  replaceManagerDelegations(
    allDelegations().map((item) => (item.id === delegation.id ? delegation : item)),
  )
  return delegation
}

export function resetManagerDelegationsForTests(): void {
  memory = []
  remoteHydrated = false
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function areManagerDelegationsHydrated(): boolean {
  return useLocalDelegations() || remoteHydrated
}
