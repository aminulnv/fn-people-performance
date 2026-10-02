import { ApiError, apiFetch } from '@/lib/apiClient'
import {
  ACCESS_PROFILES,
  hasSystemPermission,
  permissionsForEmail,
  type EmployeeAccessAssignment,
  type SystemPermission,
} from '@/lib/accessControl/types'
import { getEmployee, listEmployees } from '@/lib/employees/store'
import type { PlatformEmployee } from '@/lib/employees/types'
import { employeeToDemoPerson } from '@/lib/goals/peopleFromEmployees'

export type AuthUser = {
  id: string
  email: string
  name: string
  personId: string
  employeeId?: number | null
  permissions: SystemPermission[]
  title: string
}

/**
 * Local bootstrap identity until platform Google OAuth is added.
 * Prefer matching a People directory row when one exists.
 */
export const LOCAL_USER: AuthUser = {
  id: 'local',
  email: 'local@nextventures.io',
  name: 'Local User',
  personId: 'local',
  permissions: [
    'platform.read_all',
    'platform.write_all',
    'access.manage',
  ],
  title: '',
}

const AUTH_SESSION_KEY = 'pd-auth-session'
const LEGACY_AUTH_KEY = 'pd-demo-auth'
const LOCAL_ASSIGNMENTS_KEY = 'pd-access-assignments'

export type AuthSession = {
  user: AuthUser
  /**
   * Real signed-in admin while `user` is an impersonation target.
   * Absent when not impersonating.
   */
  actor?: AuthUser
  /** ISO timestamp when the session was established. */
  signedInAt: string
  /**
   * Bearer token for API calls when the IdP returns one.
   * Prefer HttpOnly cookies in production; this field is for SPA token flows.
   */
  accessToken?: string
}

type PlatformAuthUser = {
  id: string
  email: string
  name: string
  employeeId?: number | null
  title?: string
  permissions?: SystemPermission[]
}

type PlatformAuthMeResponse = {
  authenticated: boolean
  user?: PlatformAuthUser
  actor?: PlatformAuthUser
  impersonating?: boolean
}

function readLocalAssignments(): EmployeeAccessAssignment[] {
  try {
    const raw = localStorage.getItem(LOCAL_ASSIGNMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as EmployeeAccessAssignment[]) : []
  } catch {
    return []
  }
}

function assignedPermissionsForEmployee(
  employeeId: number,
): SystemPermission[] {
  const assignment = readLocalAssignments().find(
    (row) => row.employeeId === employeeId,
  )
  if (!assignment) return []
  const profile = ACCESS_PROFILES.find((row) => row.key === assignment.profileKey)
  return profile ? [...profile.permissions] : []
}

function authUserFromEmployee(employee: PlatformEmployee): AuthUser {
  const person = employeeToDemoPerson(employee, listEmployees())
  return {
    id: person.id,
    email: person.email,
    name: person.name,
    personId: person.id,
    employeeId: employee.employeeId,
    permissions: permissionsForEmail(
      person.email,
      assignedPermissionsForEmployee(employee.employeeId),
    ),
    title: person.title,
  }
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    permissions: permissionsForEmail(user.email, user.permissions),
  }
}

function sessionFromMeResponse(
  data: PlatformAuthMeResponse,
  previous?: AuthSession | null,
): AuthSession {
  if (!data.user) {
    throw new Error('Sign-in failed.')
  }
  const user = authUserFromPlatform(data.user)
  const actor =
    data.impersonating && data.actor
      ? authUserFromPlatform(data.actor)
      : undefined
  return {
    user,
    ...(actor ? { actor } : {}),
    signedInAt: previous?.signedInAt ?? new Date().toISOString(),
    ...(previous?.accessToken ? { accessToken: previous.accessToken } : {}),
  }
}

/**
 * SessionStorage-only auth (no /api cookie session).
 * - Vitest always
 * - `VITE_AUTH_MODE=local` always
 *
 * Default DEV uses real Google via the Vite /api proxy (localhost callback in
 * Google Console + X-Forwarded-Host on the platform API).
 */
function useSessionStorageAuth(): boolean {
  if (import.meta.env.MODE === 'test') return true
  return import.meta.env.VITE_AUTH_MODE === 'local'
}

function authUserFromPlatform(user: PlatformAuthUser): AuthUser {
  const employeeId =
    typeof user.employeeId === 'number' ? user.employeeId : null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    personId: employeeId != null ? String(employeeId) : user.id,
    employeeId,
    permissions: permissionsForEmail(user.email, user.permissions),
    title: user.title ?? '',
  }
}

function readRawSession(): string | null {
  try {
    return sessionStorage.getItem(AUTH_SESSION_KEY)
  } catch {
    return null
  }
}

export function writeSession(session: AuthSession): void {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}

function sessionFromUser(user: AuthUser): AuthSession {
  return {
    user,
    signedInAt: new Date().toISOString(),
  }
}

function resolveLocalSignInUser(): AuthUser {
  const directory = listEmployees().filter((e) => e.isActive)
  const primary = directory[0]
  if (!primary) return LOCAL_USER

  const person = employeeToDemoPerson(primary, directory)
  return {
    id: person.id,
    email: person.email,
    name: person.name,
    personId: person.id,
    employeeId: primary.employeeId,
    permissions: LOCAL_USER.permissions,
    title: person.title,
  }
}

function migrateLegacySession(): AuthSession | null {
  try {
    if (sessionStorage.getItem(LEGACY_AUTH_KEY) !== '1') return null
    const session = sessionFromUser(resolveLocalSignInUser())
    writeSession(session)
    sessionStorage.removeItem(LEGACY_AUTH_KEY)
    return session
  } catch {
    return null
  }
}

function isValidAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false
  const user = value as AuthUser
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    typeof user.personId === 'string' &&
    (user.permissions === undefined || Array.isArray(user.permissions)) &&
    typeof user.title === 'string'
  )
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const parsed = value as AuthSession
  return (
    isValidAuthUser(parsed.user) &&
    (parsed.actor === undefined || isValidAuthUser(parsed.actor)) &&
    typeof parsed.signedInAt === 'string' &&
    (parsed.accessToken === undefined || typeof parsed.accessToken === 'string')
  )
}

export function readSession(): AuthSession | null {
  const raw = readRawSession()
  if (!raw) return migrateLegacySession()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (isValidSession(parsed)) {
      return {
        ...parsed,
        user: normalizeAuthUser(parsed.user),
        ...(parsed.actor
          ? { actor: normalizeAuthUser(parsed.actor) }
          : {}),
      }
    }
  } catch {
    /* migrate legacy flag stored under the new key */
  }
  if (raw === '1') {
    const session = sessionFromUser(resolveLocalSignInUser())
    writeSession(session)
    return session
  }
  return migrateLegacySession()
}

/** Real signed-in identity (admin), even while impersonating. */
export function sessionActor(session: AuthSession | null): AuthUser | null {
  if (!session) return null
  return session.actor ?? session.user
}

export function isImpersonatingSession(session: AuthSession | null): boolean {
  return Boolean(session?.actor)
}

export function getAccessToken(): string | null {
  return readSession()?.accessToken ?? null
}

export function isSignedIn(): boolean {
  return readSession() !== null
}

/**
 * Resolve the current *platform* session (pd_platform_sid cookie).
 * Independent of the dashboard Google session.
 */
export async function fetchAuthSession(): Promise<AuthSession | null> {
  if (useSessionStorageAuth()) {
    return readSession()
  }

  try {
    const me = await apiFetch<PlatformAuthMeResponse>(
      '/api/platform/auth/me',
      { skipAuth: true },
    )
    if (me.authenticated && me.user) {
      const session = sessionFromMeResponse(me, readSession())
      writeSession(session)
      return session
    }
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) {
      throw err
    }
  }

  // VITE_AUTH_MODE=local keeps a sessionStorage session without cookies.
  if (useSessionStorageAuth()) {
    return readSession()
  }

  clearSession()
  return null
}

/**
 * Admin-only: act as another active employee for the rest of the session.
 * Server cookie (or local session) keeps the real admin as `actor`.
 */
export async function startImpersonation(
  employeeId: number,
): Promise<AuthSession> {
  const current = readSession()
  const actor = sessionActor(current)
  if (!current || !actor) {
    throw new Error('Sign-in required.')
  }
  if (!hasSystemPermission(actor.permissions, 'platform.write_all')) {
    throw new Error('Insufficient access')
  }

  if (useSessionStorageAuth()) {
    const employee = getEmployee(employeeId)
    if (!employee?.isActive) {
      throw new Error('Employee not found or inactive.')
    }
    if (employee.employeeId === actor.employeeId) {
      const restored: AuthSession = {
        user: actor,
        signedInAt: current.signedInAt,
        ...(current.accessToken ? { accessToken: current.accessToken } : {}),
      }
      writeSession(restored)
      return restored
    }
    const session: AuthSession = {
      user: authUserFromEmployee(employee),
      actor,
      signedInAt: current.signedInAt,
      ...(current.accessToken ? { accessToken: current.accessToken } : {}),
    }
    writeSession(session)
    return session
  }

  try {
    const me = await apiFetch<PlatformAuthMeResponse>(
      '/api/platform/auth/impersonate',
      {
        method: 'POST',
        skipAuth: true,
        body: { employeeId },
      },
    )
    const session = sessionFromMeResponse(me, current)
    writeSession(session)
    return session
  } catch (err) {
    throw rewriteImpersonationApiError(err, 'start')
  }
}

/** Return to the real admin identity. */
export async function stopImpersonation(): Promise<AuthSession> {
  const current = readSession()
  const actor = sessionActor(current)
  if (!current || !actor) {
    throw new Error('Sign-in required.')
  }

  if (useSessionStorageAuth()) {
    const session: AuthSession = {
      user: actor,
      signedInAt: current.signedInAt,
      ...(current.accessToken ? { accessToken: current.accessToken } : {}),
    }
    writeSession(session)
    return session
  }

  try {
    const me = await apiFetch<PlatformAuthMeResponse>(
      '/api/platform/auth/impersonate/stop',
      {
        method: 'POST',
        skipAuth: true,
      },
    )
    const session = sessionFromMeResponse(me, current)
    writeSession(session)
    return session
  } catch (err) {
    throw rewriteImpersonationApiError(err, 'stop')
  }
}

function rewriteImpersonationApiError(
  err: unknown,
  action: 'start' | 'stop',
): Error {
  if (err instanceof ApiError && err.status === 404) {
    return new Error(
      action === 'start'
        ? 'Profile switch is not available on the server yet. Deploy the platform API, then try again.'
        : 'Could not exit profile switch. Deploy the platform API, then try again.',
    )
  }
  if (err instanceof Error) return err
  return new Error(
    action === 'start' ? 'Could not switch profile.' : 'Could not stop viewing.',
  )
}

/** Platform app path for OAuth return (includes /platform in production). */
function platformReturnTo(): string {
  const base = import.meta.env.BASE_URL || '/'
  if (base === '/') return '/'
  return base.endsWith('/') ? base : `${base}/`
}

/**
 * Platform Google OAuth - separate from the HR dashboard session.
 * Redirects to /api/platform/auth/google (sets pd_platform_sid).
 */
export async function signInWithGoogle(): Promise<AuthSession> {
  if (useSessionStorageAuth()) {
    await Promise.resolve()
    const session = sessionFromUser(resolveLocalSignInUser())
    writeSession(session)
    return session
  }

  const returnTo = platformReturnTo()
  window.location.assign(
    `/api/platform/auth/google?returnTo=${encodeURIComponent(returnTo)}`,
  )
  // Navigation away - callers should not expect this to resolve.
  return new Promise(() => {})
}

const PLATFORM_EMAIL_DOMAIN = 'nextventures.io'

/** Accept username or full email; always normalize to @nextventures.io. */
export function normalizePlatformEmail(identity: string): string {
  const raw = identity.trim().toLowerCase()
  if (!raw) return ''
  if (!raw.includes('@')) return `${raw}@${PLATFORM_EMAIL_DOMAIN}`
  return raw
}

/**
 * Platform email + password login (temporary shared default password).
 * Pass username only - @nextventures.io is appended automatically.
 */
export async function signInWithEmailPassword(
  identity: string,
  password: string,
): Promise<AuthSession> {
  const email = normalizePlatformEmail(identity)

  if (useSessionStorageAuth()) {
    const session = sessionFromUser({
      ...LOCAL_USER,
      email: email || LOCAL_USER.email,
      name: email.split('@')[0] || LOCAL_USER.name,
      id: email || LOCAL_USER.id,
      personId: email || LOCAL_USER.personId,
    })
    writeSession(session)
    return session
  }

  const data = await apiFetch<PlatformAuthMeResponse>(
    '/api/platform/auth/login',
    {
      method: 'POST',
      skipAuth: true,
      body: {
        email,
        password,
      },
    },
  )

  if (!data.authenticated || !data.user) {
    throw new Error('Sign-in failed.')
  }

  const session = sessionFromMeResponse(data)
  writeSession(session)
  return session
}

export async function signOut(): Promise<void> {
  if (!useSessionStorageAuth()) {
    try {
      await apiFetch('/api/platform/auth/logout', {
        method: 'POST',
        skipAuth: true,
      })
    } catch {
      // Still clear local session if the API call fails.
    }
  }
  clearSession()
}
