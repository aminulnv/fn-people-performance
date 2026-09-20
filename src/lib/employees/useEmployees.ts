import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  buildOrganisationFromEmployees,
  mergeOrganisationWithCatalog,
} from '@/lib/organisation/fromEmployees'
import type { OrganisationSnapshot } from '@/lib/organisation/types'
import {
  getEmployeesLoadError,
  getEmployeesLoadState,
  getEmployeesStoreVersion,
  listDepartments,
  listEmployees,
  listTeams,
  loadEmployees,
  subscribeEmployeesStore,
} from './store'
import type { PlatformDepartment, PlatformEmployee, PlatformTeam } from './types'

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
  /** When false, only subscribe - do not trigger a fetch. Default true. */
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

/** Revolut department + team catalogs for Organisation surfaces. */
export function useOrganisationCatalogs(reloadKey?: unknown): {
  departments: PlatformDepartment[]
  teams: PlatformTeam[]
  ready: boolean
  error: string | null
  reload: () => void
} {
  const [departments, setDepartments] = useState<PlatformDepartment[]>([])
  const [teams, setTeams] = useState<PlatformTeam[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => {
    setReady(false)
    setError(null)
    setAttempt((current) => current + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.all([listDepartments(), listTeams()])
      .then(([nextDepartments, nextTeams]) => {
        if (cancelled) return
        setDepartments(nextDepartments)
        setTeams(nextTeams)
        setError(null)
        setReady(true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDepartments([])
        setTeams([])
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'Could not load departments and teams.',
        )
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt, reloadKey])

  return { departments, teams, ready, error, reload }
}

/** Employees store + derived org tree merged with Revolut department/team catalogs. */
export function useOrganisation(
  catalog: PlatformDepartment[] = [],
  options?: { load?: boolean; teams?: PlatformTeam[] },
): UseOrganisationResult {
  const employeesState = useEmployees(options)
  const teams = options?.teams ?? []
  const organisation = useMemo(() => {
    const base = buildOrganisationFromEmployees(employeesState.employees)
    return catalog.length > 0 || teams.length > 0
      ? mergeOrganisationWithCatalog(base, catalog, teams)
      : base
  }, [catalog, employeesState.employees, teams])

  return { ...employeesState, organisation }
}
