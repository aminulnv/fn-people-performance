import { SEED_SKILLS } from './seed'
import {
  createSkillRemote,
  fetchSkillsSnapshotRemote,
  setEmployeeSkillIdsRemote,
} from './remoteApi'
import type { EmployeeSkillAssignment, Skill } from './types'

const STORAGE_KEY = 'pd-skills-library-v2'
const LEGACY_SESSION_KEY = 'pd-skills-library-v1'

type SkillsState = {
  skills: Skill[]
  assignments: EmployeeSkillAssignment[]
}

let memory: SkillsState | null = null
let remoteHydrated = false
let hydratePromise: Promise<void> | null = null
let localModeOverride: boolean | null = null
const listeners = new Set<() => void>()

function useLocalSkills(): boolean {
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

function emptyState(): SkillsState {
  return {
    skills: SEED_SKILLS.map((skill) => ({ ...skill })),
    assignments: [],
  }
}

function parseState(raw: string): SkillsState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SkillsState>
    if (!Array.isArray(parsed.skills)) return null
    return {
      skills: parsed.skills.map(normalizeSkill),
      assignments: Array.isArray(parsed.assignments)
        ? parsed.assignments
            .filter(
              (item): item is EmployeeSkillAssignment =>
                typeof item?.employeeId === 'number' &&
                Array.isArray(item.skillIds),
            )
            .map((item) => ({
              employeeId: item.employeeId,
              skillIds: item.skillIds.filter((id) => typeof id === 'string'),
            }))
        : [],
    }
  } catch {
    return null
  }
}

function readStorage(): SkillsState | null {
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEY)
    if (fromLocal) return parseState(fromLocal)
    const fromSession = sessionStorage.getItem(LEGACY_SESSION_KEY)
    if (fromSession) {
      const parsed = parseState(fromSession)
      if (parsed) {
        writeStorage(parsed)
        sessionStorage.removeItem(LEGACY_SESSION_KEY)
      }
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeStorage(state: SkillsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

function getState(): SkillsState {
  if (!memory) {
    memory = useLocalSkills()
      ? (readStorage() ?? emptyState())
      : { skills: [], assignments: [] }
    if (useLocalSkills()) writeStorage(memory)
  }
  return memory
}

function commit(state: SkillsState) {
  memory = state
  if (useLocalSkills()) writeStorage(state)
  notify()
}

function newSkillId(): string {
  return `skill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeSkill(skill: Partial<Skill> & Pick<Skill, 'name'>): Skill {
  return {
    id: skill.id?.trim() || newSkillId(),
    name: skill.name.trim(),
    function: skill.function?.trim() ?? '',
    role: skill.role?.trim() ?? '',
    status: skill.status === 'draft' ? 'draft' : 'approved',
  }
}

export function subscribeSkillsStore(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSkillsSnapshot(): Skill[] {
  return clone(getState().skills)
}

export function getSkillAssignmentsSnapshot(): EmployeeSkillAssignment[] {
  return clone(getState().assignments)
}

export function areSkillsHydrated(): boolean {
  return useLocalSkills() || remoteHydrated
}

/** Hydrate from the platform API when not in local mode. */
export async function ensureSkillsLoaded(): Promise<void> {
  if (useLocalSkills() || remoteHydrated) return
  if (hydratePromise) return hydratePromise
  hydratePromise = fetchSkillsSnapshotRemote()
    .then((snapshot) => {
      memory = {
        skills: snapshot.skills.map(normalizeSkill),
        assignments: snapshot.assignments.map((item) => ({
          employeeId: item.employeeId,
          skillIds: [...item.skillIds],
        })),
      }
      remoteHydrated = true
      notify()
    })
    .finally(() => {
      hydratePromise = null
    })
  return hydratePromise
}

export function talentCountForSkill(skillId: string): number {
  return getState().assignments.filter((item) =>
    item.skillIds.includes(skillId),
  ).length
}

export function getSkillIdsForEmployee(employeeId: number): string[] {
  const row = getState().assignments.find(
    (item) => item.employeeId === employeeId,
  )
  return row ? [...row.skillIds] : []
}

export function getSkillsForEmployee(employeeId: number): Skill[] {
  const ids = new Set(getSkillIdsForEmployee(employeeId))
  return getState()
    .skills.filter((skill) => ids.has(skill.id))
    .map((skill) => ({ ...skill }))
}

function applyEmployeeSkillIds(
  employeeId: number,
  skillIds: string[],
): string[] {
  const known = new Set(getState().skills.map((skill) => skill.id))
  const nextIds = [...new Set(skillIds.filter((id) => known.has(id)))]
  const state = getState()
  const without = state.assignments.filter(
    (item) => item.employeeId !== employeeId,
  )
  commit({
    ...state,
    assignments:
      nextIds.length === 0
        ? without
        : [...without, { employeeId, skillIds: nextIds }],
  })
  return nextIds
}

export async function setEmployeeSkillIds(
  employeeId: number,
  skillIds: string[],
): Promise<string[]> {
  if (useLocalSkills()) {
    return applyEmployeeSkillIds(employeeId, skillIds)
  }
  const assignment = await setEmployeeSkillIdsRemote(employeeId, skillIds)
  applyEmployeeSkillIds(assignment.employeeId, assignment.skillIds)
  return assignment.skillIds
}

export async function assignSkillToEmployee(
  employeeId: number,
  skillId: string,
): Promise<string[]> {
  const current = getSkillIdsForEmployee(employeeId)
  if (current.includes(skillId)) return current
  return setEmployeeSkillIds(employeeId, [...current, skillId])
}

export async function removeSkillFromEmployee(
  employeeId: number,
  skillId: string,
): Promise<string[]> {
  return setEmployeeSkillIds(
    employeeId,
    getSkillIdsForEmployee(employeeId).filter((id) => id !== skillId),
  )
}

export async function createSkill(input: {
  name: string
  function?: string
  role?: string
}): Promise<Skill> {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Give the skill a name.')
  }
  if (useLocalSkills()) {
    const skill = normalizeSkill({
      name,
      function: input.function,
      role: input.role,
      status: 'approved',
    })
    const state = getState()
    commit({
      ...state,
      skills: [...state.skills, skill],
    })
    return clone(skill)
  }
  const created = await createSkillRemote({
    name,
    function: input.function,
    role: input.role,
  })
  const skill = normalizeSkill(created)
  const state = getState()
  commit({
    ...state,
    skills: [...state.skills.filter((item) => item.id !== skill.id), skill],
  })
  return clone(skill)
}

export function resetSkillsStoreForTests() {
  memory = emptyState()
  remoteHydrated = false
  hydratePromise = null
  localModeOverride = true
  try {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(LEGACY_SESSION_KEY)
  } catch {
    /* ignore */
  }
  writeStorage(memory)
  notify()
}
