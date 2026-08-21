import { useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  buildOrganisationFromEmployees,
  mergeOrganisationWithCatalog,
} from '@/lib/organisation/fromEmployees'
import type { OrganisationSnapshot } from '@/lib/organisation/types'
import {
  getEmployeesLoadError,
  getEmployeesLoadState,
  getEmployeesStoreVersion,
  listEmployees,
  loadEmployees,
  subscribeEmployeesStore,
} from './store'
import type { PlatformDepartment, PlatformEmployee } from './types'

export type EmployeesLoadState = ReturnType<typeof getEmployeesLoadState>

export type UseEmployeesResult = {
  employees: PlatformEmployee[]
  loadState: EmployeesLoadState
  loadError: string | null
  /** True until the first successful/error load finishes (or memory backend is ready). */
  isLoading: boolean
  reload: () => Promise<void>
}

export type UseOrganisationResult = UseEmployeesResult & {
  organisation: OrganisationSnapshot
}

/**
 * Subscribe to the employees directory store.
 * Dedupes fetches via `loadEmployees`; AuthProvider already kicks off a load.
 */
export function useEmployees(options?: {
  /** When false, only subscribe — do not trigger a fetch. Default true. */
  load?: boolean
}): UseEmployeesResult {
  const shouldLoad = options?.load !== false
  const version = useSyncExternalStore(
    subscribeEmployeesStore,
    getEmployeesStoreVersion,
    getEmployeesStoreVersion,
  )

  useEffect(() => {
    if (!shouldLoad) return
    void loadEmployees().catch(() => {})
  }, [shouldLoad])

  return useMemo(() => {
    void version
    const loadState = getEmployeesLoadState()
    return {
      employees: listEmployees(),
      loadState,
      loadError: getEmployeesLoadError(),
      isLoading: loadState === 'idle' || loadState === 'loading',
      reload: () => loadEmployees({ reload: true }),
    }
  }, [version])
}

/** Employees store + derived org tree (optionally merged with department catalog). */
export function useOrganisation(
  catalog: PlatformDepartment[] = [],
  options?: { load?: boolean },
): UseOrganisationResult {
  const employeesState = useEmployees(options)
  const organisation = useMemo(() => {
    const base = buildOrganisationFromEmployees(employeesState.employees)
    return catalog.length > 0
      ? mergeOrganisationWithCatalog(base, catalog)
      : base
  }, [catalog, employeesState.employees])

  return { ...employeesState, organisation }
}
