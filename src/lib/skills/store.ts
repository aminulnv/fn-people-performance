import { SEED_SKILLS } from './seed'
import {
  createSkillRemote,
  fetchSkillsSnapshotRemote,
  updateSkillRemote,
} from './remoteApi'
import {
  employeeIdsWithRoleSkill,
  getInheritedSkillsForEmployee,
} from '@/lib/roles/inheritedSkills'
import type { PersonSkill } from '@/lib/roles/inheritedSkills'
import {
  emptySkillMastery,
  SKILL_MASTERY_LEVELS,
  type EmployeeSkillAssignment,
  type Skill,
  type SkillMastery,
} from './types'

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

function normalizeMastery(value: unknown): SkillMastery {
  const next = emptySkillMastery()
  if (!value || typeof value !== 'object') return next
  const raw = value as Record<string, unknown>
  for (const level of SKILL_MASTERY_LEVELS) {
    next[level] = String(raw[level] ?? '').trim()
  }
  return next
}

export function normalizeSkill(
  skill: Partial<Skill> &
    Pick<Skill, 'name'> & { function?: string; department?: string },
): Skill {
  return {
    id: skill.id?.trim() || newSkillId(),
    name: skill.name.trim(),
    department: (skill.department ?? skill.function)?.trim() ?? '',
    role: skill.role?.trim() ?? '',
    status: skill.status === 'draft' ? 'draft' : 'approved',
    mastery: normalizeMastery(skill.mastery),
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

export function getSkillById(skillId: string): Skill | null {
  const id = skillId.trim()
  if (!id) return null
  const skill = getState().skills.find((item) => item.id === id)
  return skill ? clone(skill) : null
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
  return employeeIdsWithRoleSkill(skillId).length
}

/** Skills on this person come only from the role assigned to their profile. */
export function getSkillsForEmployee(employeeId: number): PersonSkill[] {
  return getInheritedSkillsForEmployee(employeeId, getState().skills)
}

function skillsBelongOnTheRole(): never {
  throw new Error(
    'Skills belong on a role. Assign that role to the person.',
  )
}

export async function setEmployeeSkillIds(
  _employeeId: number,
  _skillIds: string[],
): Promise<string[]> {
  skillsBelongOnTheRole()
}

export async function assignSkillToEmployee(
  _employeeId: number,
  _skillId: string,
): Promise<string[]> {
  skillsBelongOnTheRole()
}

export async function removeSkillFromEmployee(
  _employeeId: number,
  _skillId: string,
): Promise<string[]> {
  skillsBelongOnTheRole()
}

export async function createSkill(input: {
  name: string
  department?: string
  role?: string
  status?: Skill['status']
  mastery?: SkillMastery
}): Promise<Skill> {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Give the skill a name.')
  }
  if (useLocalSkills()) {
    const skill = normalizeSkill({
      name,
      department: input.department,
      role: input.role,
      status: input.status ?? 'approved',
      mastery: input.mastery,
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
    department: input.department,
    role: input.role,
    status: input.status,
    mastery: input.mastery,
  })
  const skill = normalizeSkill(created)
  const state = getState()
  commit({
    ...state,
    skills: [...state.skills.filter((item) => item.id !== skill.id), skill],
  })
  return clone(skill)
}

export async function updateSkill(
  id: string,
  input: {
    name: string
    department?: string
    role?: string
    status?: Skill['status']
    mastery?: SkillMastery
  },
): Promise<Skill> {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Give the skill a name.')
  }
  if (useLocalSkills()) {
    const state = getState()
    const existing = state.skills.find((skill) => skill.id === id)
    if (!existing) throw new Error('This skill was not found.')
    const next = normalizeSkill({
      ...existing,
      name,
      department: input.department,
      role: input.role,
      status: input.status ?? existing.status,
      mastery: input.mastery ?? existing.mastery,
    })
    commit({
      ...state,
      skills: state.skills.map((skill) => (skill.id === id ? next : skill)),
    })
    return clone(next)
  }
  const updated = await updateSkillRemote(id, {
    name,
    department: input.department,
    role: input.role,
    status: input.status,
    mastery: input.mastery,
  })
  const next = normalizeSkill(updated)
  const state = getState()
  commit({
    ...state,
    skills: state.skills.map((skill) => (skill.id === id ? next : skill)),
  })
  return clone(next)
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
