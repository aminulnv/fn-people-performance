import {
  createScorecardFormRemote,
  deleteScorecardFormRemote,
  fetchScorecardFormsRemote,
  updateScorecardFormRemote,
} from './remoteApi'
import {
  ALLOCATED_FORM_POLICY_LOCK,
  normalizeScorecardForm,
  scorecardFormPolicyEquals,
  seedScorecardForms,
} from './scorecardForms'
import type { CyclePurpose, ReviewPolicy, ScorecardForm } from './types'

const STORAGE_KEY = 'pd-scorecard-forms-v3'

let memory: ScorecardForm[] | null = null
let remoteHydrated = false
let hydratePromise: Promise<void> | null = null
let localModeOverride: boolean | null = null
const listeners = new Set<() => void>()

function useLocalForms(): boolean {
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

function readStorage(): ScorecardForm[] | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ScorecardForm[]
    return Array.isArray(parsed) ? parsed.map(normalizeScorecardForm) : null
  } catch {
    return null
  }
}

function writeStorage(forms: ScorecardForm[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(forms))
  } catch {
    /* ignore quota */
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

function getState(): ScorecardForm[] {
  if (!memory) {
    memory = useLocalForms()
      ? (readStorage() ?? seedScorecardForms())
      : []
    if (useLocalForms()) writeStorage(memory)
  }
  return memory
}

function commit(forms: ScorecardForm[]) {
  memory = forms
  if (useLocalForms()) writeStorage(forms)
  notify()
}

export function subscribeScorecardFormsStore(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getScorecardFormsSnapshot(): ScorecardForm[] {
  return getState()
}

export function listScorecardForms(): ScorecardForm[] {
  return clone(getState())
}

export function getScorecardForm(formId: string): ScorecardForm | null {
  return (
    getState().find(
      (form) => form.id === formId || form.id === decodeURIComponent(formId),
    ) ?? null
  )
}

export function areScorecardFormsHydrated(): boolean {
  return useLocalForms() || remoteHydrated
}

/** Hydrate from the platform API when not in local mode (same source as production). */
export async function ensureScorecardFormsLoaded(): Promise<void> {
  if (useLocalForms() || remoteHydrated) return
  if (hydratePromise) return hydratePromise
  hydratePromise = fetchScorecardFormsRemote()
    .then((forms) => {
      memory = forms.map(normalizeScorecardForm)
      remoteHydrated = true
      notify()
    })
    .finally(() => {
      hydratePromise = null
    })
  return hydratePromise
}

export function resetScorecardFormsStoreForTests() {
  memory = null
  remoteHydrated = false
  hydratePromise = null
  localModeOverride = true
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export async function createScorecardForm(input: {
  name: string
  description?: string
  cycleType?: CyclePurpose
  policy?: ReviewPolicy
}): Promise<ScorecardForm> {
  const now = new Date().toISOString()
  const local = normalizeScorecardForm({
    id: `form-${crypto.randomUUID()}`,
    name: input.name,
    description: input.description,
    cycleType: input.cycleType,
    policy: input.policy,
    createdAt: now,
    updatedAt: now,
    version: 1,
  })
  if (useLocalForms()) {
    commit([...getState(), local])
    return clone(local)
  }
  const created = await createScorecardFormRemote({
    name: local.name,
    description: local.description,
    cycleType: local.cycleType,
    policy: local.policy,
  })
  const form = normalizeScorecardForm(created)
  commit([...getState(), form])
  return clone(form)
}

export async function updateScorecardForm(
  formId: string,
  patch: {
    name?: string
    description?: string | null
    cycleType?: CyclePurpose
    policy?: ReviewPolicy
    expectedVersion?: number
    /** When set, blocks policy edits if the form is allocated. */
    usageCount?: number
  },
): Promise<ScorecardForm> {
  const current = getScorecardForm(formId)
  if (!current) throw new Error('Scorecard form not found.')
  const usage = patch.usageCount ?? 0
  if (
    patch.policy !== undefined &&
    usage > 0 &&
    !scorecardFormPolicyEquals(current.policy, patch.policy)
  ) {
    throw new Error(ALLOCATED_FORM_POLICY_LOCK)
  }
  if (
    patch.cycleType !== undefined &&
    patch.cycleType !== current.cycleType &&
    usage > 0
  ) {
    throw new Error(
      'This form is allocated to cycle groups. Duplicate it to change the cycle type.',
    )
  }
  const next = normalizeScorecardForm({
    ...current,
    name: patch.name ?? current.name,
    description:
      patch.description === undefined
        ? current.description
        : patch.description ?? undefined,
    cycleType: patch.cycleType ?? current.cycleType,
    policy: patch.policy ?? current.policy,
    updatedAt: new Date().toISOString(),
    version: current.version + 1,
  })
  if (useLocalForms()) {
    commit(getState().map((form) => (form.id === current.id ? next : form)))
    return clone(next)
  }
  const prior = getState()
  commit(prior.map((form) => (form.id === current.id ? next : form)))
  try {
    const remote = await updateScorecardFormRemote(current.id, {
      name: patch.name,
      description: patch.description,
      cycleType: patch.cycleType,
      policy: patch.policy,
      expectedVersion: patch.expectedVersion ?? current.version,
    })
    const form = normalizeScorecardForm(remote)
    commit(getState().map((item) => (item.id === form.id ? form : item)))
    return clone(form)
  } catch (err) {
    commit(prior)
    throw err
  }
}

export async function deleteScorecardForm(
  formId: string,
  options?: { usageCount?: number },
): Promise<void> {
  const current = getScorecardForm(formId)
  if (!current) throw new Error('Scorecard form not found.')
  const usage = options?.usageCount ?? 0
  if (usage > 0) {
    throw new Error(
      `This form is allocated to ${usage} cycle group${usage === 1 ? '' : 's'}. Reassign those groups first.`,
    )
  }
  if (useLocalForms()) {
    commit(getState().filter((form) => form.id !== current.id))
    return
  }
  const prior = getState()
  commit(prior.filter((form) => form.id !== current.id))
  try {
    await deleteScorecardFormRemote(current.id)
  } catch (err) {
    commit(prior)
    throw err
  }
}
