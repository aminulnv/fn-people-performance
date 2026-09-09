import { listActiveDelegationForEmployee } from './store'

export type ActingApprover = {
  id?: string
  name: string
  avatarUrl?: string
  /** True when this person is standing in for the org-chart line manager. */
  delegated?: boolean
}

/**
 * Who should be named as the acting approver while a manager is delegated.
 * Org chart stays on the absent manager; display swaps to the delegate.
 */
export function actingApprover(person: {
  id?: string | null
  name?: string | null
  avatarUrl?: string
}): ActingApprover | null {
  const trimmed = person.name?.trim()
  if (!trimmed) return null
  const managerId = person.id != null ? Number(person.id) : NaN
  const delegation = Number.isInteger(managerId)
    ? listActiveDelegationForEmployee(managerId)
    : undefined
  if (delegation) {
    return {
      id: String(delegation.delegateEmployeeId),
      name: delegation.delegateName,
      ...(delegation.delegateAvatarUrl
        ? { avatarUrl: delegation.delegateAvatarUrl }
        : {}),
      delegated: true,
    }
  }
  return {
    ...(person.id ? { id: String(person.id) } : {}),
    name: trimmed,
    ...(person.avatarUrl ? { avatarUrl: person.avatarUrl } : {}),
  }
}

/** Display label with an explicit delegated marker for chips and trails. */
export function approverDisplayName(
  person: Pick<ActingApprover, 'name' | 'delegated'>,
): string {
  const name = person.name.trim()
  if (!name) return ''
  return person.delegated ? `${name} (Delegated)` : name
}
