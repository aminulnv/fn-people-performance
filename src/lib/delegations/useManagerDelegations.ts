import { useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  hydrateManagerDelegations,
  listDelegationsForEmployee,
  listManagerDelegations,
  subscribeManagerDelegations,
} from './store'
import type { ManagerDelegation } from './types'

export function useManagerDelegationsRevision(): string {
  return useSyncExternalStore(
    subscribeManagerDelegations,
    () =>
      listManagerDelegations()
        .map((item) => `${item.id}:${item.status}:${item.revokedAt ?? ''}`)
        .join('|'),
    () => '',
  )
}

export function useHydrateManagerDelegations(employeeId?: number): void {
  useEffect(() => {
    void hydrateManagerDelegations(
      employeeId == null ? undefined : { employeeId },
    ).catch(() => {
      /* Delegation list stays empty until the viewer can load it. */
    })
  }, [employeeId])
}

export function useManagerDelegations(employeeId?: number): {
  delegations: ManagerDelegation[]
  delegating: ManagerDelegation[]
  received: ManagerDelegation[]
  activeReceived?: ManagerDelegation
  activeDelegating: ManagerDelegation[]
} {
  const snapshot = useSyncExternalStore(
    subscribeManagerDelegations,
    () =>
      employeeId == null
        ? ''
        : listDelegationsForEmployee(employeeId)
            .map((item) => item.id + item.status + (item.revokedAt ?? ''))
            .join('|'),
    () => '',
  )

  useEffect(() => {
    if (employeeId == null) return
    void hydrateManagerDelegations({ employeeId }).catch(() => {
      /* Viewer may not be allowed to list another person's delegations. */
    })
  }, [employeeId])

  return useMemo(() => {
    const delegations =
      employeeId == null ? [] : listDelegationsForEmployee(employeeId)
    const received = delegations.filter(
      (item) => item.absentEmployeeId === employeeId,
    )
    const delegating = delegations.filter(
      (item) => item.delegateEmployeeId === employeeId,
    )
    return {
      delegations,
      delegating,
      received,
      activeReceived: received.find((item) => item.status === 'active'),
      activeDelegating: delegating.filter((item) => item.status === 'active'),
    }
  }, [employeeId, snapshot])
}
