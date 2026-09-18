import { useEffect, useState } from 'react'
import {
  areRolesHydrated,
  ensureRolesLoaded,
  getRole,
  listRoles,
  subscribeRolesStore,
} from './store'
import type { PlatformRole } from './types'

function useHydrateRoles() {
  useEffect(() => {
    void ensureRolesLoaded().catch(() => {
      /* pages keep last snapshot until the next remount */
    })
  }, [])
}

export function useRolesCatalog() {
  useHydrateRoles()
  const [roles, setRoles] = useState<PlatformRole[]>(() => listRoles())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    return subscribeRolesStore(() => setTick((n) => n + 1))
  }, [])

  useEffect(() => {
    void tick
    setRoles(listRoles())
  }, [tick])

  return { roles, ready: areRolesHydrated() }
}

export function useRole(roleId: string | undefined) {
  const { roles, ready } = useRolesCatalog()
  const role = roleId ? (getRole(roleId) ?? null) : null
  return { role, roles, ready }
}
