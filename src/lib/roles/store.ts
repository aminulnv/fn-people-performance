/**
 * Role catalog + competency matrix (local + remote).
 */

import {
  listMemoryEmployees,
  replaceMemoryEmployees,
} from '@/lib/employees/memoryStore'
import {
  createRoleRemote,
  duplicateRoleRemote,
  fetchRoleRemote,
  fetchRolesRemote,
  updateRoleMatrixRemote,
  updateRoleRemote,
} from './remoteApi'
import type {
  CreateRoleInput,
  ExpectedSkillLevel,
  PlatformRole,
  RoleMatrixSkillInput,
  RoleSkill,
  UpdateRoleInput,
} from './types'
import { EXPECTED_SKILL_LEVELS } from './types'

const STORAGE_KEY = 'pd-roles-catalog-v2'

let memory: PlatformRole[] | null = null
let remoteHydrated = false
let hydratePromise: Promise<void> | null = null
let localModeOverride: boolean | null = null
const listeners = new Set<() => void>()

function useLocalRoles(): boolean {
  if (localModeOverride !== null) return localModeOverride
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_REVIEWS_BACKEND === 'local' ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === 'local'
  )
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function isoNow(): string {
  return new Date().toISOString()
}

function newRoleId(): string {
  return `role-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function parseLevel(value: unknown): ExpectedSkillLevel {
  return (EXPECTED_SKILL_LEVELS as readonly string[]).includes(String(value))
    ? (value as ExpectedSkillLevel)
    : 'none'
}

function normalizeSkillRow(
  row: Partial<RoleSkill> & { skillId: string },
): RoleSkill {
  const expectations: RoleSkill['expectations'] = {}
  for (const [grade, level] of Object.entries(row.expectations ?? {})) {
    const trimmed = grade.trim()
    if (!trimmed) continue
    expectations[trimmed] = parseLevel(level)
  }
  const descriptions: RoleSkill['descriptions'] = {}
  for (const [grade, text] of Object.entries(row.descriptions ?? {})) {
    const trimmed = grade.trim()
    const description = String(text ?? '').trim()
    if (!trimmed || !description) continue
    descriptions[trimmed] = description
  }
  return {
    skillId: row.skillId,
    skillName: row.skillName?.trim() || row.skillId,
    weightPct: Number(row.weightPct) || 0,
    expectations,
    descriptions,
  }
}

export function normalizeRole(
  role: Partial<PlatformRole> & Pick<PlatformRole, 'name'>,
): PlatformRole {
  const now = isoNow()
  return {
    id: role.id?.trim() || newRoleId(),
    name: role.name.trim(),
    departmentId: role.departmentId ?? null,
    departmentName: role.departmentName?.trim() ?? '',
    description: role.description?.trim() ?? '',
    archivedAt: role.archivedAt ?? null,
    headcount: Number(role.headcount) || 0,
    skills: Array.isArray(role.skills)
      ? role.skills
          .filter((row): row is RoleSkill => Boolean(row?.skillId))
          .map(normalizeSkillRow)
      : [],
    createdAt: role.createdAt || now,
    updatedAt: role.updatedAt || now,
  }
}

function parseState(raw: string): PlatformRole[] | null {
  try {
    const parsed = JSON.parse(raw) as { roles?: PlatformRole[] } | PlatformRole[]
    const rows = Array.isArray(parsed) ? parsed : parsed.roles
    if (!Array.isArray(rows)) return null
    return rows
      .filter((row) => row && typeof row.name === 'string')
      .map((row) => normalizeRole(row))
  } catch {
    return null
  }
}

function readStorage(): PlatformRole[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parseState(raw) : null
  } catch {
    return null
  }
}

function writeStorage(roles: PlatformRole[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ roles }))
  } catch {
    /* ignore quota */
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

function getState(): PlatformRole[] {
  if (!memory) {
    memory = useLocalRoles() ? (readStorage() ?? []) : []
    if (useLocalRoles()) writeStorage(memory)
  }
  return memory
}

function commit(roles: PlatformRole[]) {
  memory = roles
  if (useLocalRoles()) writeStorage(roles)
  notify()
}

function upsertLocal(role: PlatformRole) {
  const state = getState()
  commit(
    [...state.filter((item) => item.id !== role.id), role].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    ),
  )
}

export function subscribeRolesStore(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function listRoles(): PlatformRole[] {
  return clone(getState().filter((role) => !role.archivedAt))
}

export function getRole(roleId: string): PlatformRole | null {
  const found = getState().find((role) => role.id === roleId) ?? null
  return found ? clone(found) : null
}

export function areRolesHydrated(): boolean {
  return useLocalRoles() || remoteHydrated
}

export async function ensureRolesLoaded(): Promise<void> {
  if (useLocalRoles() || remoteHydrated) return
  if (hydratePromise) return hydratePromise
  hydratePromise = fetchRolesRemote()
    .then((roles) => {
      memory = roles.map((role) => normalizeRole(role))
      remoteHydrated = true
      notify()
    })
    .finally(() => {
      hydratePromise = null
    })
  return hydratePromise
}

function assertUniqueName(name: string, exceptId?: string) {
  const key = name.trim().toLowerCase()
  const clash = getState().find(
    (role) =>
      !role.archivedAt &&
      role.id !== exceptId &&
      role.name.trim().toLowerCase() === key,
  )
  if (clash) {
    throw new Error('A role with this name already exists.')
  }
}

function applyMatrix(
  role: PlatformRole,
  skills: RoleMatrixSkillInput[],
): PlatformRole {
  const previousById = new Map(role.skills.map((row) => [row.skillId, row]))
  const nextSkills: RoleSkill[] = []
  for (const row of skills) {
    const skillId = String(row.skillId ?? '').trim()
    if (!skillId) continue
    nextSkills.push(
      normalizeSkillRow({
        skillId,
        skillName:
          row.skillName?.trim() ||
          previousById.get(skillId)?.skillName ||
          skillId,
        weightPct: row.weightPct,
        expectations: row.expectations,
        descriptions: row.descriptions,
      }),
    )
  }
  return {
    ...role,
    skills: nextSkills,
    updatedAt: isoNow(),
  }
}

export async function createRole(input: CreateRoleInput): Promise<PlatformRole> {
  const name = input.name.trim()
  if (!name) throw new Error('Give the role a name.')
  if (useLocalRoles()) {
    assertUniqueName(name)
    const role = normalizeRole({
      name,
      departmentId: input.departmentId ?? null,
      description: input.description,
    })
    upsertLocal(role)
    return clone(role)
  }
  const created = normalizeRole(await createRoleRemote(input))
  upsertLocal(created)
  return clone(created)
}

export async function updateRole(
  roleId: string,
  input: UpdateRoleInput,
): Promise<PlatformRole> {
  if (useLocalRoles()) {
    const existing = getState().find((role) => role.id === roleId)
    if (!existing) throw new Error('Role not found.')
    if (input.name != null) assertUniqueName(input.name, roleId)
    const next = normalizeRole({
      ...existing,
      ...input,
      name: input.name?.trim() || existing.name,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      updatedAt: isoNow(),
    })
    upsertLocal(next)
    return clone(next)
  }
  const updated = normalizeRole(await updateRoleRemote(roleId, input))
  upsertLocal(updated)
  return clone(updated)
}

export async function updateRoleMatrix(
  roleId: string,
  skills: RoleMatrixSkillInput[],
): Promise<PlatformRole> {
  if (useLocalRoles()) {
    const existing = getState().find((role) => role.id === roleId)
    if (!existing) throw new Error('Role not found.')
    const next = applyMatrix(existing, skills)
    upsertLocal(next)
    return clone(next)
  }
  const updated = normalizeRole(await updateRoleMatrixRemote(roleId, skills))
  upsertLocal(updated)
  return clone(updated)
}

export async function duplicateRole(roleId: string): Promise<PlatformRole> {
  if (useLocalRoles()) {
    const existing = getState().find((role) => role.id === roleId)
    if (!existing) throw new Error('Role not found.')
    let name = `${existing.name} (copy)`
    let attempt = 2
    while (getState().some((role) => !role.archivedAt && role.name === name)) {
      name = `${existing.name} (copy ${attempt})`
      attempt += 1
    }
    const copy = normalizeRole({
      ...existing,
      id: newRoleId(),
      name,
      headcount: 0,
      archivedAt: null,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    })
    upsertLocal(copy)
    return clone(copy)
  }
  const created = normalizeRole(await duplicateRoleRemote(roleId))
  upsertLocal(created)
  return clone(created)
}

export async function loadRole(roleId: string): Promise<PlatformRole | null> {
  if (useLocalRoles()) return getRole(roleId)
  try {
    const role = normalizeRole(await fetchRoleRemote(roleId))
    upsertLocal(role)
    return clone(role)
  } catch {
    return getRole(roleId)
  }
}

/** Distinct employee.role strings → catalog rows, then set roleId. */
export function backfillRolesFromEmployees(): PlatformRole[] {
  const employees = listMemoryEmployees()
  const byName = new Map(
    getState().map((role) => [role.name.trim().toLowerCase(), role]),
  )
  const created: PlatformRole[] = []
  for (const employee of employees) {
    const name = employee.role.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (!byName.has(key)) {
      const role = normalizeRole({ name })
      byName.set(key, role)
      created.push(role)
    }
  }
  if (created.length > 0) {
    commit(
      [...getState(), ...created].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
      ),
    )
  }
  replaceMemoryEmployees(
    employees.map((employee) => {
      if (employee.roleId) return employee
      const name = employee.role.trim()
      if (!name) return employee
      const role = byName.get(name.toLowerCase())
      if (!role) return employee
      return { ...employee, roleId: role.id, role: role.name }
    }),
  )
  return listRoles()
}

export function resetRolesStoreForTests() {
  memory = []
  remoteHydrated = false
  hydratePromise = null
  localModeOverride = true
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('pd-roles-catalog-v1')
  } catch {
    /* ignore */
  }
  writeStorage(memory)
  notify()
}
