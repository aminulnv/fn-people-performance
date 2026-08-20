import type { CreateEmployeeInput, PlatformEmployee } from './types'

type EmployeesSnapshot = {
  employees: PlatformEmployee[]
}

type Listener = () => void

const listeners = new Set<Listener>()

function emptySnapshot(): EmployeesSnapshot {
  return { employees: [] }
}

function normalizeEmployee(
  raw: PlatformEmployee & { wing?: string },
): PlatformEmployee {
  const { wing, ...rest } = raw
  return {
    ...rest,
    team: typeof rest.team === 'string' ? rest.team : (wing ?? ''),
    avatarUrl: typeof rest.avatarUrl === 'string' ? rest.avatarUrl : '',
    teamOwnerName:
      typeof rest.teamOwnerName === 'string' ? rest.teamOwnerName : '',
  }
}

let state: EmployeesSnapshot = emptySnapshot()

function commit(next: EmployeesSnapshot): EmployeesSnapshot {
  state = next
  for (const listener of listeners) listener()
  return state
}

export function subscribeMemoryEmployees(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Read-only snapshot. Do not mutate the returned array or its rows. */
export function listMemoryEmployees(): PlatformEmployee[] {
  return state.employees
}

export function getMemoryEmployee(
  employeeId: number,
): PlatformEmployee | null {
  return state.employees.find((e) => e.employeeId === employeeId) ?? null
}

export function findMemoryEmployeeByEmail(
  email: string,
): PlatformEmployee | null {
  const normalized = email.trim().toLowerCase()
  return (
    state.employees.find((e) => e.email.toLowerCase() === normalized) ?? null
  )
}

function resolveIdByEmail(
  email: string,
  exceptId?: number,
): number | undefined {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return undefined
  return state.employees.find(
    (e) => e.email.toLowerCase() === normalized && e.employeeId !== exceptId,
  )?.employeeId
}

function resolveIdByName(name: string, exceptId?: number): number | undefined {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined
  return state.employees.find(
    (e) =>
      e.fullName.trim().toLowerCase() === normalized &&
      e.employeeId !== exceptId,
  )?.employeeId
}

export type MutateResult =
  | { ok: true; employee: PlatformEmployee }
  | { ok: false; error: string }

export function createMemoryEmployee(
  input: CreateEmployeeInput,
): MutateResult {
  if (!Number.isInteger(input.employeeId) || input.employeeId <= 0) {
    return { ok: false, error: 'Employee ID must be a positive whole number.' }
  }
  if (state.employees.some((e) => e.employeeId === input.employeeId)) {
    return { ok: false, error: `Employee ID ${input.employeeId} already exists.` }
  }

  const email = input.email.trim().toLowerCase()
  if (!email) return { ok: false, error: 'Email is required.' }
  if (state.employees.some((e) => e.email.toLowerCase() === email)) {
    return { ok: false, error: 'An employee with this email already exists.' }
  }

  const fullName = input.fullName.trim()
  if (!fullName) return { ok: false, error: 'Full name is required.' }
  if (!input.startDate.trim()) {
    return { ok: false, error: 'Start date is required.' }
  }

  const now = new Date().toISOString()
  const managerEmail = input.managerEmail.trim().toLowerCase()
  const employee: PlatformEmployee = {
    employeeId: input.employeeId,
    fullName,
    email,
    startDate: input.startDate.trim(),
    jobTitle: input.jobTitle.trim(),
    department: input.department.trim(),
    team: input.team.trim(),
    division: input.division.trim(),
    reportsToName: input.reportsToName.trim(),
    departmentHeadName: input.departmentHeadName.trim(),
    hrbpName: input.hrbpName.trim(),
    teamOwnerName: '',
    jobGrade: input.jobGrade.trim(),
    site: (input.site ?? '').trim(),
    avatarUrl:
      input.avatarUrl !== undefined ? input.avatarUrl.trim() : '',
    managerEmail,
    reportsToId:
      resolveIdByEmail(managerEmail) ??
      resolveIdByName(input.reportsToName.trim()),
    departmentHeadId: resolveIdByName(input.departmentHeadName.trim()),
    hrbpId: resolveIdByName(input.hrbpName.trim()),
    isActive: input.isActive !== false,
    createdAt: now,
    updatedAt: now,
  }

  commit({ employees: [...state.employees, employee] })
  return { ok: true, employee }
}

export function updateMemoryEmployee(
  employeeId: number,
  input: CreateEmployeeInput & { isActive: boolean },
): MutateResult {
  const existing = state.employees.find((e) => e.employeeId === employeeId)
  if (!existing) return { ok: false, error: 'Employee not found.' }

  const nextId = Number(input.employeeId)
  if (!Number.isInteger(nextId) || nextId <= 0) {
    return { ok: false, error: 'Employee ID must be a positive whole number.' }
  }
  if (
    nextId !== employeeId &&
    state.employees.some((e) => e.employeeId === nextId)
  ) {
    return { ok: false, error: `Employee ID ${nextId} already exists.` }
  }

  const email = input.email.trim().toLowerCase()
  if (!email) return { ok: false, error: 'Email is required.' }
  if (
    state.employees.some(
      (e) => e.employeeId !== employeeId && e.email.toLowerCase() === email,
    )
  ) {
    return { ok: false, error: 'An employee with this email already exists.' }
  }

  const fullName = input.fullName.trim()
  if (!fullName) return { ok: false, error: 'Full name is required.' }
  if (!input.startDate.trim()) {
    return { ok: false, error: 'Start date is required.' }
  }

  const managerEmail = input.managerEmail.trim().toLowerCase()
  const updated: PlatformEmployee = {
    ...existing,
    employeeId: nextId,
    fullName,
    email,
    startDate: input.startDate.trim(),
    jobTitle: input.jobTitle.trim(),
    department: input.department.trim(),
    team: input.team.trim(),
    division: input.division.trim(),
    reportsToName: input.reportsToName.trim(),
    departmentHeadName: input.departmentHeadName.trim(),
    hrbpName: input.hrbpName.trim(),
    teamOwnerName: existing.teamOwnerName ?? '',
    teamOwnerId: existing.teamOwnerId,
    jobGrade: input.jobGrade.trim(),
    site: (input.site ?? '').trim(),
    avatarUrl:
      input.avatarUrl !== undefined
        ? input.avatarUrl.trim()
        : existing.avatarUrl,
    managerEmail,
    reportsToId:
      resolveIdByEmail(managerEmail, nextId) ??
      resolveIdByName(input.reportsToName.trim(), nextId),
    departmentHeadId: resolveIdByName(input.departmentHeadName.trim(), nextId),
    hrbpId: resolveIdByName(input.hrbpName.trim(), nextId),
    isActive: input.isActive,
    updatedAt: new Date().toISOString(),
  }

  commit({
    employees: state.employees.map((e) => {
      if (e.employeeId === employeeId) return updated
      if (nextId === employeeId) return e
      return {
        ...e,
        reportsToId: e.reportsToId === employeeId ? nextId : e.reportsToId,
        departmentHeadId:
          e.departmentHeadId === employeeId ? nextId : e.departmentHeadId,
        hrbpId: e.hrbpId === employeeId ? nextId : e.hrbpId,
        teamOwnerId: e.teamOwnerId === employeeId ? nextId : e.teamOwnerId,
      }
    }),
  })
  return { ok: true, employee: updated }
}

export function clearMemoryEmployees(): void {
  commit(emptySnapshot())
}

export function replaceMemoryEmployees(employees: PlatformEmployee[]): void {
  commit({
    employees: employees.map((e) =>
      normalizeEmployee(e as PlatformEmployee & { wing?: string }),
    ),
  })
}
