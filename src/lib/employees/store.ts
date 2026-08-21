import { ApiError, apiFetch } from '@/lib/apiClient'
import {
  clearMemoryEmployees,
  createMemoryEmployee,
  findMemoryEmployeeByEmail,
  getMemoryEmployee,
  listMemoryEmployees,
  replaceMemoryEmployees,
  subscribeMemoryEmployees,
  updateMemoryEmployee,
} from './memoryStore'
import {
  countDirectReports,
  listDirectReports,
} from './relationships'
import type {
  CreateDepartmentInput,
  CreateEmployeeInput,
  EmployeeProfilePayload,
  PlatformDepartment,
  PlatformEmployee,
  PlatformTeam,
  UpdateEmployeeInput,
} from './types'

type Listener = () => void

const listeners = new Set<Listener>()

/** Tests (and optional local override) keep an in-memory directory. */
function useMemoryBackend(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === 'local'
  )
}

let cache: PlatformEmployee[] = useMemoryBackend()
  ? listMemoryEmployees()
  : []
let loadState: 'idle' | 'loading' | 'ready' | 'error' = useMemoryBackend()
  ? 'ready'
  : 'idle'
let loadError: string | null = null
let loadPromise: Promise<void> | null = null
/** Profile-sized extras keyed by subject employee id. */
const profileExtras = new Map<number, EmployeeProfilePayload>()
const profileLoadPromises = new Map<number, Promise<EmployeeProfilePayload | null>>()
/** Bumps on every store change — stable snapshot for useSyncExternalStore. */
let storeVersion = 0

function notify() {
  storeVersion += 1
  for (const listener of listeners) listener()
}

/** Monotonic version for React subscriptions (see `useEmployees`). */
export function getEmployeesStoreVersion(): number {
  return storeVersion
}

function setCache(employees: PlatformEmployee[]) {
  cache = employees.map((e) => ({ ...e }))
  if (useMemoryBackend()) {
    replaceMemoryEmployees(cache)
  }
  notify()
}

export function getEmployeesLoadState(): typeof loadState {
  return loadState
}

export function getEmployeesLoadError(): string | null {
  return loadError
}

export function subscribeEmployeesStore(listener: Listener): () => void {
  listeners.add(listener)
  if (useMemoryBackend()) {
    const unsubMemory = subscribeMemoryEmployees(() => {
      cache = listMemoryEmployees()
      storeVersion += 1
      listener()
    })
    return () => {
      listeners.delete(listener)
      unsubMemory()
    }
  }
  return () => {
    listeners.delete(listener)
  }
}

/** Read-only snapshot. Do not mutate the returned array or its rows. */
export function listEmployees(): PlatformEmployee[] {
  if (useMemoryBackend()) return listMemoryEmployees()
  return cache
}

export function getEmployee(employeeId: number): PlatformEmployee | null {
  if (useMemoryBackend()) return getMemoryEmployee(employeeId)
  return cache.find((e) => e.employeeId === employeeId) ?? null
}

export function findEmployeeByEmail(email: string): PlatformEmployee | null {
  if (useMemoryBackend()) return findMemoryEmployeeByEmail(email)
  const normalized = email.trim().toLowerCase()
  return cache.find((e) => e.email.toLowerCase() === normalized) ?? null
}

export function getEmployeeProfileExtras(
  employeeId: number,
): EmployeeProfilePayload | null {
  return profileExtras.get(employeeId) ?? null
}

function upsertEmployeesIntoCache(employees: PlatformEmployee[]) {
  if (employees.length === 0) return
  const byId = new Map(cache.map((row) => [row.employeeId, row]))
  for (const row of employees) {
    byId.set(row.employeeId, { ...row })
  }
  cache = [...byId.values()]
}

function rememberProfile(payload: EmployeeProfilePayload) {
  profileExtras.set(payload.employee.employeeId, payload)
  if (!useMemoryBackend()) {
    upsertEmployeesIntoCache([
      payload.employee,
      ...payload.related,
      ...payload.directReports,
    ])
  }
  notify()
}

function uniqueRelatedFromMemory(employee: PlatformEmployee): PlatformEmployee[] {
  const people: PlatformEmployee[] = []
  const add = (person: PlatformEmployee | null) => {
    if (!person || person.employeeId === employee.employeeId) return
    if (people.some((row) => row.employeeId === person.employeeId)) return
    people.push(person)
  }
  if (employee.reportsToId != null) add(getMemoryEmployee(employee.reportsToId))
  if (employee.managerEmail) add(findMemoryEmployeeByEmail(employee.managerEmail))
  if (employee.departmentHeadId != null) {
    add(getMemoryEmployee(employee.departmentHeadId))
  }
  if (employee.hrbpId != null) add(getMemoryEmployee(employee.hrbpId))
  if (employee.teamOwnerId != null) add(getMemoryEmployee(employee.teamOwnerId))
  return people
}

function memoryEmployeeProfile(
  employeeId: number,
): EmployeeProfilePayload | null {
  const employee = getMemoryEmployee(employeeId)
  if (!employee) return null
  const related = uniqueRelatedFromMemory(employee)
  const directReports = listDirectReports(employee)
  const manager =
    related.find((person) => person.employeeId === employee.reportsToId) ??
    (employee.managerEmail
      ? findMemoryEmployeeByEmail(employee.managerEmail)
      : null)
  const nestedReportCounts: Record<number, number> = {}
  for (const report of directReports) {
    nestedReportCounts[report.employeeId] = countDirectReports(report)
  }
  return {
    employee,
    related,
    directReports,
    managerDirectReportCount: countDirectReports(manager),
    directoryCount: listMemoryEmployees().length,
    nestedReportCounts,
  }
}

/**
 * One-person profile read. Renders /people/:id without waiting for the
 * full directory. Dedupes in-flight requests per employee.
 */
export async function loadEmployeeProfile(
  employeeId: number,
): Promise<EmployeeProfilePayload | null> {
  if (!Number.isInteger(employeeId) || employeeId <= 0) return null

  const cached = profileExtras.get(employeeId)
  if (cached) return cached

  const pending = profileLoadPromises.get(employeeId)
  if (pending) return pending

  const request = (async () => {
    if (useMemoryBackend()) {
      const payload = memoryEmployeeProfile(employeeId)
      if (payload) rememberProfile(payload)
      return payload
    }

    try {
      const payload = await apiFetch<EmployeeProfilePayload>(
        `/api/platform/employees/${employeeId}`,
      )
      if (!payload?.employee) return null
      rememberProfile({
        employee: payload.employee,
        related: Array.isArray(payload.related) ? payload.related : [],
        directReports: Array.isArray(payload.directReports)
          ? payload.directReports
          : [],
        managerDirectReportCount: payload.managerDirectReportCount ?? 0,
        directoryCount: payload.directoryCount ?? 0,
        nestedReportCounts: payload.nestedReportCounts ?? {},
      })
      return profileExtras.get(employeeId) ?? payload
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  })()

  profileLoadPromises.set(employeeId, request)
  try {
    return await request
  } finally {
    profileLoadPromises.delete(employeeId)
  }
}

/** Fetch the live directory from RDS via /api/platform. */
export async function loadEmployees(options?: {
  /** Re-fetch even when the directory is already ready. */
  reload?: boolean
}): Promise<void> {
  if (useMemoryBackend()) {
    cache = listMemoryEmployees()
    loadState = 'ready'
    loadError = null
    notify()
    return
  }

  if (loadPromise) return loadPromise
  if (loadState === 'ready' && !options?.reload) return

  if (loadState !== 'ready') {
    loadState = 'loading'
    loadError = null
    notify()
  }

  loadPromise = (async () => {
    try {
      const data = await apiFetch<{ employees: PlatformEmployee[] }>(
        '/api/platform/employees',
      )
      setCache(Array.isArray(data.employees) ? data.employees : [])
      loadState = 'ready'
      loadError = null
    } catch (err) {
      // VITE_AUTH_MODE=local has no platform cookie — empty directory is fine.
      if (
        err instanceof ApiError &&
        err.status === 401 &&
        import.meta.env.VITE_AUTH_MODE === 'local'
      ) {
        setCache([])
        loadState = 'ready'
        loadError = null
        return
      }
      loadState = 'error'
      if (err instanceof ApiError && err.status === 401) {
        loadError = 'Sign in required to load people from the live database.'
      } else if (err instanceof Error) {
        loadError = err.message
      } else {
        loadError = 'Failed to load employees.'
      }
      notify()
      throw err
    } finally {
      loadPromise = null
    }
  })()

  return loadPromise
}

export type CreateEmployeeResult =
  | { ok: true; employee: PlatformEmployee }
  | { ok: false; error: string }

export type UpdateEmployeeResult = CreateEmployeeResult

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<CreateEmployeeResult> {
  if (useMemoryBackend()) {
    return createMemoryEmployee(input)
  }

  try {
    const data = await apiFetch<{ employee: PlatformEmployee }>(
      '/api/platform/employees',
      { method: 'POST', body: input },
    )
    await loadEmployees({ reload: true })
    return { ok: true, employee: data.employee }
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as { error?: string } | null
      return {
        ok: false,
        error: body?.error ?? `Request failed (${err.status})`,
      }
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Create failed.',
    }
  }
}

export async function updateEmployee(
  employeeId: number,
  input: UpdateEmployeeInput,
): Promise<UpdateEmployeeResult> {
  if (useMemoryBackend()) {
    return updateMemoryEmployee(employeeId, input)
  }

  try {
    const data = await apiFetch<{ employee: PlatformEmployee }>(
      `/api/platform/employees/${employeeId}`,
      { method: 'PATCH', body: input },
    )
    await loadEmployees({ reload: true })
    return { ok: true, employee: data.employee }
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as { error?: string } | null
      return {
        ok: false,
        error: body?.error ?? `Request failed (${err.status})`,
      }
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Update failed.',
    }
  }
}

/** Test / local helper — clears the in-memory directory only. */
export function clearEmployees(): void {
  if (!useMemoryBackend()) return
  clearMemoryEmployees()
  memoryDepartments = []
  memoryDepartmentSeq = 10_000
  memoryTeams = []
  cache = []
  profileExtras.clear()
  profileLoadPromises.clear()
  notify()
}

/** Extra departments created in the local/test backend (may have no people yet). */
let memoryDepartments: PlatformDepartment[] = []
let memoryDepartmentSeq = 10_000

/**
 * Department catalog (includes head + HRBP). Used to fill read-only
 * employee form fields when a department is selected.
 */
export async function listDepartments(): Promise<PlatformDepartment[]> {
  if (useMemoryBackend()) {
    const byName = new Map<string, PlatformDepartment>()
    for (const row of memoryDepartments) {
      byName.set(row.name.trim().toLowerCase(), { ...row })
    }
    for (const employee of listMemoryEmployees()) {
      const name = employee.department.trim()
      if (!name) continue
      const key = name.toLowerCase()
      const existing = byName.get(key)
      if (existing) {
        byName.set(key, {
          ...existing,
          headEmployeeId:
            existing.headEmployeeId ?? employee.departmentHeadId ?? null,
          headName: existing.headName || employee.departmentHeadName || null,
          hrbpEmployeeId: existing.hrbpEmployeeId ?? employee.hrbpId ?? null,
          hrbpName: existing.hrbpName || employee.hrbpName || null,
        })
        continue
      }
      byName.set(key, {
        id: byName.size + 1,
        name,
        headEmployeeId: employee.departmentHeadId ?? null,
        headName: employee.departmentHeadName || null,
        headEmail: null,
        hrbpEmployeeId: employee.hrbpId ?? null,
        hrbpName: employee.hrbpName || null,
        hrbpEmail: null,
        headcount: 0,
        teamCount: 0,
      })
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  const data = await apiFetch<{ departments: PlatformDepartment[] }>(
    '/api/platform/departments',
  )
  return Array.isArray(data.departments) ? data.departments : []
}

export type CreateDepartmentResult =
  | { ok: true; department: PlatformDepartment }
  | { ok: false; error: string }

export async function createDepartment(
  input: CreateDepartmentInput,
): Promise<CreateDepartmentResult> {
  const name = input.name.trim()
  if (!name) {
    return { ok: false, error: 'Department name is required.' }
  }

  if (useMemoryBackend()) {
    const existing = await listDepartments()
    if (existing.some((d) => d.name.trim().toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: 'A department with this name already exists.' }
    }
    const head =
      input.headEmployeeId != null
        ? getMemoryEmployee(input.headEmployeeId)
        : null
    const hrbp =
      input.hrbpEmployeeId != null
        ? getMemoryEmployee(input.hrbpEmployeeId)
        : null
    const department: PlatformDepartment = {
      id: ++memoryDepartmentSeq,
      name,
      headEmployeeId: head?.employeeId ?? null,
      headName: head?.fullName ?? null,
      headEmail: head?.email ?? null,
      hrbpEmployeeId: hrbp?.employeeId ?? null,
      hrbpName: hrbp?.fullName ?? null,
      hrbpEmail: hrbp?.email ?? null,
      headcount: 0,
      teamCount: 0,
    }
    memoryDepartments = [...memoryDepartments, department]
    notify()
    return { ok: true, department }
  }

  try {
    const data = await apiFetch<{ department: PlatformDepartment }>(
      '/api/platform/departments',
      {
        method: 'POST',
        body: {
          name,
          headEmployeeId: input.headEmployeeId ?? null,
          hrbpEmployeeId: input.hrbpEmployeeId ?? null,
        },
      },
    )
    return { ok: true, department: data.department }
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as { error?: string } | null
      return {
        ok: false,
        error: body?.error ?? `Request failed (${err.status})`,
      }
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Create failed.',
    }
  }
}

/** Extra teams created in the local/test backend. */
let memoryTeams: PlatformTeam[] = []

/** Test helper — replace the in-memory team catalog. */
export function replaceTeams(teams: PlatformTeam[]): void {
  if (!useMemoryBackend()) return
  memoryTeams = teams.map((team) => ({ ...team }))
}

/**
 * Team catalog (includes owner). Used to show team owner on profiles even
 * when the employee payload does not yet include `teamOwnerId`.
 */
export async function listTeams(): Promise<PlatformTeam[]> {
  if (useMemoryBackend()) {
    if (memoryTeams.length > 0) {
      return memoryTeams.map((team) => ({ ...team }))
    }
    const byKey = new Map<string, PlatformTeam>()
    let seq = 1
    for (const employee of listMemoryEmployees()) {
      const name = employee.team.trim()
      if (!name) continue
      const departmentName = employee.department.trim()
      const key = `${departmentName.toLowerCase()}::${name.toLowerCase()}`
      const existing = byKey.get(key)
      if (existing) {
        existing.headcount += 1
        if (existing.ownerEmployeeId == null && employee.teamOwnerId != null) {
          existing.ownerEmployeeId = employee.teamOwnerId
          existing.ownerName = employee.teamOwnerName ?? null
        }
        continue
      }
      byKey.set(key, {
        id: employee.teamId ?? seq++,
        name,
        departmentId: employee.departmentId ?? 0,
        departmentName,
        ownerEmployeeId: employee.teamOwnerId ?? null,
        ownerName: employee.teamOwnerName ?? null,
        ownerEmail: null,
        headcount: 1,
      })
    }
    return [...byKey.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    )
  }

  const data = await apiFetch<{ teams: PlatformTeam[] }>('/api/platform/teams')
  return Array.isArray(data.teams) ? data.teams : []
}
