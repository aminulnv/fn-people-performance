import { CORE_VALUES } from './catalog'
import {
  createValueRemote,
  fetchValuesSnapshotRemote,
  updateValueRemote,
} from './remoteApi'
import type {
  CompanyValue,
  ValueBehaviour,
  ValueStatus,
} from './types'
import { VALUE_BEHAVIOUR_BANDS } from './types'

const STORAGE_KEY = 'pd-values-library'
const LEGACY_STORAGE_KEY = 'pd-values-library-v1'

type ValuesState = {
  values: CompanyValue[]
}

let memory: ValuesState | null = null
let remoteHydrated = false
let hydratePromise: Promise<void> | null = null
let localModeOverride: boolean | null = null
const listeners = new Set<() => void>()

function useLocalValues(): boolean {
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

function emptyBands(): ValueBehaviour['bands'] {
  return {
    developing: [],
    performing: [],
    exceeding: [],
  }
}

function newValueId(): string {
  return `value-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function newBehaviourId(): string {
  return `behaviour-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeLines(lines: unknown): string[] {
  if (!Array.isArray(lines)) return []
  return lines
    .map((line) => (typeof line === 'string' ? line.trim() : ''))
    .filter(Boolean)
}

export function normalizeBehaviour(
  behaviour: Partial<ValueBehaviour> & Pick<ValueBehaviour, 'name'>,
): ValueBehaviour {
  const bands = emptyBands()
  for (const band of VALUE_BEHAVIOUR_BANDS) {
    bands[band] = normalizeLines(behaviour.bands?.[band])
  }
  return {
    id: behaviour.id?.trim() || newBehaviourId(),
    name: behaviour.name.trim(),
    bands,
  }
}

export function normalizeCompanyValue(
  value: Partial<CompanyValue> & Pick<CompanyValue, 'name'>,
): CompanyValue {
  const status: ValueStatus =
    value.status === 'disabled' ? 'disabled' : 'enabled'
  const playbook =
    typeof value.playbookUrl === 'string' ? value.playbookUrl.trim() : ''
  return {
    id: value.id?.trim() || newValueId(),
    name: value.name.trim(),
    description:
      typeof value.description === 'string' ? value.description.trim() : '',
    status,
    playbookUrl: playbook || null,
    behaviours: Array.isArray(value.behaviours)
      ? value.behaviours
          .filter(
            (item): item is Partial<ValueBehaviour> & Pick<ValueBehaviour, 'name'> =>
              Boolean(item && typeof item.name === 'string' && item.name.trim()),
          )
          .map(normalizeBehaviour)
      : [],
  }
}

function emptyState(): ValuesState {
  return {
    values: CORE_VALUES.map((value) => normalizeCompanyValue(value)),
  }
}

function parseState(raw: string): ValuesState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ValuesState>
    if (!Array.isArray(parsed.values)) return null
    return {
      values: parsed.values
        .filter(
          (item): item is Partial<CompanyValue> & Pick<CompanyValue, 'name'> =>
            Boolean(item && typeof item.name === 'string'),
        )
        .map(normalizeCompanyValue),
    }
  } catch {
    return null
  }
}

function readStorage(): ValuesState | null {
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEY)
    if (fromLocal) return parseState(fromLocal)
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const parsed = parseState(legacy)
      if (parsed) {
        writeStorage(parsed)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeStorage(state: ValuesState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

function getState(): ValuesState {
  if (!memory) {
    memory = useLocalValues()
      ? (readStorage() ?? emptyState())
      : { values: [] }
    if (useLocalValues()) writeStorage(memory)
  }
  return memory
}

function commit(state: ValuesState) {
  memory = state
  if (useLocalValues()) writeStorage(state)
  notify()
}

export function getValuesSnapshot(): CompanyValue[] {
  return clone(getState().values)
}

export function getEnabledValues(): CompanyValue[] {
  return getValuesSnapshot().filter((value) => value.status === 'enabled')
}

export function getValueById(id: string): CompanyValue | null {
  const found = getState().values.find((value) => value.id === id)
  return found ? clone(found) : null
}

export function subscribeValuesStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function areValuesHydrated(): boolean {
  return useLocalValues() || remoteHydrated
}

/** Hydrate from the platform API when not in local mode. */
export async function ensureValuesLoaded(): Promise<void> {
  if (useLocalValues() || remoteHydrated) return
  if (hydratePromise) return hydratePromise
  hydratePromise = fetchValuesSnapshotRemote()
    .then((snapshot) => {
      memory = {
        values: snapshot.values.map((value) => normalizeCompanyValue(value)),
      }
      remoteHydrated = true
      notify()
    })
    .finally(() => {
      hydratePromise = null
    })
  return hydratePromise
}

export type ValueInput = {
  name: string
  description?: string
  status?: ValueStatus
  behaviours?: Array<Partial<ValueBehaviour> & Pick<ValueBehaviour, 'name'>>
}

export async function createCompanyValue(input: ValueInput): Promise<CompanyValue> {
  const name = input.name.trim()
  if (!name) throw new Error('Give the value a title.')
  if (useLocalValues()) {
    const value = normalizeCompanyValue({
      name,
      description: input.description,
      status: input.status,
      playbookUrl: null,
      behaviours: input.behaviours,
    })
    const state = getState()
    commit({ values: [...state.values, value] })
    return clone(value)
  }
  const created = await createValueRemote({
    name,
    description: input.description,
    status: input.status,
    behaviours: input.behaviours?.map((item) =>
      normalizeBehaviour(item as ValueBehaviour),
    ),
  })
  const value = normalizeCompanyValue(created)
  const state = getState()
  commit({
    values: [...state.values.filter((item) => item.id !== value.id), value],
  })
  return clone(value)
}

export async function updateCompanyValue(
  id: string,
  input: ValueInput,
): Promise<CompanyValue> {
  const name = input.name.trim()
  if (!name) throw new Error('Give the value a title.')
  if (useLocalValues()) {
    const state = getState()
    const existing = state.values.find((value) => value.id === id)
    if (!existing) throw new Error('This value was not found.')
    const next = normalizeCompanyValue({
      ...existing,
      name,
      description: input.description,
      status: input.status,
      playbookUrl: null,
      behaviours: input.behaviours,
    })
    commit({
      values: state.values.map((value) => (value.id === id ? next : value)),
    })
    return clone(next)
  }
  const updated = await updateValueRemote(id, {
    name,
    description: input.description,
    status: input.status,
    behaviours: input.behaviours?.map((item) =>
      normalizeBehaviour(item as ValueBehaviour),
    ),
  })
  const next = normalizeCompanyValue(updated)
  const state = getState()
  commit({
    values: state.values.map((value) => (value.id === id ? next : value)),
  })
  return clone(next)
}

export function resetValuesStoreForTests() {
  memory = emptyState()
  remoteHydrated = false
  hydratePromise = null
  localModeOverride = true
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  writeStorage(memory)
  notify()
}
